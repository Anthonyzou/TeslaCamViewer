import { after, test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';

// Tests clear and prune the cache dir, so point it at a throwaway directory before the server module reads its config
const testCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teslacam-test-cache-'));
process.env.VIDEO_CACHE_DIR = testCacheDir;
after(() => fs.rmSync(testCacheDir, { recursive: true, force: true }));

const {
  app,
  organizeB2Events,
  VIDEO_CACHE_DIR,
  clearVideoCache,
  getVideoCacheStatus,
  pruneVideoCache,
  httpAgent,
  httpsAgent,
  touchCacheFile,
} = await import('../server/index.ts');
const { MAX_CACHE_BYTES } = await import('../server/b2API.ts');
const { trackInboundConnections } = await import('../server/networkTraffic.ts');

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

test('API GET /api/traffic reports bytes moved over server sockets', async () => {
  const server = http.createServer(app);
  trackInboundConnections(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const before = await (await fetch(`http://127.0.0.1:${port}/api/traffic`)).json();
    assert.strictEqual(typeof before.uploadBytes, 'number');
    assert.strictEqual(typeof before.downloadBytes, 'number');
    assert.ok(!Number.isNaN(Date.parse(before.since)));

    const body = await (await fetch(`http://127.0.0.1:${port}/api/b2/config`)).text();
    const after = await (await fetch(`http://127.0.0.1:${port}/api/traffic`)).json();

    assert.ok(after.downloadBytes > before.downloadBytes);
    assert.ok(after.uploadBytes > before.uploadBytes);
    assert.ok(body.length > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API HEAD /api/b2/video reports cache or b2 without fetching from B2', async () => {
  const cachedName = 'head-probe/cached.mp4';
  const cachedPath = path.join(VIDEO_CACHE_DIR, cachedName);
  fs.mkdirSync(path.dirname(cachedPath), { recursive: true });
  fs.writeFileSync(cachedPath, 'abc');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const cached = await fetch(
      `http://127.0.0.1:${port}/api/b2/video?file=${encodeURIComponent(cachedName)}`,
      { method: 'HEAD' }
    );
    assert.strictEqual(cached.status, 200);
    assert.strictEqual(cached.headers.get('x-video-source'), 'cache');

    const uncached = await fetch(
      `http://127.0.0.1:${port}/api/b2/video?file=${encodeURIComponent('head-probe/missing.mp4')}`,
      { method: 'HEAD' }
    );
    assert.strictEqual(uncached.status, 200);
    assert.strictEqual(uncached.headers.get('x-video-source'), 'b2');
    assert.ok(!fs.existsSync(path.join(VIDEO_CACHE_DIR, 'head-probe/missing.mp4')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(path.join(VIDEO_CACHE_DIR, 'head-probe'), { recursive: true, force: true });
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
        } catch (_e) { }
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

test('API GET /api/b2/video background caching continues to disk when client closes connection after initial buffer', async () => {
  const fullPayload = Buffer.from('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const mockOriginServer = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': String(fullPayload.length),
      'Accept-Ranges': 'bytes',
    });
    // Stream chunks slowly to simulate network delivery
    let offset = 0;
    const interval = setInterval(() => {
      if (offset < fullPayload.length) {
        const next = Math.min(fullPayload.length, offset + 10);
        res.write(fullPayload.subarray(offset, next));
        offset = next;
      } else {
        clearInterval(interval);
        res.end();
      }
    }, 20);
    interval.unref();
  });

  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originPort = mockOriginServer.address().port;
  const originUrl = `http://127.0.0.1:${originPort}/uninterruptible-test.mp4`;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  const testFileRel = 'Uninterruptible/clip.mp4';
  const testFileAbs = path.join(VIDEO_CACHE_DIR, testFileRel);

  try {
    await clearVideoCache();

    // 1. Client connects with Range: bytes=0-
    const controller = new AbortController();
    const res1 = await fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(testFileRel)}&url=${encodeURIComponent(originUrl)}`,
      {
        headers: { Range: 'bytes=0-' },
        signal: controller.signal,
      }
    );
    assert.strictEqual(res1.status, 206);

    // Read first chunk (10 bytes), then client closes socket (buffer full simulation)
    const reader = res1.body.getReader();
    const { value } = await reader.read();
    assert.ok(value && value.length >= 10);
    controller.abort();

    // 2. Verify: background download continues writing to disk cache until complete
    let retries = 30;
    while (!fs.existsSync(testFileAbs) && retries > 0) {
      await new Promise((r) => setTimeout(r, 30));
      retries--;
    }
    assert.strictEqual(fs.existsSync(testFileAbs), true, 'Full file should complete downloading to disk in background');
    const cachedData = await fs.promises.readFile(testFileAbs);
    assert.strictEqual(cachedData.toString(), '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');

    // 3. Client subsequent request for next range: served directly from disk cache in <10ms
    const startTime = performance.now();
    const res2 = await fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(testFileRel)}&url=${encodeURIComponent(originUrl)}`,
      { headers: { Range: 'bytes=10-' } }
    );
    const duration = performance.now() - startTime;
    assert.strictEqual(res2.status, 206);
    assert.strictEqual(res2.headers.get('content-range'), 'bytes 10-35/36');
    const text2 = await res2.text();
    assert.strictEqual(text2, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    assert.ok(duration < 50, `Subsequent range served from local SSD cache in ${duration}ms`);
  } finally {
    await clearVideoCache();
    mockOriginServer.closeAllConnections?.();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});

test('API GET /api/b2/video keeps streaming to the client while the disk cache writer is slow', async (t) => {
  const payload = Buffer.alloc(8 * 1024 * 1024, 'z');
  const mockOriginServer = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': String(payload.length),
      'Accept-Ranges': 'bytes',
    });
    res.end(payload);
  });

  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originUrl = `http://127.0.0.1:${mockOriginServer.address().port}/slow-disk.mp4`;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  const testFileRel = 'SlowDisk/clip.mp4';
  const realCreateWriteStream = fs.createWriteStream;
  t.mock.method(fs, 'createWriteStream', (...args) => {
    const writer = realCreateWriteStream(...args);
    const realWrite = writer._write.bind(writer);
    const realWritev = writer._writev.bind(writer);
    writer._write = (chunk, enc, cb) => {
      setTimeout(() => realWrite(chunk, enc, cb), 200);
    };
    writer._writev = (chunks, cb) => {
      setTimeout(() => realWritev(chunks, cb), 200);
    };
    return writer;
  });

  try {
    await clearVideoCache();

    const start = performance.now();
    const res = await fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(testFileRel)}&url=${encodeURIComponent(originUrl)}`,
      { headers: { Range: 'bytes=0-' } }
    );
    assert.strictEqual(res.status, 206);
    const body = Buffer.from(await res.arrayBuffer());
    const elapsed = performance.now() - start;

    assert.strictEqual(body.length, payload.length, 'Client receives the full body');
    assert.ok(elapsed < 500, `Client finished in ${elapsed}ms; a slow disk writer must not pace playback`);
  } finally {
    t.mock.restoreAll();
    await clearVideoCache();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    mockOriginServer.closeAllConnections?.();
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});

test('parallel cache listing excludes in-progress tmp files and counts the rest', async () => {
  try {
    await clearVideoCache();
    const folder = path.join(VIDEO_CACHE_DIR, 'ListFolder');
    await fs.promises.mkdir(folder, { recursive: true });
    for (let i = 0; i < 40; i++) {
      await fs.promises.writeFile(path.join(folder, `clip_${i}.mp4`), Buffer.alloc(10, 'x'));
    }
    await fs.promises.writeFile(path.join(folder, 'clip_0.mp4.tmp.123'), Buffer.alloc(10, 'x'));

    const status = await getVideoCacheStatus();
    assert.strictEqual(status.totalFiles, 40, 'In-progress .tmp. files are excluded');
    assert.strictEqual(status.totalBytes, 400);
  } finally {
    await clearVideoCache();
  }
});

test('cache byte counter avoids a directory scan when a download stays under the limit', async (t) => {
  const payload = Buffer.from('counter-under-limit-payload');
  const mockOriginServer = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': String(payload.length),
      'Accept-Ranges': 'bytes',
    });
    res.end(payload);
  });
  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originUrl = `http://127.0.0.1:${mockOriginServer.address().port}/counter.mp4`;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  const testFileRel = 'CounterScan/clip.mp4';
  const testFileAbs = path.join(VIDEO_CACHE_DIR, testFileRel);

  try {
    await clearVideoCache();
    const readdirSpy = t.mock.method(fs.promises, 'readdir');

    const res = await fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(testFileRel)}&url=${encodeURIComponent(originUrl)}`,
      { headers: { Range: 'bytes=0-' } }
    );
    await res.arrayBuffer();

    let retries = 50;
    while (!fs.existsSync(testFileAbs) && retries > 0) {
      await new Promise((r) => setTimeout(r, 20));
      retries--;
    }
    assert.strictEqual(fs.existsSync(testFileAbs), true);
    await new Promise((r) => setTimeout(r, 100));

    assert.strictEqual(readdirSpy.mock.callCount(), 0, 'Under-limit download must not walk the cache dir');
  } finally {
    t.mock.restoreAll();
    await clearVideoCache();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    mockOriginServer.closeAllConnections?.();
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});

test('cache byte counter evicts the oldest file once a download pushes the total over the limit', async () => {
  const payload = Buffer.from('counter-over-limit-payload');
  const mockOriginServer = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': String(payload.length),
      'Accept-Ranges': 'bytes',
    });
    res.end(payload);
  });
  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originUrl = `http://127.0.0.1:${mockOriginServer.address().port}/over-limit.mp4`;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  const oldRel = 'OverLimit/old-sparse.mp4';
  const oldAbs = path.join(VIDEO_CACHE_DIR, oldRel);
  const newRel = 'OverLimit/new-clip.mp4';
  const newAbs = path.join(VIDEO_CACHE_DIR, newRel);

  try {
    await clearVideoCache();

    // A sparse file just over the configured limit, with the oldest atime so it is evicted first
    await fs.promises.mkdir(path.dirname(oldAbs), { recursive: true });
    await fs.promises.writeFile(oldAbs, '');
    await fs.promises.truncate(oldAbs, MAX_CACHE_BYTES + 1);
    await fs.promises.utimes(oldAbs, 1000, 1000);

    // Seed the counter from disk; Infinity limit means no eviction during the seed
    await pruneVideoCache(VIDEO_CACHE_DIR, Infinity);

    const res = await fetch(
      `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(newRel)}&url=${encodeURIComponent(originUrl)}`,
      { headers: { Range: 'bytes=0-' } }
    );
    await res.arrayBuffer();

    let retries = 100;
    while (fs.existsSync(oldAbs) && retries > 0) {
      await new Promise((r) => setTimeout(r, 20));
      retries--;
    }
    assert.strictEqual(fs.existsSync(oldAbs), false, 'Oldest file is evicted once the total exceeds the limit');
    assert.strictEqual(fs.existsSync(newAbs), true, 'Newly cached file is kept');
  } finally {
    await clearVideoCache();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    mockOriginServer.closeAllConnections?.();
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});

