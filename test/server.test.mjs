import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  app,
  organizeB2Events,
  VIDEO_CACHE_DIR,
  clearVideoCache,
} from '../server/index.mjs';

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

test('API GET /api/b2/cache/status returns cache info', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/b2/cache/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.enabled, true);
    assert.ok(typeof data.totalFiles === 'number');
    assert.ok(typeof data.totalBytes === 'number');
    assert.ok(typeof data.maxBytes === 'number');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API GET /api/b2/video rejects requests with missing parameters', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/b2/video`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API GET /api/b2/video streams cached video with HTTP 206 Range support', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const testFileRel = 'TestClips/2026-10-15_12-00-00/test-front.mp4';
  const testFileAbs = path.join(VIDEO_CACHE_DIR, testFileRel);

  try {
    // Seed fake cached video file with 1024 bytes of dummy binary data
    await fs.promises.mkdir(path.dirname(testFileAbs), { recursive: true });
    const dummyBuffer = Buffer.alloc(1024, 'a');
    await fs.promises.writeFile(testFileAbs, dummyBuffer);

    // 1. Full GET request
    const fullRes = await fetch(
      `http://127.0.0.1:${port}/api/b2/video?file=${encodeURIComponent(testFileRel)}`
    );
    assert.strictEqual(fullRes.status, 200);
    assert.strictEqual(fullRes.headers.get('accept-ranges'), 'bytes');
    assert.ok(fullRes.headers.get('content-type')?.includes('video/mp4'));
    assert.strictEqual(fullRes.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const fullBody = await fullRes.arrayBuffer();
    assert.strictEqual(fullBody.byteLength, 1024);

    // 2. HTTP Byte Range request (typical video player scrub request)
    const rangeRes = await fetch(
      `http://127.0.0.1:${port}/api/b2/video?file=${encodeURIComponent(testFileRel)}`,
      {
        headers: { Range: 'bytes=0-127' },
      }
    );
    assert.strictEqual(rangeRes.status, 206, 'Should return 206 Partial Content');
    assert.strictEqual(rangeRes.headers.get('content-range'), 'bytes 0-127/1024');
    const rangeBody = await rangeRes.arrayBuffer();
    assert.strictEqual(rangeBody.byteLength, 128);

    // 3. Clear cache route test
    const clearRes = await fetch(`http://127.0.0.1:${port}/api/b2/cache/clear`, {
      method: 'POST',
    });
    assert.strictEqual(clearRes.status, 200);
    const clearData = await clearRes.json();
    assert.strictEqual(clearData.success, true);
    assert.strictEqual(fs.existsSync(testFileAbs), false);
  } finally {
    await clearVideoCache();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API GET /api/b2/video concurrently streams to client and saves to disk cache', async () => {
  // 1. Mock B2 origin server
  let originHits = 0;
  const mockOriginServer = http.createServer((req, res) => {
    originHits++;
    const payload = Buffer.from('TeslaCamVideoPayloadBytesFromOrigin');
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': String(payload.length),
      'Accept-Ranges': 'bytes',
    });
    res.end(payload);
  });

  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originPort = mockOriginServer.address().port;
  const originUrl = `http://127.0.0.1:${originPort}/dummy-remote-clip.mp4`;

  // 2. Local TeslaCamViewer Server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  const testFileRel = 'ConcurrentTest/clip1-front.mp4';
  const testFileAbs = path.join(VIDEO_CACHE_DIR, testFileRel);

  try {
    await clearVideoCache();
    assert.strictEqual(fs.existsSync(testFileAbs), false);

    // Initial request: uncached -> streams from origin and saves to disk concurrently
    const res1 = await fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(testFileRel)}&url=${encodeURIComponent(originUrl)}`,
      { headers: { Range: 'bytes=0-' } }
    );
    assert.strictEqual(res1.status, 206);
    assert.strictEqual(res1.headers.get('content-range'), 'bytes 0-34/35');
    const text1 = await res1.text();
    assert.strictEqual(text1, 'TeslaCamVideoPayloadBytesFromOrigin');
    assert.strictEqual(originHits, 1);

    // Wait briefly for disk write stream to flush and rename
    let retries = 20;
    while (!fs.existsSync(testFileAbs) && retries > 0) {
      await new Promise((r) => setTimeout(r, 20));
      retries--;
    }
    assert.strictEqual(fs.existsSync(testFileAbs), true, 'File should be saved in disk cache');

    // Second request: cached -> served from disk without hitting origin again
    const res2 = await fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(testFileRel)}&url=${encodeURIComponent(originUrl)}`
    );
    assert.strictEqual(res2.status, 200);
    const text2 = await res2.text();
    assert.strictEqual(text2, 'TeslaCamVideoPayloadBytesFromOrigin');
    assert.strictEqual(originHits, 1, 'Origin server should NOT be hit a second time');
  } finally {
    await clearVideoCache();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});
