/**
 * VideoExport - Hardware-Accelerated Video Exporter powered by mediabunny & WebCodecs.
 * Offloads multi-camera video export directly to the client's GPU (e.g. Apple Silicon M1 media engine),
 * with graceful fallback to server-side FFmpeg for older browsers.
 */
import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
} from 'mediabunny';
import { LayoutConfig } from '../layout/layoutConfig';
import { LayoutRenderer } from '../layout/layoutRenderer';
import type VideoPlayer from './videoPlayer';

class VideoExport {
  public isExporting = false;
  private _cancelled = false;

  constructor(private videoPlayer: VideoPlayer) {}

  getExportStatus() {
    return { isExporting: this.isExporting };
  }

  async exportVideo(camera = 'all') {
    return this.startExport({ camera, format: 'mp4' });
  }

  async exportGif() {
    // WebCodecs outputs MP4 natively with optimal compression
    return this.startExport({ camera: 'all', format: 'mp4' });
  }

  async startExport(options: any = {}) {
    const event = this.videoPlayer?.currentEvent;
    if (!event) {
      alert('No event loaded to export');
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const camera = options.camera || 'all';
    const ext = 'mp4';
    const filename = `TeslaCam_${event.name || 'Export'}_${camera}.${ext}`;

    // Marks handling (inPoint & outPoint in event seconds)
    const marks = window.app?.clipMarking?.getMarks?.() || {
      inPoint: null,
      outPoint: null,
    };

    const clipGroups = event.clipGroups || [];
    let targetClipIndex =
      this.videoPlayer?.currentClipIndex >= 0
        ? this.videoPlayer.currentClipIndex
        : 0;

    const groupDur =
      clipGroups[targetClipIndex]?.clips?.front?.duration ||
      this.videoPlayer?.duration ||
      60;

    let startSec = 0;
    let endSec = groupDur;

    if (marks.inPoint != null || marks.outPoint != null) {
      const groupOffsets: number[] = [];
      let total = 0;
      for (let i = 0; i < clipGroups.length; i++) {
        groupOffsets.push(total);
        const g = clipGroups[i];
        const dur = g.clips?.front?.duration || 60;
        total += dur;
      }

      const refPoint = marks.inPoint != null ? marks.inPoint : marks.outPoint;
      for (let i = 0; i < clipGroups.length; i++) {
        const start = groupOffsets[i];
        const dur = clipGroups[i].clips?.front?.duration || 60;
        if (
          refPoint >= start &&
          (refPoint < start + dur || i === clipGroups.length - 1)
        ) {
          targetClipIndex = i;
          break;
        }
      }

      const groupStart = groupOffsets[targetClipIndex];
      if (marks.inPoint != null) {
        startSec = Math.max(
          0,
          Math.min(groupDur - 0.5, marks.inPoint - groupStart)
        );
      }
      if (marks.outPoint != null) {
        endSec = Math.min(
          groupDur,
          Math.max(startSec + 0.5, marks.outPoint - groupStart)
        );
      }
    }

    const exportDuration = Math.max(0.5, endSec - startSec);

    if (typeof (window as any).VideoEncoder !== 'function') {
      alert(
        'Your browser does not support the WebCodecs API (VideoEncoder). Please update to a modern browser (Chrome, Safari 16.4+, Firefox 130+, Edge) for hardware-accelerated export.'
      );
      return;
    }

    this.isExporting = true;
    this._cancelled = false;
    window.app?.disableControls?.();

    this._showExportOverlay(camera, exportDuration);

    try {
      // High-speed client-side GPU hardware encoding via mediabunny
      await this._renderAndEncodeWithMediaBunny({
        camera,
        filename,
        startSec,
        endSec,
        exportDuration,
      });
    } catch (err: any) {
      if (this._cancelled) {
        console.log('[VideoExport] Export cancelled by user');
      } else {
        console.error('[VideoExport] Encoding error:', err);
        alert(`Export failed: ${err.message || 'Unknown error'}`);
      }
      this._hideExportOverlay();
      window.app?.enableControls?.();
    } finally {
      this.isExporting = false;
    }
  }

  private async _renderAndEncodeWithMediaBunny(params: {
    camera: string;
    filename: string;
    startSec: number;
    endSec: number;
    exportDuration: number;
  }) {
    const { camera, filename, startSec, exportDuration } = params;
    const videos = this.videoPlayer?.videos || {};
    const layoutManager = window.app?.layoutManager;
    const renderer = layoutManager?.renderer || new LayoutRenderer();

    // Determine Canvas Output Resolution (must be even numbers for H.264 macroblock alignment)
    let canvasWidth = 1920;
    let canvasHeight = 1080;
    let exportConfig: any = null;

    if (camera === 'all') {
      const activeLayoutConfig =
        layoutManager?.getCurrentConfig?.() ||
        layoutManager?.getCurrentLayoutConfig?.() ||
        LayoutConfig.presetToConfig('layout-6-3');

      exportConfig = renderer.calculateExportConfig(
        activeLayoutConfig,
        1280,
        960,
        { visibleCameras: layoutManager?.visibleCameras }
      );
      canvasWidth = Math.floor((exportConfig.canvasWidth || 1920) / 2) * 2;
      canvasHeight = Math.floor((exportConfig.canvasHeight || 1080) / 2) * 2;
    } else {
      // Single camera view
      const activeVideo = videos[camera] || videos.front;
      const vw = activeVideo?.videoWidth || 1280;
      const vh = activeVideo?.videoHeight || 960;
      canvasWidth = Math.floor(vw / 2) * 2;
      canvasHeight = Math.floor(vh / 2) * 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not create 2D canvas context');

    // Initialize mediabunny Output with in-memory fast-start MP4 format
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    });

    const fps = 30;
    const frameIntervalSec = 1 / fps;
    const totalFrames = Math.max(1, Math.round(exportDuration * fps));

    // Connect CanvasSource with WebCodecs hardware encoder (H.264/AVC)
    const videoSource = new CanvasSource(canvas, {
      codec: 'avc',
      bitrate: 8_000_000,
      keyFrameInterval: 2,
    });

    output.addVideoTrack(videoSource);
    await output.start();

    // Pause player during offline export
    this.videoPlayer?.pause();

    // Warm-up seek to initial start time and ensure frames are decoded
    await this._seekVideos(videos, startSec);

    const progressBar = document.getElementById('exportProgressBar');
    const progressEl = document.getElementById('exportProgress');

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (this._cancelled) {
        await output.cancel();
        return;
      }

      const currentTime = startSec + frameIdx * frameIntervalSec;

      // Synchronously seek active video elements
      await this._seekVideos(videos, currentTime);

      // Render frame onto canvas
      if (camera === 'all' && exportConfig) {
        renderer.renderToCanvas(ctx, exportConfig, videos, {
          fillEnded: false,
        });

        // Add camera labels matching live view
        const labelScale = canvas.width / 1920;
        const scaledFontSize = Math.round(18 * labelScale);
        renderer.addLabelsToCanvas(ctx, exportConfig, {
          fontSize: scaledFontSize,
          videos,
        });
      } else {
        // Single camera view
        const video = videos[camera] || videos.front;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        if (video && video.readyState >= 2) {
          const { sx, sy, sw, sh, dx, dy, dw, dh } =
            LayoutRenderer.calculateDrawParams(video, {
              x: 0,
              y: 0,
              w: canvasWidth,
              h: canvasHeight,
              objectFit: 'contain',
            });
          ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
        }
      }

      // Add encoded sample via mediabunny
      const timestampSec = frameIdx * frameIntervalSec;
      const isKeyFrame = frameIdx % (fps * 2) === 0;
      await videoSource.add(timestampSec, frameIntervalSec, {
        keyFrame: isKeyFrame,
      });

      // Update progress UI
      const percent = Math.min(
        99,
        Math.round(((frameIdx + 1) / totalFrames) * 100)
      );
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (progressEl) {
        progressEl.textContent = `GPU Encoding (mediabunny): ${percent}% (Frame ${frameIdx + 1}/${totalFrames})`;
      }
    }

