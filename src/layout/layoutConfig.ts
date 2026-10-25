/**
 * LayoutConfig - Configuration schema, validation, and preset conversion
 * Defines the structure for custom camera layouts
 */
import type {
  LayoutCameraConfig,
  LayoutCameraPosition,
  LayoutConfigSchema,
} from '../types';

const CAMERAS = [
  'front',
  'back',
  'left_repeater',
  'right_repeater',
  'left_pillar',
  'right_pillar',
  'interior',
];

const CAMERA_NAMES: Record<string, string> = {
  front: 'Front',
  back: 'Back',
  left_repeater: 'Left Repeater',
  right_repeater: 'Right Repeater',
  left_pillar: 'Left Pillar',
  right_pillar: 'Right Pillar',
  interior: 'Interior',
};

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  '4:3': { width: 4, height: 3 },
  '16:9': { width: 16, height: 9 },
  '6:3': { width: 6, height: 3 },
  '8:3': { width: 8, height: 3 },
  '12:3': { width: 12, height: 3 },
  '21:9': { width: 21, height: 9 },
};

const VERSION = 1;
const NO_CROP = { top: 0, right: 0, bottom: 0, left: 0 };
const BUILT_IN_CANVAS_BACKGROUND = '#000000';

interface CameraOptions {
  zIndex?: number;
  objectFit?: 'contain' | 'cover';
  crop?: LayoutCameraConfig['crop'];
}

function camera(
  enabled: boolean,
  position: LayoutCameraPosition,
  { zIndex = 1, objectFit = 'contain', crop = NO_CROP }: CameraOptions = {}
): LayoutCameraConfig {
  return { enabled, position, zIndex, aspectRatio: 'auto', objectFit, crop };
}

function preset(
  name: string,
  title: string,
  aspectRatio: string,
  cameras: Record<string, LayoutCameraConfig>
): LayoutConfigSchema {
  return {
    version: VERSION,
    id: `preset-${name}`,
    name: title,
    author: 'Built-in',
    canvas: { aspectRatio, backgroundColor: BUILT_IN_CANVAS_BACKGROUND },
    cameras,
  };
}

