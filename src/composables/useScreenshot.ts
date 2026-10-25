/**
 * useScreenshot - Composable and engine for capturing and exporting video screenshots
 */

import dayjs from 'dayjs';
import { ref, type Ref } from 'vue';
import { LayoutConfig } from '../layout/layoutConfig';
import LayoutRenderer from '../layout/layoutRenderer';
import { layoutStore } from './useLayout';
import { videoPlayer, type VideoPlayer } from './usePlayback';
import { settingsStore } from './useSettings';

export interface ScreenshotOptions {
  includeTimestamp?: boolean;
  quality?: number;
}

export class ScreenshotCapture {
  constructor(private videoPlayer: VideoPlayer) {}

  private async canvasToBlob(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    mimeType: string,
    quality: number
  ): Promise<Blob> {
    try {
      if ('convertToBlob' in canvas) {
        return await canvas.convertToBlob({ type: mimeType, quality });
      }
      return await new Promise<Blob>((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob from canvas'));
          },
          mimeType,
          quality
        );
      });
    } catch (err: unknown) {
      console.error('[Screenshot] Canvas export error:', err);
      if ((err as Error)?.name === 'SecurityError') {
        const msg =
          'Screenshot blocked by browser security (CORS): The video stream from this remote host does not allow pixel extraction.';
        alert(msg);
      }
      throw err;
    }
  }

  async captureComposite(options?: ScreenshotOptions): Promise<void> {
    const { includeTimestamp = true, quality = 0.95 } = options || {};

    const videos = this.videoPlayer.videos as Record<string, HTMLVideoElement>;
    const hasVideo = Object.values(videos).some((v) => v && v.src);
    if (!hasVideo) {
      throw new Error('No video loaded');
    }

    const firstVideo = Object.values(videos).find(
      (v) => v && v.src && v.videoWidth
    );
    const videoWidth = firstVideo?.videoWidth || 1280;
    const videoHeight = firstVideo?.videoHeight || 960;

    const renderer = new LayoutRenderer();
    const config =
      layoutStore.currentConfig || LayoutConfig.presetToConfig('layout-6-3');
    const visibleCameras = layoutStore.visibleCameras;

    const exportConfig = renderer.calculateExportConfig(
      config,
      videoWidth,
      videoHeight,
      { visibleCameras }
    );

    const width = exportConfig.canvasWidth;
    const height = exportConfig.canvasHeight;
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), { width, height });

    const ctx = canvas.getContext('2d') as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

    renderer.renderToCanvas(
      ctx as CanvasRenderingContext2D,
      exportConfig,
      videos
    );

    const labelScale = width / 1920;
    const scaledFontSize = Math.round(18 * labelScale);
    renderer.addLabelsToCanvas(ctx as CanvasRenderingContext2D, exportConfig, {
      fontSize: scaledFontSize,
      videos,
    });

    const settings = settingsStore;
    const privacyMode = settings && settings.get('privacyModeExport') === true;

    if (includeTimestamp && !privacyMode) {
      this.addTimestampOverlay(ctx as CanvasRenderingContext2D, width, height);
    }

    const mimeType = 'image/jpeg';
    const blob = await this.canvasToBlob(canvas, mimeType, quality);
    const timestamp = this.getFormattedTimestamp();
    const extension = 'jpg';
    this.downloadBlob(blob, `TeslaCam_${timestamp}.${extension}`);
  }

  async captureSingle(
    camera: string,
    options: ScreenshotOptions = {}
  ): Promise<void> {
    const { includeTimestamp = true, quality = 0.95 } = options;

    const video = this.videoPlayer.videos[camera];
    if (!video || !video.src) {
      throw new Error(`No video loaded for ${camera}`);
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 960;
    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), { width, height });

    const ctx = canvas.getContext('2d') as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

    ctx.drawImage(video, 0, 0, width, height);

    this.addCameraLabel(
      ctx as CanvasRenderingContext2D,
      camera.replace('_', ' ').toUpperCase(),
      10,
      30
    );

    const settings = settingsStore;
    const privacyMode = settings && settings.get('privacyModeExport') === true;
    if (includeTimestamp && !privacyMode) {
      this.addTimestampOverlay(ctx as CanvasRenderingContext2D, width, height);
    }

    const mimeType = 'image/png';
    const blob = await this.canvasToBlob(canvas, mimeType, quality);
    const timestamp = this.getFormattedTimestamp();
    const extension = 'png';
    const cameraName = camera.replace('_', '-');
    this.downloadBlob(blob, `TeslaCam_${cameraName}_${timestamp}.${extension}`);
  }

  addCameraLabel(
    ctx: CanvasRenderingContext2D,
    label: string,
    x: number,
    y: number
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 5, y - 20, label.length * 12, 28);

    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x, y);
  }

  addTimestampOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const event = this.videoPlayer.currentEvent;
    if (!event) return;

    const currentTime = this.videoPlayer.currentTime;
    const clipIndex = this.videoPlayer.currentClipIndex;
    const eventDate = new Date(event.timestamp);
    const dateStr = eventDate.toLocaleDateString();
    const timeStr = eventDate.toLocaleTimeString();
    const positionStr = this.formatTime(currentTime);

    const overlayText = `${event.type || 'TeslaCam'} | ${dateStr} ${timeStr} | Clip ${clipIndex + 1} | ${positionStr}`;

    const metadata = event.metadata;
    if (metadata?.city || metadata?.street) {
      const location = [metadata.street, metadata.city]
        .filter(Boolean)
        .join(', ');
      this.addOverlayBar(ctx, width, height, overlayText, location);
    } else {
      this.addOverlayBar(ctx, width, height, overlayText);
    }
  }

  addOverlayBar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    line1: string,
    line2: string | null = null
  ): void {
    const barHeight = line2 ? 60 : 40;
    const y = height - barHeight;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, y, width, barHeight);

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    if (line2) {
      ctx.fillText(line1, width / 2, y + 22);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#e0e0e0';
      ctx.fillText(line2, width / 2, y + 42);
    } else {
      ctx.fillText(line1, width / 2, y + 25);
    }

    ctx.textAlign = 'left';
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getFormattedTimestamp(): string {
    const event = this.videoPlayer.currentEvent;

    if (event?.timestamp) {
      const eventDate = new Date(event.timestamp);
      return dayjs(eventDate).format('YYYY-MM-DDTHH-mm-ss');
    }

    return dayjs().format('YYYY-MM-DDTHH-mm-ss');
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

export const screenshotCapture = new ScreenshotCapture(videoPlayer);

export function useScreenshot() {
  const isCapturing: Ref<boolean> = ref(false);

  async function captureComposite(options?: ScreenshotOptions): Promise<void> {
    isCapturing.value = true;
    try {
      await screenshotCapture.captureComposite(options);
    } finally {
      isCapturing.value = false;
    }
  }

  async function captureSingle(
    camera: string,
    options?: ScreenshotOptions
  ): Promise<void> {
    isCapturing.value = true;
    try {
      await screenshotCapture.captureSingle(camera, options);
    } finally {
      isCapturing.value = false;
    }
  }

  return {
    isCapturing,
    captureComposite,
    captureSingle,
    capture: captureComposite,
    screenshotCapture,
  };
}

export default useScreenshot;