test('clearVideoCache refuses to wipe a non-temp cache directory during a test run', async () => {
  const env = { ...process.env, VIDEO_CACHE_DIR: path.join(os.homedir(), 'teslacam-not-tmp') };
  const script = `
    const { clearVideoCache } = await import(${JSON.stringify(path.resolve(import.meta.dirname, '..', 'server', 'b2API.ts'))});
    try {
      await clearVideoCache();
      console.log('CLEARED');
    } catch (err) {
      console.log('REFUSED', err.message);
    }
  `;
  const output = await new Promise((resolve, reject) => {
    execFile(process.execPath, ['--input-type=module', '-e', script], { env }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
  assert.match(output, /REFUSED Refusing to clear a non-temp video cache/);
});

function resolveCacheDirInChild(envValue, cwd) {
  const env = { ...process.env, VIDEO_CACHE_DIR: envValue };
  const script = `
    const { VIDEO_CACHE_DIR } = await import(${JSON.stringify(path.resolve(import.meta.dirname, '..', 'server', 'b2API.ts'))});
    console.log(VIDEO_CACHE_DIR);
  `;
  return new Promise((resolve, reject) => {
    execFile(process.execPath, ['--input-type=module', '-e', script], { env, cwd }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

test('VIDEO_CACHE_DIR resolves relative paths against the project root, not the launch directory', async () => {
  const projectRoot = path.resolve(import.meta.dirname, '..');
  assert.strictEqual(
    await resolveCacheDirInChild('.cache/videos', os.tmpdir()),
    path.join(projectRoot, '.cache', 'videos')
  );
});

test('VIDEO_CACHE_DIR keeps absolute paths unchanged', async () => {
  const absolute = path.join(os.tmpdir(), 'teslacam-abs-cache');
  assert.strictEqual(await resolveCacheDirInChild(absolute, os.tmpdir()), absolute);
});

test('API GET /api/b2/video reports X-Video-Source as b2 when streaming from origin and cache when served from disk', async () => {
  const payload = Buffer.from('source-header-payload');
  const mockOriginServer = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': String(payload.length),
      'Accept-Ranges': 'bytes',
    });
    res.end(payload);
  });
  await new Promise((resolve) => mockOriginServer.listen(0, resolve));
  const originUrl = `http://127.0.0.1:${mockOriginServer.address().port}/source.mp4`;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const serverPort = server.address().port;

  const testFileRel = 'SourceHeader/clip.mp4';
  const testFileAbs = path.join(VIDEO_CACHE_DIR, testFileRel);
  const url = `http://127.0.0.1:${serverPort}/api/b2/video?file=${encodeURIComponent(testFileRel)}&url=${encodeURIComponent(originUrl)}`;

  try {
    await clearVideoCache();

    const fromOrigin = await fetch(url, { headers: { Range: 'bytes=0-' } });
    assert.strictEqual(fromOrigin.headers.get('x-video-source'), 'b2');
    await fromOrigin.arrayBuffer();

    let retries = 50;
    while (!fs.existsSync(testFileAbs) && retries > 0) {
      await new Promise((r) => setTimeout(r, 20));
      retries--;
    }
    assert.strictEqual(fs.existsSync(testFileAbs), true);

    const fromCache = await fetch(url);
    assert.strictEqual(fromCache.status, 200);
    assert.strictEqual(fromCache.headers.get('x-video-source'), 'cache');
    await fromCache.arrayBuffer();
  } finally {
    await clearVideoCache();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    mockOriginServer.closeAllConnections?.();
    await new Promise((resolve) => mockOriginServer.close(resolve));
  }
});

test('concurrent performB2Parse calls for the same bucket share one B2 listing', async (t) => {
  const { default: B2 } = await import('backblaze-b2');
  const { performB2Parse } = await import('../server/b2API.ts');

  let listCalls = 0;
  let releaseList;
  const listGate = new Promise((resolve) => {
    releaseList = resolve;
  });
  t.mock.method(B2.prototype, 'authorize', async function () {
    this.downloadUrl = 'https://f000.backblazeb2.com';
    return { data: {} };
  });
  t.mock.method(B2.prototype, 'getBucket', async () => ({
    data: { buckets: [{ bucketName: 'shared-bucket', bucketId: 'bkt-1' }] },
  }));
  t.mock.method(B2.prototype, 'listFileNames', async () => {
    listCalls++;
    await listGate;
    return { data: { files: [], nextFileName: null } };
  });
  t.mock.method(B2.prototype, 'getDownloadAuthorization', async () => ({
    data: { authorizationToken: 'tok' },
  }));

  const first = performB2Parse('key-id', 'app-key', 'shared-bucket');
  const second = performB2Parse('key-id', 'app-key', 'shared-bucket');
  releaseList();
  const [a, b] = await Promise.all([first, second]);

  assert.strictEqual(listCalls, 1, 'Only one listing should reach B2');
  assert.strictEqual(a, b, 'Both callers receive the same result');
});