const PRESETS: Record<string, LayoutConfigSchema> = {
  'grid-2x2': preset('grid-2x2', '2x2 Grid', '4:3', {
    front: camera(true, { x: 0, y: 0, width: 50, height: 50 }),
    back: camera(true, { x: 50, y: 0, width: 50, height: 50 }),
    left_repeater: camera(true, { x: 0, y: 50, width: 50, height: 50 }),
    right_repeater: camera(true, { x: 50, y: 50, width: 50, height: 50 }),
  }),
  'grid-3x2': preset('grid-3x2', '3x2 Grid (6 Cameras)', '6:3', {
    front: camera(true, { x: 33.33, y: 0, width: 33.34, height: 50 }),
    back: camera(true, { x: 33.33, y: 50, width: 33.34, height: 50 }),
    left_repeater: camera(true, { x: 66.67, y: 50, width: 33.33, height: 50 }),
    right_repeater: camera(true, { x: 0, y: 50, width: 33.33, height: 50 }),
    left_pillar: camera(true, { x: 0, y: 0, width: 33.33, height: 50 }),
    right_pillar: camera(true, { x: 66.67, y: 0, width: 33.33, height: 50 }),
  }),
  'layout-6-3': preset('layout-6-3', '6:3 Centered', '6:3', {
    front: camera(
      true,
      { x: 29, y: 0, width: 42, height: 57.4 },
      { zIndex: 11, objectFit: 'cover', crop: { ...NO_CROP, bottom: 5 } }
    ),
    back: camera(
      true,
      { x: 30.9, y: 54.3, width: 37.6, height: 54.4 },
      { zIndex: 10, objectFit: 'cover', crop: { ...NO_CROP, bottom: 17 } }
    ),
    left_repeater: camera(
      true,
      { x: 67, y: 51.8, width: 33, height: 48.2 },
      { zIndex: 3, objectFit: 'cover' }
    ),
    right_repeater: camera(
      true,
      { x: 0, y: 52, width: 33, height: 48 },
      { zIndex: 3, objectFit: 'cover' }
    ),
    left_pillar: camera(
      true,
      { x: 0, y: 0, width: 33, height: 50 },
      { zIndex: 10, objectFit: 'cover' }
    ),
    right_pillar: camera(
      true,
      { x: 67, y: 0, width: 33, height: 50 },
      { zIndex: 10, objectFit: 'cover' }
    ),
  }),
  'layout-4-3': preset('layout-4-3', '4:3 Main', '4:3', {
    front: camera(
      true,
      { x: 15, y: 18, width: 70, height: 50 },
      { zIndex: 13, objectFit: 'cover' }
    ),
    back: camera(
      true,
      { x: 35, y: 0, width: 30, height: 25 },
      { zIndex: 15, crop: { ...NO_CROP, bottom: 15 } }
    ),
    left_repeater: camera(
      true,
      { x: 55, y: 60, width: 45, height: 40 },
      { zIndex: 10 }
    ),
    right_repeater: camera(
      true,
      { x: 0, y: 60, width: 45, height: 40 },
      { zIndex: 10 }
    ),
    left_pillar: camera(
      true,
      { x: 0, y: 0, width: 22, height: 28 },
      { zIndex: 12, objectFit: 'cover' }
    ),
    right_pillar: camera(
      true,
      { x: 78, y: 0, width: 22, height: 28 },
      { zIndex: 12, objectFit: 'cover' }
    ),
  }),
  'layout-all-16-9': preset('layout-all-16-9', 'All 16:9', '16:9', {
    front: camera(
      true,
      { x: 25, y: 0, width: 49.57, height: 62.06 },
      { zIndex: 20, objectFit: 'cover' }
    ),
    back: camera(
      true,
      { x: 30, y: 58, width: 40, height: 50 },
      { zIndex: 19, objectFit: 'cover', crop: { ...NO_CROP, bottom: 16 } }
    ),
    left_repeater: camera(
      true,
      { x: 70, y: 59, width: 30, height: 41 },
      { zIndex: 10, objectFit: 'cover' }
    ),
    right_repeater: camera(
      true,
      { x: 0, y: 59, width: 30, height: 41 },
      { zIndex: 10, objectFit: 'cover' }
    ),
    left_pillar: camera(
      true,
      { x: 0, y: 9.76, width: 25.43, height: 34.33 },
      { zIndex: 15 }
    ),
    right_pillar: camera(
      true,
      { x: 74.57, y: 9.76, width: 25, height: 34.33 },
      { zIndex: 15 }
    ),
  }),
  'layout-front-left': preset('layout-front-left', 'Front + Left', '8:3', {
    front: camera(true, { x: 50, y: 0, width: 50, height: 100 }),
    back: camera(false, { x: 0, y: 0, width: 50, height: 50 }),
    left_repeater: camera(true, { x: 0, y: 0, width: 50, height: 100 }),
    right_repeater: camera(false, { x: 50, y: 50, width: 50, height: 50 }),
  }),
  'layout-front-right': preset('layout-front-right', 'Front + Right', '8:3', {
    front: camera(true, { x: 0, y: 0, width: 50, height: 100 }),
    back: camera(false, { x: 0, y: 0, width: 50, height: 50 }),
    left_repeater: camera(false, { x: 0, y: 50, width: 50, height: 50 }),
    right_repeater: camera(true, { x: 50, y: 0, width: 50, height: 100 }),
  }),
  'layout-front-repeaters': preset(
    'layout-front-repeaters',
    'Front + Repeaters',
    '12:3',
    {
      front: camera(true, { x: 33.33, y: 0, width: 33.34, height: 100 }),
      back: camera(false, { x: 0, y: 0, width: 50, height: 50 }),
      left_repeater: camera(true, { x: 0, y: 0, width: 33.33, height: 100 }),
      right_repeater: camera(true, {
        x: 66.67,
        y: 0,
        width: 33.33,
        height: 100,
      }),
    }
  ),
  'layout-front-pillars': preset(
    'layout-front-pillars',
    'Front + Pillars',
    '12:3',
    {
      front: camera(
        true,
        { x: 32.86, y: 0, width: 33.43, height: 100 },
        { zIndex: 2 }
      ),
      back: camera(false, { x: 50, y: 0, width: 50, height: 50 }),
      left_repeater: camera(false, { x: 0, y: 50, width: 50, height: 50 }),
      right_repeater: camera(false, { x: 50, y: 50, width: 50, height: 50 }),
      left_pillar: camera(true, { x: 0, y: 0, width: 32.86, height: 100 }),
      right_pillar: camera(true, { x: 66.29, y: 0, width: 33.71, height: 100 }),
    }
  ),
  'layout-front-left-pillar': preset(
    'layout-front-left-pillar',
    'Front + Left Pillar',
    '8:3',
    {
      front: camera(true, { x: 50, y: 0, width: 50, height: 100 }),
      back: camera(false, { x: 0, y: 0, width: 50, height: 50 }),
      left_repeater: camera(false, { x: 0, y: 0, width: 50, height: 100 }),
      right_repeater: camera(false, { x: 50, y: 50, width: 50, height: 50 }),
      left_pillar: camera(true, { x: 0, y: 0, width: 50, height: 100 }),
    }
  ),
  'layout-front-right-pillar': preset(
    'layout-front-right-pillar',
    'Front + Right Pillar',
    '8:3',
    {
      front: camera(true, { x: 0, y: 0, width: 50, height: 100 }),
      back: camera(false, { x: 0, y: 0, width: 50, height: 50 }),
      left_repeater: camera(false, { x: 0, y: 50, width: 50, height: 50 }),
      right_repeater: camera(false, { x: 50, y: 0, width: 50, height: 100 }),
      right_pillar: camera(true, { x: 50, y: 0, width: 50, height: 100 }),
    }
  ),
  'layout-focus': preset('layout-focus', 'Focus Mode', '4:3', {
    front: camera(true, { x: 0, y: 0, width: 100, height: 100 }),
    back: camera(false, { x: 0, y: 0, width: 100, height: 100 }),
    left_repeater: camera(false, { x: 0, y: 0, width: 100, height: 100 }),
    right_repeater: camera(false, { x: 0, y: 0, width: 100, height: 100 }),
  }),
};

