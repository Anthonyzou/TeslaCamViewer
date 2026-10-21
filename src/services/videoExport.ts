/**
 * VideoExport - Hardware-Accelerated Video Exporter powered by mediabunny & WebCodecs.
 * Offloads multi-camera video export directly to the client's GPU (e.g. Apple Silicon M1 media engine),
 * with graceful fallback to server-side FFmpeg for older browsers.
 */
import {
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
} from 'mediabunny';
import { exportModalStore } from '../composables/useModals';
import { LayoutConfig } from '../layout/layoutConfig';
import { LayoutRenderer } from '../layout/layoutRenderer';
import type VideoPlayer from './videoPlayer';
import type {
  ExportWorkerStartPayload,
  WorkerOutMessage,
} from '../workers/videoExportWorker';

class VideoExport {
  public isExporting = false;
  private _cancelled = false;
  private _worker: Worker | null = null;

  constructor(private videoPlayer: VideoPlayer) {}

  getExportStatus() {
    return { isExporting: this.isExporting };
  }

  async exportVideo(camera = 'all') {
    return this.startExport({ camera, format: 'mp4' });
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
      // Collect clip file handles or URLs for the target clip group
      const clipGroup = clipGroups[targetClipIndex];
      const clipInputs: Record<string, File | Blob | string> = {};
      const camerasToExport =
        camera === 'all'
          ? [
              'front',
              'back',
              'left_repeater',
              'right_repeater',
              'left_pillar',
              'right_pillar',
            ]
          : [camera];

      for (const cam of camerasToExport) {
        const clip = clipGroup?.clips?.[cam];
        if (!clip) continue;
        if (clip.fileHandle && typeof clip.fileHandle.getFile === 'function') {
          try {
            clipInputs[cam] = await clip.fileHandle.getFile();
          } catch (err) {
            console.warn(`[VideoExport] Could not read fileHandle for ${cam}:`, err);
          }
        } else if (clip.url) {
          clipInputs[cam] = clip.url;
        }
      }

      // Determine Layout and Canvas Output Resolution
      const layoutManager = window.app?.layoutManager;
      const renderer = layoutManager?.renderer || new LayoutRenderer();
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
        const videos = this.videoPlayer?.videos || {};
        const activeVideo = videos[camera] || videos.front;
        const vw = activeVideo?.videoWidth || 1280;
        const vh = activeVideo?.videoHeight || 960;
        canvasWidth = Math.floor(vw / 2) * 2;
        canvasHeight = Math.floor(vh / 2) * 2;
      }

      let workerSuccess = false;
      const canUseWorker =
        typeof Worker !== 'undefined' &&
        Object.keys(clipInputs).length > 0 &&
        typeof navigator?.storage?.getDirectory === 'function';

      if (canUseWorker) {
        try {
          await this._exportWithWorker({
            clipInputs,
            camera,
            filename,
            startSec,
            endSec,
            exportDuration,
            canvasWidth,
            canvasHeight,
            exportConfig,
          });
          workerSuccess = true;
        } catch (workerErr: any) {
          if (this._cancelled) {
            return;
          }
          console.warn(
            '[VideoExport] Headless worker export not available or failed, falling back to main-thread export:',
            workerErr
          );
        }
      }

