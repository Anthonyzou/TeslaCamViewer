/**
 * LayoutRenderer - Unified canvas rendering engine for camera layouts
 * Single source of truth for canvas export and screenshot generation.
 * DOM rendering is declaratively managed by VideoGrid.vue.
 */
import type { LayoutConfigSchema } from '../types';
import { LayoutConfig } from './layoutConfig';
import {
  calculateContainSize,
  calculateDrawParams,
  calculateExportConfig,
  type CameraConfigLike,
  type VideoDimensions,
} from './layoutMath';

export class LayoutRenderer {
  [key: string]: any;

  constructor() {}

  /**
   * Calculate draw parameters for rendering a video to canvas
   * This is the SINGLE SOURCE OF TRUTH for crop/objectFit calculations
   * All rendering paths should use this method for consistency
   *
   * @param {HTMLVideoElement|Object} video - The video element or dimensions
   * @param {Object} camConfig - Camera configuration { x, y, w, h, crop, objectFit }
   * @returns {Object} { sx, sy, sw, sh, dx, dy, dw, dh } - Source and destination rectangles
   */
  static calculateDrawParams(
    video: VideoDimensions,
    camConfig: CameraConfigLike
  ) {
    return calculateDrawParams(video, camConfig);
  }

  /**
   * Calculate "contain" dimensions - fit within container while maintaining aspect ratio
   * @param {HTMLElement} container - Parent container
   * @param {number} aspectRatio - Width/height ratio (e.g., 1.333 for 4:3)
   * @returns {{ width: number, height: number }}
   */
  calculateContainSize(container: HTMLElement, aspectRatio: number) {
    return calculateContainSize(
      container.clientWidth,
      container.clientHeight,
      aspectRatio
    );
  }

  /**
   * Apply layout config to DOM (now handled declaratively by VideoGrid.vue)
   */
  applyToDOM(
    _videoGrid?: HTMLElement | null,
    _config?: any,
    _options: any = {}
  ) {}

  /**
   * Reset DOM layout styles (now handled declaratively by VideoGrid.vue)
   */
  resetDOM(_videoGrid?: HTMLElement | null) {}

  /**
   * Calculate pixel positions for canvas rendering
   * @param {Object} config - LayoutConfig object
   * @param {number} videoWidth - Native video width
   * @param {number} videoHeight - Native video height
   * @returns {Object} Export config with pixel positions
   */
  calculateExportConfig(
    config: LayoutConfigSchema | Record<string, any>,
    videoWidth: number,
    videoHeight: number,
    options: { visibleCameras?: Record<string, boolean> | null } = {}
  ) {
    const result = calculateExportConfig(
      config,
      videoWidth,
      videoHeight,
      options
    );
    return {
      canvasWidth: result.width,
      canvasHeight: result.height,
      aspectRatio: result.aspectRatio,
      cameras: result.cameras,
    };
  }

  /**
   * Render videos to canvas using layout config
   * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} exportConfig - Result from calculateExportConfig
   * @param {Object} videos - { front: HTMLVideoElement|CanvasImageSource, back: ..., etc }
   * @param {Object} options - { fillEnded: boolean }
   */
  renderToCanvas(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    exportConfig:
      | {
          canvasWidth: number;
          canvasHeight: number;
          cameras: Record<string, CameraConfigLike>;
        }
      | any,
    videos: Record<string, any>,
    options: { fillEnded?: boolean } = {}
  ) {
    const { canvasWidth, canvasHeight, cameras } = exportConfig;

    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Sort cameras by z-index for proper layering
    const sortedCameras = Object.entries(cameras as Record<string, any>)
      .filter(
        ([_name, cam]: [string, any]) => cam.visible && cam.w > 0 && cam.h > 0
      )
      .sort((a: any, b: any) => a[1].zIndex - b[1].zIndex);

    // Draw each camera
    for (const [camName, camConfig] of sortedCameras as [string, any][]) {
      const video = videos[camName];
      if (!video) continue;

      // Check if video has ended
      const hasEnded =
        Boolean(video.ended) ||
        (typeof video.currentTime === 'number' &&
          video.duration &&
          video.paused &&
          video.currentTime >= video.duration - 0.1);

      if (hasEnded && options.fillEnded) {
        // Draw black rectangle for ended video
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(camConfig.x, camConfig.y, camConfig.w, camConfig.h);
        continue;
      }

      // Use centralized calculation for source/destination rectangles
      const { sx, sy, sw, sh, dx, dy, dw, dh } =
        LayoutRenderer.calculateDrawParams(video, camConfig);

      try {
        ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
      } catch (_e) {
        // Video not ready, draw placeholder
        ctx.fillStyle = '#333333';
        ctx.fillRect(camConfig.x, camConfig.y, camConfig.w, camConfig.h);
      }
    }
  }