function defaultDisabledCamera(): LayoutCameraConfig {
  return camera(false, { x: 0, y: 0, width: 50, height: 50 });
}

function cloneConfig(config: LayoutConfigSchema): LayoutConfigSchema {
  return JSON.parse(JSON.stringify(config));
}

export class LayoutConfig {
  static VERSION = VERSION;
  static CAMERAS = CAMERAS;
  static CAMERA_NAMES = CAMERA_NAMES;
  static ASPECT_RATIOS = ASPECT_RATIOS;

  /**
   * Convert a built-in preset name to a complete, editable config (a fresh copy).
   * Cameras the preset does not define are added as disabled so every preset
   * has a full camera set; otherwise their containers skip applyToDOM styling.
   */
  static presetToConfig(presetName: string): LayoutConfigSchema | null {
    if (!Object.prototype.hasOwnProperty.call(PRESETS, presetName)) {
      return null;
    }

    const fullConfig = cloneConfig(PRESETS[presetName]);
    const cameras = fullConfig.cameras ?? {};
    for (const cam of CAMERAS) {
      cameras[cam] ??= defaultDisabledCamera();
    }
    fullConfig.cameras = cameras;

    const now = new Date().toISOString();
    fullConfig.created = now;
    fullConfig.modified = now;

    return fullConfig;
  }
}

export default LayoutConfig;