      if (!workerSuccess && !this._cancelled) {
        // High-speed client-side GPU hardware encoding via mediabunny on main thread
        await this._renderAndEncodeWithMediaBunny({
          camera,
          filename,
          startSec,
          endSec,
          exportDuration,
        });
      }
    } catch (err: any) {
      if (this._cancelled) {
        console.log('[VideoExport] Export cancelled by user');
      } else {
        console.error('[VideoExport] Encoding error:', err);
        alert(`Export failed: ${err.message || 'Unknown error'}`);
      }
      exportModalStore.close();
      window.app?.enableControls?.();
    } finally {
      this.isExporting = false;
    }
  }

  private async _exportWithWorker(params: {
    clipInputs: Record<string, File | Blob | string>;
    camera: string;
    filename: string;
    startSec: number;
    endSec: number;
    exportDuration: number;
    canvasWidth: number;
    canvasHeight: number;
    exportConfig: any;
  }): Promise<void> {
    const {
      clipInputs,
      camera,
      filename,
      startSec,
      endSec,
      exportDuration,
      canvasWidth,
      canvasHeight,
      exportConfig,
    } = params;

    return new Promise<void>((resolve, reject) => {
      let workerUrl: string;
      try {
        workerUrl = new URL(
          'dist/videoExportWorker.js',
          window.location.origin + window.location.pathname
        ).href;
      } catch {
        workerUrl = 'dist/videoExportWorker.js';
      }

      let worker: Worker;
      try {
        worker = new Worker(workerUrl);
        this._worker = worker;
      } catch (e) {
        return reject(e);
      }

      worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        const data = e.data;
        if (!data) return;

        if (data.type === 'progress') {
          exportModalStore.updateProgress(
            data.percent,
            `Worker GPU Encoding: ${data.percent}% (${data.currentFrame}/${data.totalFrames})`
          );
        } else if (data.type === 'complete') {
          this._worker = null;
          worker.terminate();

          const downloadUrl = URL.createObjectURL(data.file);
          this._downloadFile(downloadUrl, filename);
          this._showComplete(filename, downloadUrl);
          resolve();
        } else if (data.type === 'cancelled') {
          this._worker = null;
          worker.terminate();
          resolve();
        } else if (data.type === 'error') {
          this._worker = null;
          worker.terminate();
          reject(new Error(data.error));
        }
      };

      worker.onerror = (err) => {
        this._worker = null;
        worker.terminate();
        reject(err);
      };

      const payload: ExportWorkerStartPayload = {
        clipInputs,
        camera,
        startSec,
        endSec,
        exportDuration,
        fps: 30,
        canvasWidth,
        canvasHeight,
        exportConfig,
        cameraLabels: true,
        filename,
      };

      worker.postMessage({ type: 'start', payload });
    });
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
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle('export_temp.mp4', {
      create: true,
    });
    const writableFileStream = await fileHandle.createWritable();

    // Initialize mediabunny Output with in-memory fast-start MP4 format
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: false }),
      target: new StreamTarget(writableFileStream),
    });

    const fps = 30;
    const frameIntervalSec = 1 / fps;
    const totalFrames = Math.max(1, Math.round(exportDuration * fps));

    // Connect CanvasSource with WebCodecs hardware encoder (H.264/AVC)
    const videoSource = new CanvasSource(canvas, {
      codec: 'avc',
      bitrate: new Quality({
        quality: 'medium',
      }),
      hardwareAcceleration: 'prefer-hardware', // ⚡ Explicitly
      latencyMode: 'realtime',
      keyFrameInterval: 2,
    });

    output.addVideoTrack(videoSource);
    await output.start();

    // Pause player during offline export
    this.videoPlayer?.pause();

    // Warm-up seek to initial start time and ensure frames are decoded
    await this._seekVideos(videos, startSec);

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

      // Update progress UI via reactive store
      const percent = Math.min(
        99,
        Math.round(((frameIdx + 1) / totalFrames) * 100)
      );
      exportModalStore.updateProgress(
        percent,
        `GPU Encoding (mediabunny): ${percent}% (Frame ${frameIdx + 1}/${totalFrames})`
      );
    }

    // Finalize MP4 muxing
    await output.finalize();

    exportModalStore.updateProgress(100, 'Finalizing MP4 container...');

    const completedFile = await fileHandle.getFile();
    if (!completedFile || completedFile.size === 0) {
      throw new Error('Export produced an empty output file');
    }

    // You now have a clean File/Blob handle ready for download:
    const downloadUrl = URL.createObjectURL(completedFile);

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
    const title =
      camera === 'all'
        ? 'Exporting Camera Grid (mediabunny GPU)'
        : `Exporting ${camera.toUpperCase()} Camera (mediabunny GPU)`;

    exportModalStore.open(
      title,
      `Preparing hardware encoder (${durationSec.toFixed(1)}s)...`,
      () => this.cancelExport()
    );
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
    exportModalStore.showComplete(filename, downloadUrl);
  }

  async cancelExport() {
    this._cancelled = true;
    this.isExporting = false;
    if (this._worker) {
      try {
        this._worker.postMessage({ type: 'cancel' });
        this._worker.terminate();
      } catch {}
      this._worker = null;
    }
    exportModalStore.close();
    if (typeof window !== 'undefined') {
      window.app?.enableControls?.();
    }
  }
}

export { VideoExport };
export default VideoExport;
