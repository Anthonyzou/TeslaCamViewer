const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { app, organizeB2Events, exportJobs } = require('../server');

test('organizeB2Events - groups files into chronological events and detects cameras', async () => {
  const mockFiles = [
    {
      fileName: 'SavedClips/2026-10-15_12-30-00/2026-10-15_12-30-00-front.mp4',
    },
    { fileName: 'SavedClips/2026-10-15_12-30-00/2026-10-15_12-30-00-back.mp4' },
    {
      fileName:
        'SavedClips/2026-10-15_12-30-00/2026-10-15_12-30-00-left_repeater.mp4',
    },
    {
      fileName:
        'SavedClips/2026-10-15_12-30-00/2026-10-15_12-30-00-right_repeater.mp4',
    },
    { fileName: 'SavedClips/2026-10-15_12-30-00/thumb.png' },
    {
      fileName: 'SavedClips/2026-10-15_14-00-00/2026-10-15_14-00-00-front.mp4',
    },
    {
      fileName:
        'SavedClips/2026-10-15_14-00-00/2026-10-15_14-00-00-left_pillar.mp4',
    },
    {
      fileName:
        'SavedClips/2026-10-15_14-00-00/2026-10-15_14-00-00-right_pillar.mp4',
    },
    { fileName: 'SavedClips/2026-10-15_14-00-00/event.mp4' },
    // Empty event (only non-clip files) - should be filtered out
    { fileName: 'SavedClips/2026-10-15_10-00-00/notes.txt' },
  ];

  const result = await organizeB2Events(
    mockFiles,
    'test-bucket',
    'https://f000.backblazeb2.com',
    'auth-token-123'
  );

  assert.strictEqual(
    result.events.length,
    2,
    'Should create 2 events and filter out empty one'
  );
  assert.strictEqual(result.stats.totalFiles, 10);
  assert.strictEqual(result.stats.eventCount, 2);

  // Newest event first (14:00 before 12:30)
  const [newerEvent, olderEvent] = result.events;

  assert.strictEqual(newerEvent.name, '2026-10-15_14-00-00');
  assert.strictEqual(newerEvent.timestamp, '2026-10-15T14:00:00');
  assert.strictEqual(
    newerEvent.hasPillarCameras,
    true,
    'Should detect pillar cameras'
  );
  assert.ok(newerEvent.eventVideoUrl.includes('event.mp4'));
  assert.ok(newerEvent.eventVideoUrl.includes('auth-token-123'));
  assert.strictEqual(newerEvent.compoundKey, 'b2:2026-10-15_14-00-00');

  assert.strictEqual(olderEvent.name, '2026-10-15_12-30-00');
  assert.strictEqual(olderEvent.timestamp, '2026-10-15T12:30:00');
  assert.strictEqual(
    olderEvent.hasPillarCameras,
    false,
    'Should not detect pillar cameras on 4-cam setup'
  );
  assert.ok(olderEvent.thumbnailUrl.includes('thumb.png'));
  assert.strictEqual(olderEvent.clipGroups.length, 1);
  assert.strictEqual(
    olderEvent.clipGroups[0].clips.front.fileName,
    '2026-10-15_12-30-00-front.mp4'
  );
  assert.strictEqual(
    olderEvent.clipGroups[0].clips.back.fileName,
    '2026-10-15_12-30-00-back.mp4'
  );
});

test('API GET /api/b2/config returns configuration status', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/b2/config`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok('isConfigured' in data);
    assert.ok('isPreloaded' in data);
    assert.ok('lastParseTime' in data);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API POST /api/b2/parse rejects missing parameters when no env is configured', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/b2/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId: '', appKey: '', bucketName: '' }),
    });
    // If .env is already configured in the environment, it may process with default config;
    // otherwise it should return 400 Bad Request
    if (!process.env.B2_KEY_ID) {
      assert.strictEqual(res.status, 400);
    } else {
      assert.ok([200, 400, 500].includes(res.status));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API POST /api/export validates input clips', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clips: {} }),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('No clips provided'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API GET /api/export/status returns 404 for unknown job', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(
      `http://127.0.0.1:${port}/api/export/status/nonexistent123`
    );
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.ok(data.error.includes('not found'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API POST /api/export/cancel handles unknown or active job gracefully', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(
      `http://127.0.0.1:${port}/api/export/cancel/fakejob123`,
      {
        method: 'POST',
      }
    );
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API POST /api/export properly applies seeking flags to all multi-camera inputs', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'TestEvent',
        camera: 'all',
        format: 'mp4',
        clips: {
          front: 'http://example.com/front.mp4',
          back: 'http://example.com/back.mp4',
          left_repeater: 'http://example.com/left_repeater.mp4',
          right_repeater: 'http://example.com/right_repeater.mp4',
          left_pillar: 'http://example.com/left_pillar.mp4',
          right_pillar: 'http://example.com/right_pillar.mp4',
        },
        inPoint: 12,
        outPoint: 28,
      }),
    });

    assert.strictEqual(res.status, 200);
    const { jobId } = await res.json();
    const job = exportJobs.get(jobId);
    assert.ok(job);
    assert.strictEqual(job.status, 'encoding');

    // Inspect command arguments generated by fluent-ffmpeg
    const args = job.command._getArguments();
    // Verify each input is preceded by -ss 12
    const ssIndices = [];
    args.forEach((arg, idx) => {
      if (arg === '-ss') ssIndices.push(idx);
    });
    // 6 cameras should have 6 -ss seeking options
    assert.strictEqual(ssIndices.length, 6);
    // Duration should be 28 - 12 = 16 seconds
    const durationIdx = args.indexOf('-t');
    assert.ok(durationIdx !== -1);
    assert.strictEqual(args[durationIdx + 1], 16);

    // Cancel job
    await fetch(`http://127.0.0.1:${port}/api/export/cancel/${jobId}`, {
      method: 'POST',
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