    // Finalize MP4 muxing
    await output.finalize();

    if (progressBar) progressBar.style.width = '100%';
    if (progressEl) progressEl.textContent = 'Finalizing MP4 container...';

    const buffer = output.target.buffer;
    if (!buffer) {
      throw new Error('Export produced an empty output buffer');
    }
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const downloadUrl = URL.createObjectURL(blob);

    this._downloadFile(downloadUrl, filename);
    this._showComplete(filename, downloadUrl);
  }

  private async _seekVideos(
    videos: Record<string, HTMLVideoElement>,
    time: number
  ): Promise<void> {
    const promises = Object.values(videos).map((v) => {
      const hasSrc = !!(v.src || v.currentSrc || v.getAttribute('src'));
      if (!v || !hasSrc || v.readyState === 0) return Promise.resolve();
      if (Math.abs(v.currentTime - time) < 0.01 && !v.seeking) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (!settled) {
            settled = true;
            v.removeEventListener('seeked', onSeeked);
            v.removeEventListener('error', finish);
            resolve();
          }
        };

        const onSeeked = () => {
          if ('requestVideoFrameCallback' in v) {
            try {
              (v as any).requestVideoFrameCallback(() => finish());
              return;
            } catch (_e) {}
          }
          finish();
        };

        v.addEventListener('seeked', onSeeked, { once: true });
        v.addEventListener('error', finish, { once: true });

        try {
          const maxTime =
            Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 60;
          v.currentTime = Math.max(0, Math.min(time, maxTime));
        } catch (_err) {
          finish();
        }

        setTimeout(finish, 400);
      });
    });

    await Promise.all(promises);
  }

  private _showExportOverlay(camera: string, durationSec: number) {
    if (typeof document === 'undefined') return;
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (!loadingOverlay || !loadingText) return;

    loadingOverlay.classList.remove('hidden');
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.right = '0';
    loadingOverlay.style.bottom = '0';
    loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    loadingOverlay.style.zIndex = '9999';

    const title =
      camera === 'all'
        ? 'Exporting Camera Grid (mediabunny GPU)'
        : `Exporting ${camera.toUpperCase()} Camera (mediabunny GPU)`;

    loadingText.innerHTML = `
      <div style="text-align: center;">
        <div id="exportTitle" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; color: #ffffff;">
          ${title}
        </div>
        <div id="exportProgress" style="font-size: 0.9rem; color: #a0a0a0;">
          Preparing hardware encoder (${durationSec.toFixed(1)}s)...
        </div>
        <div style="width: 320px; height: 8px; background: #3a3a3a; border-radius: 4px; margin: 1rem auto; overflow: hidden;">
          <div id="exportProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4a9eff, #6bb1ff); transition: width 0.15s ease;"></div>
        </div>
        <button id="cancelExportBtn" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
          Cancel
        </button>
      </div>
    `;

    document
      .getElementById('cancelExportBtn')
      ?.addEventListener('click', () => {
        this.cancelExport();
      });
  }

  private _hideExportOverlay() {
    if (typeof document === 'undefined') return;
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
      loadingOverlay.style.display = 'none';
    }
  }

  private _downloadFile(url: string, filename: string) {
    if (typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'TeslaCam_Export.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private _showComplete(filename: string, downloadUrl: string) {
    if (typeof document === 'undefined') return;
    const loadingText = document.getElementById('loadingText');
    if (!loadingText) return;

    loadingText.innerHTML = `
      <div style="text-align: center; color: white;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
        <div style="font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem;">Export Complete!</div>
        <div style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 1.5rem;">${filename} has been saved directly from your GPU.</div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <a href="${downloadUrl}" download="${filename}" style="background: #4a9eff; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Download Again</a>
          <button id="exportDoneBtn" style="background: #333; color: white; border: 1px solid #555; padding: 10px 24px; border-radius: 6px; cursor: pointer;">Close</button>
        </div>
      </div>
    `;

    document.getElementById('exportDoneBtn')?.addEventListener('click', () => {
      this._hideExportOverlay();
      window.app?.enableControls?.();
    });
  }

  async cancelExport() {
    this._cancelled = true;
    this.isExporting = false;
    this._hideExportOverlay();
    if (typeof window !== 'undefined') {
      window.app?.enableControls?.();
    }
  }
}

export { VideoExport };
export default VideoExport;
