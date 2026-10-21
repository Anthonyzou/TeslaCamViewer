/**
 * LayoutConfig - Configuration schema, validation, and preset conversion
 * Defines the structure for custom camera layouts
 */

export class LayoutConfig {
  static VERSION = 1;

  // All supported cameras (current + future)
  static CAMERAS = [
    'front',
    'back',
    'left_repeater',
    'right_repeater',
    'left_pillar',
    'right_pillar',
    'interior',
  ];

  // Currently available cameras (Tesla's current setup - 4 or 6 cameras)
  static CURRENT_CAMERAS = ['front', 'back', 'left_repeater', 'right_repeater'];
  static PILLAR_CAMERAS = ['left_pillar', 'right_pillar'];
  static SIX_CAMERA_SET = [
    'front',
    'back',
    'left_repeater',
    'right_repeater',
    'left_pillar',
    'right_pillar',
  ];

  // Future cameras (not yet available from Tesla)
  static FUTURE_CAMERAS = ['interior'];

  // Camera display names
  static CAMERA_NAMES = {
    front: 'Front',
    back: 'Back',
    left_repeater: 'Left Repeater',
    right_repeater: 'Right Repeater',
    left_pillar: 'Left Pillar',
    right_pillar: 'Right Pillar',
    interior: 'Interior',
  };

  // Short names for UI
  static CAMERA_SHORT_NAMES = {
    front: 'Front',
    back: 'Back',
    left_repeater: 'L.Rep',
    right_repeater: 'R.Rep',
    left_pillar: 'L.Pil',
    right_pillar: 'R.Pil',
    interior: 'Int',
  };

  // Supported canvas aspect ratios
  static ASPECT_RATIOS = {
    '4:3': { width: 4, height: 3 },
    '16:9': { width: 16, height: 9 },
    '6:3': { width: 6, height: 3 },
    '8:3': { width: 8, height: 3 },
    '12:3': { width: 12, height: 3 },
    '21:9': { width: 21, height: 9 },
  };

  /**
   * Create a default camera configuration
   */
  static getDefaultCamera(enabled = true) {
    const def = this.getDefault().cameras.front;
    def.enabled = enabled;
    return def;
  }

