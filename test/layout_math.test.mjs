import assert from 'node:assert';
import { test } from 'node:test';
import { createJiti } from 'jiti';

const jiti = createJiti(process.cwd());
const {
  calculateDrawParams,
  calculateContainSize,
  calculateExportConfig,
} = jiti('./src/layout/layoutMath.ts');

test('calculateDrawParams - handles uncropped fill correctly', () => {
  const video = { videoWidth: 1280, videoHeight: 960 };
  const camConfig = {
    x: 10,
    y: 20,
    w: 640,
    h: 480,
    objectFit: 'fill',
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
  };

  const params = calculateDrawParams(video, camConfig);
  assert.strictEqual(params.sx, 0);
  assert.strictEqual(params.sy, 0);
  assert.strictEqual(params.sw, 1280);
  assert.strictEqual(params.sh, 960);
  assert.strictEqual(params.dx, 10);
  assert.strictEqual(params.dy, 20);
  assert.strictEqual(params.dw, 640);
  assert.strictEqual(params.dh, 480);
});

test('calculateDrawParams - applies crop percentages correctly', () => {
  const video = { width: 1000, height: 1000 };
  const camConfig = {
    x: 0,
    y: 0,
    w: 500,
    h: 500,
    objectFit: 'fill',
    crop: { top: 10, bottom: 20, left: 5, right: 15 },
  };

  const params = calculateDrawParams(video, camConfig);
  assert.strictEqual(params.sx, 50); // 5% of 1000
  assert.strictEqual(params.sy, 100); // 10% of 1000
  assert.strictEqual(params.sw, 800); // 1000 - 50 - 150
  assert.strictEqual(params.sh, 700); // 1000 - 100 - 200
});

test('calculateDrawParams - letterboxes in contain mode when source is wider', () => {
  // 16:9 source in 1:1 destination
  const video = { width: 1600, height: 900 };
  const camConfig = {
    x: 0,
    y: 0,
    w: 800,
    h: 800,
    objectFit: 'contain',
  };

  const params = calculateDrawParams(video, camConfig);
  assert.strictEqual(params.dw, 800);
  assert.strictEqual(params.dh, 450); // 800 / (16/9)
  assert.strictEqual(params.dy, 175); // (800 - 450) / 2
});

test('calculateContainSize - maintains aspect ratio within container boundaries', () => {
  // 4:3 (1.333...) inside 1920x1080 (16:9 wider container) -> height constrained
  const size1 = calculateContainSize(1920, 1080, 4 / 3);
  assert.strictEqual(size1.height, 1080);
  assert.strictEqual(size1.width, 1440);

  // 4:3 inside 600x800 (taller container) -> width constrained
  const size2 = calculateContainSize(600, 800, 4 / 3);
  assert.strictEqual(size2.width, 600);
  assert.strictEqual(size2.height, 450);
});

test('calculateExportConfig - computes canvas dimensions and respects visibleCameras override', () => {
  const mockConfig = {
    canvas: { aspectRatio: '4:3', backgroundColor: '#111111' },
    cameras: {
      front: {
        enabled: true,
        position: { x: 0, y: 0, width: 50, height: 50 },
        zIndex: 1,
      },
      back: {
        enabled: true,
        position: { x: 50, y: 0, width: 50, height: 50 },
        zIndex: 1,
      },
    },
  };

  // User hid the front camera
  const exportConfig = calculateExportConfig(mockConfig, 1280, 960, {
    visibleCameras: { front: false, back: true },
  });

  assert.strictEqual(exportConfig.width, 2560);
  assert.strictEqual(exportConfig.height, 1920);
  assert.strictEqual(exportConfig.backgroundColor, '#111111');
  assert.strictEqual(exportConfig.cameras.front.visible, false);
  assert.strictEqual(exportConfig.cameras.back.visible, true);
  assert.strictEqual(exportConfig.cameras.back.x, 1280);
  assert.strictEqual(exportConfig.cameras.back.w, 1280);
});
