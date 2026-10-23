import assert from 'node:assert';
import { test } from 'node:test';
import { createJiti } from 'jiti';

globalThis.localStorage = globalThis.localStorage || {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const jiti = createJiti(process.cwd());
const { VideoExport } = jiti('./src/composables/useVideoExport.ts');
const { Output, Mp4OutputFormat, BufferTarget, StreamTarget } = jiti('mediabunny');

test('VideoExport - initializes properly and manages export state', () => {
  const mockPlayer = {
    currentEvent: null,
    videos: {},
    pause: () => {},
  };

  const exporter = new VideoExport(mockPlayer);
  assert.strictEqual(exporter.isExporting, false);
  assert.deepStrictEqual(exporter.getExportStatus(), { isExporting: false });

  exporter.isExporting = true;
  exporter.cancelExport();
  assert.strictEqual(exporter.isExporting, false);
});

test('mediabunny - Mp4OutputFormat and BufferTarget initialize successfully', async () => {
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  });

  assert.ok(output);
  assert.ok(output.target instanceof BufferTarget);
});

test('mediabunny - StreamTarget writes chunks to syncAccessHandle with correct byte positions', async () => {
  const writtenChunks = [];
  let flushed = false;
  let closed = false;

  const mockSyncHandle = {
    write(data, options) {
      writtenChunks.push({
        bytes: new Uint8Array(data),
        position: options?.at,
      });
      return data.byteLength;
    },
    flush() {
      flushed = true;
    },
    close() {
      closed = true;
    },
  };

  const syncWritableStream = new WritableStream({
    write(chunk) {
      mockSyncHandle.write(chunk.data, { at: chunk.position });
    },
    close() {
      mockSyncHandle.flush();
      mockSyncHandle.close();
    },
  });

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: false }),
    target: new StreamTarget(syncWritableStream),
  });

  assert.ok(output);
  assert.ok(output.target instanceof StreamTarget);

  // Directly test the stream writer adapter
  const writer = syncWritableStream.getWriter();
  await writer.write({
    type: 'write',
    data: new Uint8Array([1, 2, 3, 4]),
    position: 0,
  });
  await writer.write({
    type: 'write',
    data: new Uint8Array([5, 6]),
    position: 100,
  });
  await writer.close();

  assert.strictEqual(writtenChunks.length, 2);
  assert.deepStrictEqual(Array.from(writtenChunks[0].bytes), [1, 2, 3, 4]);
  assert.strictEqual(writtenChunks[0].position, 0);
  assert.deepStrictEqual(Array.from(writtenChunks[1].bytes), [5, 6]);
  assert.strictEqual(writtenChunks[1].position, 100);
  assert.strictEqual(flushed, true);
  assert.strictEqual(closed, true);
});

test('worker - dist/videoExportWorker.js is generated and valid', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const workerPath = path.resolve('dist/videoExportWorker.js');
  assert.ok(fs.existsSync(workerPath), 'dist/videoExportWorker.js must exist');
  const content = fs.readFileSync(workerPath, 'utf8');
  assert.ok(content.length > 50000, 'worker bundle should contain mediabunny');
  assert.ok(
    content.includes('export_headless_fast.mp4'),
    'worker bundle should contain OPFS file handle logic'
  );
});

test('VideoExport - cancels active worker on cancelExport', async () => {
  let messageSent = null;
  let terminated = false;

  class MockWorker {
    postMessage(msg) {
      messageSent = msg;
    }
    terminate() {
      terminated = true;
    }
  }

  const mockPlayer = {
    currentEvent: null,
    videos: {},
    pause: () => {},
  };

  const exporter = new VideoExport(mockPlayer);
  exporter._worker = new MockWorker();
  exporter.isExporting = true;

  await exporter.cancelExport();

  assert.strictEqual(exporter.isExporting, false);
  assert.deepStrictEqual(messageSent, { type: 'cancel' });
  assert.strictEqual(terminated, true);
  assert.strictEqual(exporter._worker, null);
});
