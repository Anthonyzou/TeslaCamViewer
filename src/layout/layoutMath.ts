/**
 * layoutMath - Pure geometry and coordinate calculation utilities for camera layouts.
 * Decoupled from direct DOM manipulation for use in Canvas export, screenshot capture,
 * and declarative Vue grid styling.
 */
import { LayoutConfig } from './layoutConfig';
import type { LayoutConfigSchema } from '../types';

export interface DrawParams {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export interface VideoDimensions {
  videoWidth?: number;
  videoHeight?: number;
  width?: number;
  height?: number;
}

export interface CameraCrop {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface CameraConfigLike {
  x: number;
  y: number;
  w: number;
  h: number;
  crop?: CameraCrop;
  objectFit?: 'fill' | 'contain' | 'cover';
  zIndex?: number;
  visible?: boolean;
}

/**
 * Calculate source and destination rectangles for video canvas rendering.
 * Pure math function handling crop and objectFit ('contain', 'cover', 'fill').
 */
export function calculateDrawParams(
  video: VideoDimensions,
  camConfig: CameraConfigLike
): DrawParams {
  const crop = camConfig.crop || { top: 0, right: 0, bottom: 0, left: 0 };
  const vw = video.videoWidth || video.width || 1280;
  const vh = video.videoHeight || video.height || 960;

  // Calculate source rectangle (after crop)
  const cropLeft = crop.left ?? 0;
  const cropRight = crop.right ?? 0;
  const cropTop = crop.top ?? 0;
  const cropBottom = crop.bottom ?? 0;

  let sx = vw * (cropLeft / 100);
  let sy = vh * (cropTop / 100);
  let sw = vw * ((100 - cropLeft - cropRight) / 100);
  let sh = vh * ((100 - cropTop - cropBottom) / 100);

  // Calculate destination rectangle
  let dx = camConfig.x;
  let dy = camConfig.y;
  let dw = camConfig.w;
  let dh = camConfig.h;

  const objectFit = camConfig.objectFit || 'fill';

  if (objectFit === 'contain') {
    // Contain: Maintain aspect ratio, letterbox / pillarbox within bounds
    const sourceAR = sw / sh;
    const destAR = dw / dh;

    if (sourceAR > destAR) {
      // Source is wider, letterbox top/bottom
      const newH = dw / sourceAR;
      dy += (dh - newH) / 2;
      dh = newH;
    } else {
      // Source is taller, pillarbox left/right
      const newW = dh * sourceAR;
      dx += (dw - newW) / 2;
      dw = newW;
    }
  } else if (objectFit === 'cover') {
    // Cover: Maintain aspect ratio, crop source to fill destination
    const sourceAR = sw / sh;
    const destAR = dw / dh;

    if (sourceAR > destAR) {
      // Source is wider - crop sides
      const newSW = sh * destAR;
      const cropX = (sw - newSW) / 2;
      sx += cropX;
      sw = newSW;
    } else {
      // Source is taller - crop top/bottom
      const newSH = sw / destAR;
      const cropY = (sh - newSH) / 2;
      sy += cropY;
      sh = newSH;
    }
  }

  return { sx, sy, sw, sh, dx, dy, dw, dh };
}

/**
 * Calculate contain dimensions to fit within container boundaries preserving aspect ratio.
 */
export function calculateContainSize(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number
): { width: number; height: number } {
  if (containerHeight <= 0 || aspectRatio <= 0) {
    return { width: containerWidth, height: containerHeight };
  }
  const containerAR = containerWidth / containerHeight;

  let width: number;
  let height: number;
  if (containerAR > aspectRatio) {
    height = containerHeight;
    width = height * aspectRatio;
  } else {
    width = containerWidth;
    height = width / aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Calculate canvas size and pixel layout for export / screenshot pipelines.
 */
export function calculateExportConfig(
  config: LayoutConfigSchema | Record<string, any>,
  videoWidth: number,
  videoHeight: number,
  options: { visibleCameras?: Record<string, boolean> | null } = {}
) {
  const visibleCameras = options.visibleCameras || null;
  const aspectRatio = config.canvas?.aspectRatio || '4:3';
  const arParts = LayoutConfig.ASPECT_RATIOS[aspectRatio] || {
    width: 4,
    height: 3,
  };

  const layoutAR = arParts.width / arParts.height;

  let canvasWidth: number;
  let canvasHeight: number;

  if (aspectRatio === '4:3') {
    canvasWidth = videoWidth * 2;
    canvasHeight = videoHeight * 2;
  } else if (aspectRatio === '6:3' || aspectRatio === '16:9') {
    canvasWidth = Math.round(videoWidth * 3);
    canvasHeight = Math.round((videoWidth * 3) / layoutAR);
  } else if (aspectRatio === '8:3') {
    canvasWidth = videoWidth * 2;
    canvasHeight = Math.round((videoWidth * 2) / layoutAR);
  } else if (aspectRatio === '12:3') {
    canvasWidth = videoWidth * 3;
    canvasHeight = Math.round((videoWidth * 3) / layoutAR);
  } else if (aspectRatio === '21:9') {
    canvasWidth = Math.round(videoWidth * 2.5);
    canvasHeight = Math.round((videoWidth * 2.5) / layoutAR);
  } else {
    canvasWidth = videoWidth * 2;
    canvasHeight = Math.round(canvasWidth / layoutAR);
  }

  const cameras: Record<string, CameraConfigLike> = {};
  for (const camName of LayoutConfig.CAMERAS) {
    const camConfig = config.cameras?.[camName];
    if (!camConfig) continue;

    const pos = camConfig.position;
    const userHidden = visibleCameras && visibleCameras[camName] === false;
    cameras[camName] = {
      x: Math.round(canvasWidth * (pos.x / 100)),
      y: Math.round(canvasHeight * (pos.y / 100)),
      w: Math.round(canvasWidth * (pos.width / 100)),
      h: Math.round(canvasHeight * (pos.height / 100)),
      visible: camConfig.enabled && !userHidden,
      zIndex: camConfig.zIndex || 1,
      objectFit: camConfig.objectFit || 'contain',
      crop: camConfig.crop || { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }

  return {
    width: canvasWidth,
    height: canvasHeight,
    aspectRatio,
    backgroundColor: config.canvas?.backgroundColor || '#000000',
    cameras,
  };
}