  /**
   * Create a default layout configuration (2x2 grid)
   */
  static getDefault() {
    return {
      version: this.VERSION,
      id: `custom-${Date.now()}`,
      name: 'New Layout',
      author: '',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      canvas: {
        aspectRatio: '4:3',
        backgroundColor: '#000000',
      },
      cameras: {
        front: {
          enabled: true,
          position: { x: 0, y: 0, width: 50, height: 50 },
          zIndex: 1,
          aspectRatio: 'auto',
          objectFit: 'contain',
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        back: {
          enabled: true,
          position: { x: 50, y: 0, width: 50, height: 50 },
          zIndex: 1,
          aspectRatio: 'auto',
          objectFit: 'contain',
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        left_repeater: {
          enabled: true,
          position: { x: 0, y: 50, width: 50, height: 50 },
          zIndex: 1,
          aspectRatio: 'auto',
          objectFit: 'contain',
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        right_repeater: {
          enabled: true,
          position: { x: 50, y: 50, width: 50, height: 50 },
          zIndex: 1,
          aspectRatio: 'auto',
          objectFit: 'contain',
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        left_pillar: {
          enabled: false,
          position: { x: 0, y: 0, width: 25, height: 25 },
          zIndex: 1,
          aspectRatio: 'auto',
          objectFit: 'contain',
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        right_pillar: {
          enabled: false,
          position: { x: 75, y: 0, width: 25, height: 25 },
          zIndex: 1,
          aspectRatio: 'auto',
          objectFit: 'contain',
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
        },
        interior: {
          enabled: false,
          position: { x: 37.5, y: 37.5, width: 25, height: 25 },
          zIndex: 10,
          aspectRatio: 'auto',
          objectFit: 'contain',
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      },
    };
  }

  /**
   * Deep clone a config object
   */
  static clone(config) {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * Convert a preset layout name to a config object
   * Used for editing built-in presets (creates a clone)
   */
  static presetToConfig(presetName) {
    const presets = {
      'grid-2x2': {
        version: 1,
        id: 'preset-grid-2x2',
        name: '2x2 Grid',
        author: 'Built-in',
        canvas: { aspectRatio: '4:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 0, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: true,
            position: { x: 50, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_repeater: {
            enabled: true,
            position: { x: 0, y: 50, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: true,
            position: { x: 50, y: 50, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-6-3': {
        version: 1,
        id: 'preset-layout-6-3',
        name: '6:3 Centered',
        author: 'Built-in',
        canvas: { aspectRatio: '6:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 29, y: 0, width: 42, height: 57.4 },
            zIndex: 11,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 5, left: 0 },
          },
          back: {
            enabled: true,
            position: { x: 30.9, y: 54.3, width: 37.6, height: 54.4 },
            zIndex: 10,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 17, left: 0 },
          },
          left_repeater: {
            enabled: true,
            position: { x: 67, y: 51.8, width: 33, height: 48.2 },
            zIndex: 3,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: true,
            position: { x: 0, y: 52, width: 33, height: 48 },
            zIndex: 3,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_pillar: {
            enabled: true,
            position: { x: 0, y: 0, width: 33, height: 50 },
            zIndex: 10,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_pillar: {
            enabled: true,
            position: { x: 67, y: 0, width: 33, height: 50 },
            zIndex: 10,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-4-3': {
        version: 1,
        id: 'preset-layout-4-3',
        name: '4:3 Main',
        author: 'Built-in',
        canvas: { aspectRatio: '4:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 15, y: 18, width: 70, height: 50 },
            zIndex: 13,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: true,
            position: { x: 35, y: 0, width: 30, height: 25 },
            zIndex: 15,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 15, left: 0 },
          },
          left_repeater: {
            enabled: true,
            position: { x: 55, y: 60, width: 45, height: 40 },
            zIndex: 10,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: true,
            position: { x: 0, y: 60, width: 45, height: 40 },
            zIndex: 10,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_pillar: {
            enabled: true,
            position: { x: 0, y: 0, width: 22, height: 28 },
            zIndex: 12,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_pillar: {
            enabled: true,
            position: { x: 78, y: 0, width: 22, height: 28 },
            zIndex: 12,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-all-16-9': {
        version: 1,
        id: 'preset-layout-all-16-9',
        name: 'All 16:9',
        author: 'Built-in',
        canvas: { aspectRatio: '16:9', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 25, y: 0, width: 49.57, height: 62.06 },
            zIndex: 20,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: true,
            position: { x: 30, y: 58, width: 40, height: 50 },
            zIndex: 19,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 16, left: 0 },
          },
          left_repeater: {
            enabled: true,
            position: { x: 70, y: 59, width: 30, height: 41 },
            zIndex: 10,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: true,
            position: { x: 0, y: 59, width: 30, height: 41 },
            zIndex: 10,
            aspectRatio: 'auto',
            objectFit: 'cover',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_pillar: {
            enabled: true,
            position: { x: 0, y: 9.76, width: 25.43, height: 34.33 },
            zIndex: 15,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_pillar: {
            enabled: true,
            position: { x: 74.57, y: 9.76, width: 25, height: 34.33 },
            zIndex: 15,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-front-left': {
        version: 1,
        id: 'preset-layout-front-left',
        name: 'Front + Left',
        author: 'Built-in',
        canvas: { aspectRatio: '8:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 50, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: false,
            position: { x: 0, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_repeater: {
            enabled: true,
            position: { x: 0, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: false,
            position: { x: 50, y: 50, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-front-right': {
        version: 1,
        id: 'preset-layout-front-right',
        name: 'Front + Right',
        author: 'Built-in',
        canvas: { aspectRatio: '8:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 0, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: false,
            position: { x: 0, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_repeater: {
            enabled: false,
            position: { x: 0, y: 50, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: true,
            position: { x: 50, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-front-repeaters': {
        version: 1,
        id: 'preset-layout-front-repeaters',
        name: 'Front + Repeaters',
        author: 'Built-in',
        canvas: { aspectRatio: '12:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 33.33, y: 0, width: 33.34, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: false,
            position: { x: 0, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_repeater: {
            enabled: true,
            position: { x: 0, y: 0, width: 33.33, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: true,
            position: { x: 66.67, y: 0, width: 33.33, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-front-pillars': {
        version: 1,
        id: 'preset-layout-front-pillars',
        name: 'Front + Pillars',
        author: 'Built-in',
        canvas: { aspectRatio: '12:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 32.86, y: 0, width: 33.43, height: 100 },
            zIndex: 2,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: false,
            position: { x: 50, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_repeater: {
            enabled: false,
            position: { x: 0, y: 50, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: false,
            position: { x: 50, y: 50, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_pillar: {
            enabled: true,
            position: { x: 0, y: 0, width: 32.86, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_pillar: {
            enabled: true,
            position: { x: 66.29, y: 0, width: 33.71, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-front-left-pillar': {
        version: 1,
        id: 'preset-layout-front-left-pillar',
        name: 'Front + Left Pillar',
        author: 'Built-in',
        canvas: { aspectRatio: '8:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 50, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: false,
            position: { x: 0, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_repeater: {
            enabled: false,
            position: { x: 0, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: false,
            position: { x: 50, y: 50, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_pillar: {
            enabled: true,
            position: { x: 0, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_pillar: {
            enabled: false,
            position: { x: 0, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-front-right-pillar': {
        version: 1,
        id: 'preset-layout-front-right-pillar',
        name: 'Front + Right Pillar',
        author: 'Built-in',
        canvas: { aspectRatio: '8:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 0, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: false,
            position: { x: 0, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_repeater: {
            enabled: false,
            position: { x: 0, y: 50, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: false,
            position: { x: 50, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_pillar: {
            enabled: false,
            position: { x: 0, y: 0, width: 50, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_pillar: {
            enabled: true,
            position: { x: 50, y: 0, width: 50, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      'layout-focus': {
        version: 1,
        id: 'preset-layout-focus',
        name: 'Focus Mode',
        author: 'Built-in',
        canvas: { aspectRatio: '4:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 0, y: 0, width: 100, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: false,
            position: { x: 0, y: 0, width: 100, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_repeater: {
            enabled: false,
            position: { x: 0, y: 0, width: 100, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: false,
            position: { x: 0, y: 0, width: 100, height: 100 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
      // 6-camera layout: pillars on outer top, repeaters (swapped) on outer bottom, front/back center
      'grid-3x2': {
        version: 1,
        id: 'preset-grid-3x2',
        name: '3x2 Grid (6 Cameras)',
        author: 'Built-in',
        canvas: { aspectRatio: '6:3', backgroundColor: '#000000' },
        cameras: {
          front: {
            enabled: true,
            position: { x: 33.33, y: 0, width: 33.34, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          back: {
            enabled: true,
            position: { x: 33.33, y: 50, width: 33.34, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_repeater: {
            enabled: true,
            position: { x: 66.67, y: 50, width: 33.33, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_repeater: {
            enabled: true,
            position: { x: 0, y: 50, width: 33.33, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          left_pillar: {
            enabled: true,
            position: { x: 0, y: 0, width: 33.33, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
          right_pillar: {
            enabled: true,
            position: { x: 66.67, y: 0, width: 33.33, height: 50 },
            zIndex: 1,
            aspectRatio: 'auto',
            objectFit: 'contain',
            crop: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
      },
    };

    const config = presets[presetName];
    if (!config) {
      return null;
    }

    // Add any missing cameras with disabled state so every preset has
    // a complete camera set. Without this, containers for undefined cameras
    // (e.g., pillars in a 4-camera preset) skip applyToDOM styling and
    // render at default CSS size instead of being hidden.
    const fullConfig = this.clone(config);
    for (const cam of this.CAMERAS) {
      if (!fullConfig.cameras[cam]) {
        fullConfig.cameras[cam] = this.getDefaultCamera(false);
      }
    }

    // Add timestamps
    fullConfig.created = new Date().toISOString();
    fullConfig.modified = new Date().toISOString();

    return fullConfig;
  }

  /**
   * Get list of all preset names
   */
  static getPresetNames() {
    return [
      'grid-2x2',
      'grid-3x2',
      'layout-6-3',
      'layout-4-3',
      'layout-all-16-9',
      'layout-front-left',
      'layout-front-right',
      'layout-front-repeaters',
      'layout-front-pillars',
      'layout-front-left-pillar',
      'layout-front-right-pillar',
      'layout-focus',
    ];
  }

  /**
   * Check if a layout name is a built-in preset
   */
  static isPreset(layoutName) {
    return this.getPresetNames().includes(layoutName);
  }
}

// Export default
export default LayoutConfig;