  /**
   * Add camera labels to canvas with smart positioning to avoid occlusion
   * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} exportConfig - Export configuration with cameras
   * @param {Object} options - Options: fontSize, cameraMapping, videos
   */
  addLabelsToCanvas(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    exportConfig: any,
    options: any = {}
  ) {
    const cameras = exportConfig.cameras as Record<string, any>;
    const fontSize = options.fontSize || 14;
    const cameraMapping = options.cameraMapping || null;
    const videos = options.videos || null;

    // CSS-matching styling
    const paddingX = Math.round(fontSize * 0.85); // ~0.75rem horizontal
    const paddingY = Math.round(fontSize * 0.35); // ~0.3rem vertical
    const borderRadius = 4;
    const letterSpacing = fontSize * 0.05; // 0.05em

    // Use monospace font to match CSS --font-mono
    ctx.font = `500 ${fontSize}px 'JetBrains Mono', 'Fira Code', monospace`;
    ctx.textBaseline = 'top';

    // Sort cameras by z-index
    const sortedCameras = Object.entries(cameras)
      .filter(([name, cam]: [string, any]) => {
        if (!cam.visible || cam.w <= 0 || cam.h <= 0) return false;
        // If videos provided, check if this camera actually has a video source
        if (videos) {
          const actualCamera = cameraMapping
            ? cameraMapping[name] || name
            : name;
          const video = videos[actualCamera];
          return Boolean(video);
        }
        return true;
      })
      .sort((a: any, b: any) => (a[1].zIndex || 1) - (b[1].zIndex || 1));

    // Get all camera rects with z-index for occlusion checking
    const cameraRects = sortedCameras.map(([name, cam]: [string, any]) => ({
      name,
      x: cam.x,
      y: cam.y,
      w: cam.w,
      h: cam.h,
      zIndex: cam.zIndex || 1,
    }));

    // Label name mapping (uppercase to match live view CSS)
    const labelMap = {
      front: 'FRONT',
      back: 'BACK',
      left_repeater: 'LEFT',
      right_repeater: 'RIGHT',
      left_pillar: 'LEFT PILLAR',
      right_pillar: 'RIGHT PILLAR',
    };

    for (const [camName, camConfig] of sortedCameras) {
      // Use mapping to get the actual camera shown in this position
      const actualCamera = cameraMapping
        ? cameraMapping[camName] || camName
        : camName;
      const label = labelMap[actualCamera] || actualCamera.toUpperCase();

      // Check if video has ended (for visual feedback)
      const video = videos ? videos[actualCamera] : null;
      const isEnded = video && video.ended;

      // Measure text with letter spacing
      const metrics = ctx.measureText(label);
      const textWidth = metrics.width + (label.length - 1) * letterSpacing;
      const labelWidth = textWidth + paddingX * 2;
      const labelHeight = fontSize + paddingY * 2;
      const myZIndex = camConfig.zIndex || 1;
      const offset = 10;

      // Get canvas dimensions for bounds clamping
      const canvasWidth = ctx.canvas.width;
      const canvasHeight = ctx.canvas.height;

      // Calculate the VISIBLE portion of this camera (clamped to canvas bounds)
      const visibleX = Math.max(0, camConfig.x);
      const visibleY = Math.max(0, camConfig.y);
      const visibleRight = Math.min(canvasWidth, camConfig.x + camConfig.w);
      const visibleBottom = Math.min(canvasHeight, camConfig.y + camConfig.h);
      const visibleW = visibleRight - visibleX;
      const visibleH = visibleBottom - visibleY;

      // Skip if camera has no visible area
      if (visibleW <= 0 || visibleH <= 0) continue;

      // Try positions: top-left, top-right, bottom-left, bottom-right
      const positions = [
        { x: visibleX + offset, y: visibleY + offset, name: 'top-left' },
        {
          x: visibleRight - labelWidth - offset,
          y: visibleY + offset,
          name: 'top-right',
        },
        {
          x: visibleX + offset,
          y: visibleBottom - labelHeight - offset,
          name: 'bottom-left',
        },
        {
          x: visibleRight - labelWidth - offset,
          y: visibleBottom - labelHeight - offset,
          name: 'bottom-right',
        },
      ];

      // Find the lowest point of higher z-index cameras that overlap this camera
      let occlusionBottom = visibleY;
      for (const cam of cameraRects) {
        if (cam.name === camName) continue;
        if ((cam.zIndex || 1) <= myZIndex) continue;

        if (cam.x < visibleRight && cam.x + cam.w > visibleX) {
          const camBottom = cam.y + cam.h;
          if (camBottom > occlusionBottom && cam.y < visibleBottom) {
            occlusionBottom = Math.min(camBottom, visibleBottom);
          }
        }
      }

      // Calculate the non-occluded visible area
      const nonOccludedTop = Math.max(visibleY, occlusionBottom);
      const nonOccludedHeight = visibleBottom - nonOccludedTop;

      let bestPos;
      if (
        nonOccludedHeight >= labelHeight + offset * 2 &&
        nonOccludedTop > visibleY
      ) {
        bestPos = {
          x: visibleX + offset,
          y: nonOccludedTop + offset,
          name: 'non-occluded-top-left',
        };
      } else {
        bestPos = positions[0];
        for (const pos of positions) {
          const labelRect = {
            x: pos.x,
            y: pos.y,
            w: labelWidth,
            h: labelHeight,
          };

          let isOccluded = false;
          for (const cam of cameraRects) {
            if (cam.name === camName) continue;
            if ((cam.zIndex || 1) <= myZIndex) continue;

            if (
              labelRect.x < cam.x + cam.w &&
              labelRect.x + labelRect.w > cam.x &&
              labelRect.y < cam.y + cam.h &&
              labelRect.y + labelRect.h > cam.y
            ) {
              isOccluded = true;
              break;
            }
          }

          if (!isOccluded) {
            bestPos = pos;
            break;
          }
        }
      }

      // Draw rounded rectangle background matching CSS --glass
      const bgX = bestPos.x;
      const bgY = bestPos.y;

      ctx.beginPath();
      ctx.roundRect(bgX, bgY, labelWidth, labelHeight, borderRadius);

      if (isEnded) {
        ctx.fillStyle = 'rgba(255, 59, 59, 0.85)';
      } else {
        ctx.fillStyle = 'rgba(15, 18, 24, 0.85)';
      }
      ctx.fill();

      // Draw border matching CSS --glass-border
      ctx.strokeStyle = isEnded
        ? 'rgba(255, 59, 59, 0.5)'
        : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw text with letter spacing
      ctx.fillStyle = '#e8eaed'; // CSS --text-primary
      this.drawTextWithLetterSpacing(
        ctx,
        label,
        bgX + paddingX,
        bgY + paddingY,
        letterSpacing
      );
    }
  }

