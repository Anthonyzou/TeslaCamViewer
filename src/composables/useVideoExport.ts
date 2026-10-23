/**
 * useVideoExport - Composable and engine for hardware-accelerated video export
 * Offloads multi-camera video decoding, layout compositing, and MP4 encoding directly to
 * a background Web Worker utilizing Origin Private File System (OPFS) and GPU hardware.
 */

import { ref, type Ref } from 'vue';
import { exportModalStore } from './useModals';
import { layoutStore } from './useLayout';
import { videoPlayer, type VideoPlayer } from './usePlayback';
import { LayoutConfig } from '../layout/layoutConfig';
import { LayoutRenderer } from '../layout/layoutRenderer';
import type {
  ExportWorkerStartPayload,
  WorkerOutMessage,
} from '../workers/videoExportWorker';

export class VideoExport {
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

    this.isExporting = true;
    this._cancelled = false;
    this._showExportOverlay(camera, exportDuration);
    window.app?.disableControls?.();

    try {
      const activeGroup = clipGroups[targetClipIndex];
      const clipInputs: Record<string, File | Blob | string> = {};

      const camerasToGather =
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

      for (const cam of camerasToGather) {
        const c = activeGroup?.clips?.[cam];
        if (!c) continue;
        if (c.fileHandle) {
          try {
            clipInputs[cam] = await c.fileHandle.getFile();
          } catch (e) {
            console.warn(`[VideoExport] Could not get file for ${cam}:`, e);
          }
        } else if (c.url) {
          clipInputs[cam] = c.url;
        }
      }

      if (Object.keys(clipInputs).length === 0) {
        throw new Error('No video feeds found for the target export interval');
      }

      // Determine Layout and Canvas Output Resolution
      const renderer = new LayoutRenderer();
      let canvasWidth = 1920;
      let canvasHeight = 1080;
      let exportConfig: any = null;

      if (camera === 'all') {
        const activeLayoutConfig =
          layoutStore.currentConfig ||
          LayoutConfig.presetToConfig('layout-6-3');

        exportConfig = renderer.calculateExportConfig(
          activeLayoutConfig,
          1280,
          960,
          { visibleCameras: layoutStore.visibleCameras }
        );
        canvasWidth = Math.floor((exportConfig.canvasWidth || 1920) / 2) * 2;
        canvasHeight = Math.floor((exportConfig.canvasHeight || 1080) / 2) * 2;
      } else {
        const videos = this.videoPlayer?.videos || {};
        const activeVideo = videos[camera] || videos.front;
        canvasWidth =
          Math.floor((activeVideo?.videoWidth || 1280) / 2) * 2;
        canvasHeight =
          Math.floor((activeVideo?.videoHeight || 960) / 2) * 2;
      }

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

  private _showExportOverlay(camera: string, durationSec: number) {
    const title =
      camera === 'all'
        ? 'Exporting Camera Grid (GPU Worker)'
        : `Exporting ${camera.toUpperCase()} Camera (GPU Worker)`;

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

export const videoExport = new VideoExport(videoPlayer);

export function useVideoExport() {
  const isExporting: Ref<boolean> = ref(false);

  async function startExport(options: any = {}): Promise<void> {
    isExporting.value = true;
    try {
      await videoExport.startExport(options);
    } finally {
      isExporting.value = videoExport.isExporting;
    }
  }

  async function cancelExport(): Promise<void> {
    await videoExport.cancelExport();
    isExporting.value = false;
  }

  return {
    isExporting,
    startExport,
    cancelExport,
    videoExport,
  };
}

export default useVideoExport;
