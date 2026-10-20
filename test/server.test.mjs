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
  getVideoCacheStatus,
  pruneVideoCache,
  httpAgent,
  httpsAgent,
  touchCacheFile,
} from '../server/index.ts';

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

test('API GET /api/b2/video serves range seek requests immediately without blocking on in-flight cache download', async () => {
  const fullPayload = Buffer.from('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const mockOriginServer = http.createServer((req, res) => {
    const range = req.headers.range;
    if (range && range !== 'bytes=0-') {
      // Seek request: immediately return 206 Partial Content
      const matches = range.match(/bytes=(\d+)-(\d+)?/);
      const start = parseInt(matches[1], 10);
      const end = matches[2] ? parseInt(matches[2], 10) : fullPayload.length - 1;
      const slice = fullPayload.subarray(start, end + 1);
      res.writeHead(206, {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes ${start}-${end}/${fullPayload.length}`,
        'Content-Length': String(slice.length),
        'Accept-Ranges': 'bytes',
      });
      res.end(slice);
    } else {
      // Initial stream: stream slowly to keep download in-flight
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': String(fullPayload.length),
        'Accept-Ranges': 'bytes',
      });
      res.write(fullPayload.subarray(0, 10));
      setTimeout(() => {
        try {
          res.end(fullPayload.subarray(10));
        } catch (_e) {}
      }, 150);
    }
  });

  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originPort = mockOriginServer.address().port;
  const originUrl = `http://127.0.0.1:${originPort}/slow-stream.mp4`;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  const testFileRel = 'ConcurrentSeek/clip-seek.mp4';

  try {
    await clearVideoCache();

    // 1. Start initial stream download (bytes=0-)
    const streamPromise = fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(testFileRel)}&url=${encodeURIComponent(originUrl)}`,
      { headers: { Range: 'bytes=0-' } }
    );

    // Give server 20ms so in-flight download is actively registered
    await new Promise((r) => setTimeout(r, 20));

    // 2. Client seeks into video (Range: bytes=10-19) while download is still in-flight
    const seekStartTime = performance.now();
    const seekRes = await fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(testFileRel)}&url=${encodeURIComponent(originUrl)}`,
      { headers: { Range: 'bytes=10-19' } }
    );
    const seekDuration = performance.now() - seekStartTime;

    assert.strictEqual(seekRes.status, 206);
    assert.strictEqual(seekRes.headers.get('content-range'), 'bytes 10-19/36');
    const seekText = await seekRes.text();
    assert.strictEqual(seekText, 'ABCDEFGHIJ');
    // Seeking must NOT be blocked waiting for the 150ms slow stream to finish
    assert.ok(seekDuration < 100, `Seek request took ${seekDuration}ms, should be <100ms`);

    // Clean up initial stream
    const initRes = await streamPromise;
    await initRes.text();
  } finally {
    await clearVideoCache();
    mockOriginServer.closeAllConnections?.();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});

test('API GET /api/b2/video rejects invalid url query parameter with 400 Bad Request', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/b2/video?url=not-a-valid-url`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'Invalid url query parameter');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API GET /api/b2/video handles origin stream failures gracefully without crashing', async () => {
  const mockOriginServer = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': '100000',
      'Accept-Ranges': 'bytes',
    });
    res.write(Buffer.alloc(1000, 'x'));
    setTimeout(() => {
      req.socket.destroy();
    }, 30);
  });

  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originPort = mockOriginServer.address().port;
  const originUrl = `http://127.0.0.1:${originPort}/broken-clip.mp4`;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  try {
    await clearVideoCache();
    const res = await fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=broken-clip.mp4&url=${encodeURIComponent(originUrl)}`,
      { headers: { Range: 'bytes=0-' } }
    );
    assert.strictEqual(res.status, 206);
    try {
      const reader = res.body.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch (_expectedError) {
      // Stream truncation/reset is expected from the broken origin
    }

    // Verify the server remains responsive to subsequent requests
    const pingRes = await fetch(`http://127.0.0.1:${serverPort}/api/b2/config`);
    assert.strictEqual(pingRes.status, 200);
  } finally {
    await clearVideoCache();
    mockOriginServer.closeAllConnections?.();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});

test('API GET /api/b2/video handles client aborts gracefully during streaming', async () => {
  let interval;
  const mockOriginServer = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': '100000',
      'Accept-Ranges': 'bytes',
    });
    interval = setInterval(() => {
      try {
        res.write(Buffer.alloc(1000, 'x'));
      } catch (_e) {
        clearInterval(interval);
      }
    }, 20);
    interval.unref();
  });

  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originPort = mockOriginServer.address().port;
  const originUrl = `http://127.0.0.1:${originPort}/slow-clip.mp4`;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  try {
    await clearVideoCache();
    const controller = new AbortController();
    const fetchPromise = fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=abort-clip.mp4&url=${encodeURIComponent(originUrl)}`,
      {
        headers: { Range: 'bytes=0-' },
        signal: controller.signal,
      }
    );

    setTimeout(() => {
      controller.abort();
    }, 40);

    try {
      const res = await fetchPromise;
      const reader = res.body.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch (_expectedAbort) {
      // Abort is expected
    }

    // Give server a moment to settle
    await new Promise((r) => setTimeout(r, 100));

    // Verify the server is still healthy
    const pingRes = await fetch(`http://127.0.0.1:${serverPort}/api/b2/config`);
    assert.strictEqual(pingRes.status, 200);
  } finally {
    if (interval) clearInterval(interval);
    await clearVideoCache();
    mockOriginServer.closeAllConnections?.();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});