  /**
   * Draw text with letter spacing (canvas doesn't support letter-spacing natively)
   */
  drawTextWithLetterSpacing(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    spacing: number
  ) {
    let currentX = x;
    Array.from(text).forEach((char) => {
      ctx.fillText(char, currentX, y);
      const charWidth = ctx.measureText(char).width;
      currentX += charWidth + spacing;
    });
  }

  /**
   * Create a preview element for the layout editor
   */
  createPreviewElement(config: any, width = 400, _height = 300) {
    const container = document.createElement('div');
    container.className = 'layout-preview';
    container.style.cssText = `
            position: relative;
            width: ${width}px;
            background: #1a1a1a;
            border: 1px solid var(--border);
            border-radius: 4px;
            overflow: hidden;
        `;

    const aspectRatio = config.canvas?.aspectRatio || '4:3';
    const arParts = LayoutConfig.ASPECT_RATIOS[aspectRatio] || {
      width: 4,
      height: 3,
    };
    container.style.aspectRatio = `${arParts.width} / ${arParts.height}`;

    for (const camName of LayoutConfig.CAMERAS) {
      const camConfig = config.cameras?.[camName];
      if (!camConfig || !camConfig.enabled) continue;

      const pos = camConfig.position;
      const placeholder = document.createElement('div');
      placeholder.className = 'layout-preview-camera';
      placeholder.dataset.camera = camName;
      placeholder.style.cssText = `
                position: absolute;
                left: ${pos.x}%;
                top: ${pos.y}%;
                width: ${pos.width}%;
                height: ${pos.height}%;
                background: var(--bg-tertiary);
                border: 2px solid var(--border);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: var(--text-secondary);
                z-index: ${camConfig.zIndex || 1};
                cursor: move;
                user-select: none;
                box-sizing: border-box;
            `;

      const crop = camConfig.crop || { top: 0, right: 0, bottom: 0, left: 0 };
      if (crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0) {
        placeholder.style.clipPath = `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`;
      }

      placeholder.textContent =
        LayoutConfig.CAMERA_SHORT_NAMES[camName] || camName;

      container.appendChild(placeholder);
    }

    return container;
  }

  /**
   * Get visible cameras count from config
   */
  getVisibleCameraCount(config: any) {
    if (!config?.cameras) return 0;
    return Object.values(config.cameras as Record<string, any>).filter(
      (c: any) => c.enabled
    ).length;
  }

  /**
   * Get enabled cameras list
   */
  getEnabledCameras(config: any) {
    if (!config?.cameras) return [];
    return Object.entries(config.cameras as Record<string, any>)
      .filter(([_name, cam]: [string, any]) => cam.enabled)
      .map(([name]) => name);
  }
}

export default LayoutRenderer;
