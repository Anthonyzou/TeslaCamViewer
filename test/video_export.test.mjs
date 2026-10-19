import assert from 'node:assert';
import { test } from 'node:test';
import { createJiti } from 'jiti';

globalThis.localStorage = globalThis.localStorage || {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const jiti = createJiti(process.cwd());
const { VideoExport } = jiti('./src/services/videoExport.ts');
const { Output, Mp4OutputFormat, BufferTarget } = jiti('mediabunny');

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