test('HTTP and HTTPS keep-alive agents configure persistent connection pooling', () => {
  assert.ok(httpAgent);
  assert.ok(httpsAgent);
  assert.strictEqual(httpAgent.keepAlive, true);
  assert.strictEqual(httpsAgent.keepAlive, true);
  assert.strictEqual(httpAgent.maxSockets, 100);
  assert.strictEqual(httpsAgent.maxSockets, 100);
  assert.strictEqual(httpAgent.maxFreeSockets, 20);
  assert.strictEqual(httpsAgent.maxFreeSockets, 20);
});

test('touchCacheFile updates file timestamps for noatime SSD support', async () => {
  const testFileRel = 'TouchTest/sample.mp4';
  const testFileAbs = path.join(VIDEO_CACHE_DIR, testFileRel);
  try {
    await fs.promises.mkdir(path.dirname(testFileAbs), { recursive: true });
    await fs.promises.writeFile(testFileAbs, Buffer.from('abc'));

    // Set file time to 1 hour in the past
    const pastTime = new Date(Date.now() - 3600 * 1000);
    await fs.promises.utimes(testFileAbs, pastTime, pastTime);

    const initialStat = await fs.promises.stat(testFileAbs);
    assert.ok(Math.abs(initialStat.mtimeMs - pastTime.getTime()) < 2000);

    // Call touchCacheFile and verify timestamp is bumped to near now
    touchCacheFile(testFileAbs);
    await new Promise((r) => setTimeout(r, 50));

    const updatedStat = await fs.promises.stat(testFileAbs);
    assert.ok(updatedStat.mtimeMs > initialStat.mtimeMs);
    assert.ok(Date.now() - updatedStat.mtimeMs < 2000);
  } finally {
    await clearVideoCache();
  }
});

test('parallel async cache traversal scans and prunes cache accurately', async () => {
  try {
    await clearVideoCache();
    // Create multiple folders and files in cache to test parallel traversal
    for (let i = 0; i < 5; i++) {
      const folder = path.join(VIDEO_CACHE_DIR, `Folder_${i}`);
      await fs.promises.mkdir(folder, { recursive: true });
      await fs.promises.writeFile(
        path.join(folder, `clip_${i}.mp4`),
        Buffer.alloc(100, 'x')
      );
    }

    const status = await getVideoCacheStatus();
    assert.strictEqual(status.totalFiles, 5);
    assert.strictEqual(status.totalBytes, 500);

    // Prune down to 250 bytes
    await pruneVideoCache(VIDEO_CACHE_DIR, 250);
    const postPruneStatus = await getVideoCacheStatus();
    assert.ok(postPruneStatus.totalBytes <= 250);
  } finally {
    await clearVideoCache();
  }
});

test('API POST /api/b2/cache/preload validates and schedules server-side video preloading', async () => {
  const mockOriginServer = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': '50',
    });
    res.end(Buffer.alloc(50, 'y'));
  });

  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originPort = mockOriginServer.address().port;
  const originUrl = `http://127.0.0.1:${originPort}/prewarm_clip.mp4`;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  try {
    await clearVideoCache();

    // 1. Rejects missing/empty items
    const badRes = await fetch(`http://127.0.0.1:${serverPort}/api/b2/cache/preload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    assert.strictEqual(badRes.status, 400);

    // 2. Schedules valid items
    const goodRes = await fetch(`http://127.0.0.1:${serverPort}/api/b2/cache/preload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ file: 'prewarm_clip.mp4', url: originUrl }],
      }),
    });
    assert.strictEqual(goodRes.status, 200);
    const data = await goodRes.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.count, 1);

    // Wait a brief moment for background caching to finish
    await new Promise((r) => setTimeout(r, 200));

    // Verify file is now in cache
    const cachedFilePath = path.join(VIDEO_CACHE_DIR, 'prewarm_clip.mp4');
    assert.strictEqual(fs.existsSync(cachedFilePath), true);

    // 3. Unpacks proxy URLs (/api/b2/video?file=...&url=...) and saves under full event path
    const fullProxyUrl = `/api/b2/video?file=SentryClips%2F2026-10-18_12-30-00%2Ffront.mp4&url=${encodeURIComponent(originUrl)}`;
    const proxyRes = await fetch(`http://127.0.0.1:${serverPort}/api/b2/cache/preload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ file: 'front.mp4', url: fullProxyUrl }],
      }),
    });
    assert.strictEqual(proxyRes.status, 200);
    const proxyData = await proxyRes.json();
    assert.strictEqual(proxyData.files[0], 'SentryClips/2026-10-18_12-30-00/front.mp4');

    await new Promise((r) => setTimeout(r, 200));
    const fullCachedPath = path.join(VIDEO_CACHE_DIR, 'SentryClips/2026-10-18_12-30-00/front.mp4');
    assert.strictEqual(fs.existsSync(fullCachedPath), true);
  } finally {
    await clearVideoCache();
    mockOriginServer.closeAllConnections?.();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});
