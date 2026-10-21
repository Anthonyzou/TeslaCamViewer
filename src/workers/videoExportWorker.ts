/**
 * videoExportWorker.ts - Headless background worker for video export
 *
 * Utilizes:
 * - Origin Private File System (OPFS) FileSystemSyncAccessHandle for high-speed zero-overhead disk writes
 * - mediabunny StreamTarget with non-linear seek/write adapter
 * - mediabunny Input + VideoSampleSink for pure WebCodecs decoding (no DOM <video> seeking)
 * - OffscreenCanvas for layout composition
 * - mediabunny CanvasSource + VideoEncoder for hardware encoding
 */

import {
  BlobSource,
  CanvasSource,
  Input,
  Mp4InputFormat,
  Mp4OutputFormat,
  Output,
  Quality,
  StreamTarget,
  VideoSampleSink,
  type Source,
  type StreamTargetChunk,
  type VideoSample,
} from 'mediabunny';
import { LayoutRenderer } from '../layout/layoutRenderer';
import type { CameraConfigLike } from '../layout/layoutMath';

export interface ExportWorkerStartPayload {
  clipInputs: Record<string, File | Blob | string>;
  camera: string;
  startSec: number;
  endSec: number;
  exportDuration: number;
  fps?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  exportConfig?: {
    canvasWidth: number;
    canvasHeight: number;
    cameras: Record<string, CameraConfigLike>;
  };
  cameraLabels?: boolean;
  filename: string;
}

export type WorkerInMessage =
  | { type: 'start'; payload: ExportWorkerStartPayload }
  | { type: 'cancel' };

export type WorkerOutMessage =
  | {
      type: 'progress';
      percent: number;
      statusText: string;
      currentFrame: number;
      totalFrames: number;
    }
  | { type: 'complete'; file: File; filename: string }
  | { type: 'cancelled' }
  | { type: 'error'; error: string; canFallback?: boolean };

let isCancelled = false;
let currentOutput: Output | null = null;
let currentSyncHandle: FileSystemSyncAccessHandle | null = null;
const openInputs: Input[] = [];

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const data = e.data;
  if (!data) return;

  if (data.type === 'cancel') {
    isCancelled = true;
    try {
      if (currentOutput) {
        await currentOutput.cancel();
      }
      if (currentSyncHandle) {
        currentSyncHandle.close();
        currentSyncHandle = null;
      }
      for (const input of openInputs) {
        try {
          input.dispose();
        } catch {}
      }
      openInputs.length = 0;
    } catch (err) {
      console.warn('[ExportWorker] Error during cancel cleanup:', err);
    }
    self.postMessage({ type: 'cancelled' } as WorkerOutMessage);
    return;
  }

  if (data.type === 'start') {
    isCancelled = false;
    currentOutput = null;
    currentSyncHandle = null;
    openInputs.length = 0;

    const payload = data.payload;
    try {
      await runExport(payload);
    } catch (err: any) {
      try {
        if (currentSyncHandle) {
          currentSyncHandle.close();
          currentSyncHandle = null;
        }
        for (const input of openInputs) {
          try {
            input.dispose();
          } catch {}
        }
        openInputs.length = 0;
      } catch {}

      if (isCancelled) {
        self.postMessage({ type: 'cancelled' } as WorkerOutMessage);
      } else {
        self.postMessage({
          type: 'error',
          error: err.message || String(err),
          canFallback: true,
        } as WorkerOutMessage);
      }
    }
  }
};

async function runExport(payload: ExportWorkerStartPayload) {
  const {
    clipInputs,
    camera,
    startSec,
    exportDuration,
    fps = 30,
    exportConfig,
    cameraLabels = true,
    filename,
  } = payload;

  // 1. Verify OPFS support in worker context
  if (
    typeof navigator?.storage?.getDirectory !== 'function'
  ) {
    throw new Error('OPFS (navigator.storage.getDirectory) is not supported in this browser.');
  }

  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle('export_headless_fast.mp4', {
    create: true,
  });

  if (typeof (fileHandle as any).createSyncAccessHandle !== 'function') {
    throw new Error('createSyncAccessHandle is not supported in this worker environment.');
  }

  const syncHandle: FileSystemSyncAccessHandle =
    await (fileHandle as any).createSyncAccessHandle();
  currentSyncHandle = syncHandle;
  syncHandle.truncate(0);

  // 2. Custom WritableStream for mediabunny StreamTarget
  const syncWritableStream = new WritableStream<StreamTargetChunk>({
    write(chunk) {
      syncHandle.write(chunk.data, { at: chunk.position });
    },
    close() {
      syncHandle.flush();
      syncHandle.close();
      currentSyncHandle = null;
    },
  });

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: false }),
    target: new StreamTarget(syncWritableStream),
  });
  currentOutput = output;

  // 3. Determine Canvas dimensions
  let canvasWidth = payload.canvasWidth || 1920;
  let canvasHeight = payload.canvasHeight || 1080;

  if (camera === 'all' && exportConfig) {
    canvasWidth = Math.floor((exportConfig.canvasWidth || 1920) / 2) * 2;
    canvasHeight = Math.floor((exportConfig.canvasHeight || 1080) / 2) * 2;
  }

  // 4. Initialize input demuxers and sinks for available camera feeds
  self.postMessage({
    type: 'progress',
    percent: 0,
    statusText: 'Initializing video decoders...',
    currentFrame: 0,
    totalFrames: 0,
  } as WorkerOutMessage);

  const sinks: Record<string, VideoSampleSink> = {};

  for (const [camName, inputSource] of Object.entries(clipInputs)) {
    if (camera !== 'all' && camName !== camera) {
      continue;
    }

    try {
      let source: Source;
      if (inputSource instanceof Blob) {
        source = new BlobSource(inputSource);
      } else if (typeof inputSource === 'string') {
        const resp = await fetch(inputSource);
        if (!resp.ok) {
          throw new Error(`Failed to fetch camera ${camName}: HTTP ${resp.status}`);
        }
        const blob = await resp.blob();
        source = new BlobSource(blob);
      } else {
        continue;
      }

      const input = new Input({
        source,
        formats: [new Mp4InputFormat()],
      });
      openInputs.push(input);

      const videoTrack = await input.getPrimaryVideoTrack();
      if (videoTrack) {
        const canDecode = await videoTrack.canDecode();
        if (!canDecode) {
          throw new Error(`Video track for camera ${camName} cannot be decoded via WebCodecs.`);
        }
        const sink = new VideoSampleSink(videoTrack, {
          hardwareAcceleration: 'prefer-hardware',
        });
        sinks[camName] = sink;

        if (camera !== 'all' && (!payload.canvasWidth || !payload.canvasHeight)) {
          const dw = await videoTrack.getDisplayWidth();
          const dh = await videoTrack.getDisplayHeight();
          if (dw && dh) {
            canvasWidth = Math.floor(dw / 2) * 2;
            canvasHeight = Math.floor(dh / 2) * 2;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[ExportWorker] Could not initialize feed for ${camName}:`, err);
    }
  }

  if (Object.keys(sinks).length === 0) {
    throw new Error('No valid video tracks found to export.');
  }

  // 5. Initialize OffscreenCanvas and mediabunny CanvasSource
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d', {
    alpha: false,
    willReadFrequently: false,
  });

  if (!ctx) {
    throw new Error('Could not create OffscreenCanvas 2D context');
  }

  const videoSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: new Quality({ quality: 'medium' }),
    hardwareAcceleration: 'prefer-hardware',
    latencyMode: 'realtime',
    keyFrameInterval: 2,
  });

  output.addVideoTrack(videoSource);
  await output.start();

  // 6. Calculate timestamps and prepare async sample streams
  const frameIntervalSec = 1 / fps;
  const totalFrames = Math.max(1, Math.round(exportDuration * fps));
  const timestamps: number[] = [];
  for (let i = 0; i < totalFrames; i++) {
    timestamps.push(startSec + i * frameIntervalSec);
  }

  const iterators: Record<string, AsyncIterator<VideoSample | null>> = {};
  for (const [cam, sink] of Object.entries(sinks)) {
    iterators[cam] = sink.samplesAtTimestamps(timestamps)[Symbol.asyncIterator]();
  }

  const renderer = new LayoutRenderer();

  // 7. Frame compositing loop
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (isCancelled) {
      await output.cancel();
      return;
    }

    // Retrieve sample for each camera
    const frameSamples: Record<string, VideoSample | null> = {};
    const frameSources: Record<string, any> = {};
    for (const [cam, iter] of Object.entries(iterators)) {
      try {
        const next = await iter.next();
        frameSamples[cam] = next.done ? null : next.value;
        if (frameSamples[cam]) {
          frameSources[cam] = frameSamples[cam]!.toCanvasImageSource();
        }
      } catch {
        frameSamples[cam] = null;
      }
    }

    if (camera === 'all' && exportConfig?.cameras) {
      renderer.renderToCanvas(ctx, exportConfig, frameSources);

      if (cameraLabels) {
        const labelScale = canvasWidth / 1920;
        const scaledFontSize = Math.round(18 * labelScale);
        renderer.addLabelsToCanvas(ctx, exportConfig, {
          fontSize: scaledFontSize,
          videos: frameSources,
        });
      }
    } else {
      // Single camera view
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      const source =
        frameSources[camera] || Object.values(frameSources)[0];
      if (source) {
        try {
          ctx.drawImage(source, 0, 0, canvasWidth, canvasHeight);
        } catch {
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
      }
    }

    // Close samples immediately to release hardware frames
    for (const sample of Object.values(frameSamples)) {
      if (sample) {
        try {
          sample.close();
        } catch {}
      }
    }

    const timestampSec = frameIdx * frameIntervalSec;
    const isKeyFrame = frameIdx % (fps * 2) === 0;
    await videoSource.add(timestampSec, frameIntervalSec, { keyFrame: isKeyFrame });

    const percent = Math.min(99, Math.round(((frameIdx + 1) / totalFrames) * 98));
    self.postMessage({
      type: 'progress',
      percent,
      statusText: `Encoding frame ${frameIdx + 1} of ${totalFrames} (${percent}%)`,
      currentFrame: frameIdx + 1,
      totalFrames,
    } as WorkerOutMessage);
  }

  // 8. Finalize MP4 muxing
  self.postMessage({
    type: 'progress',
    percent: 99,
    statusText: 'Finalizing MP4 container...',
    currentFrame: totalFrames,
    totalFrames,
  } as WorkerOutMessage);

  await output.finalize();

  for (const input of openInputs) {
    try {
      input.dispose();
    } catch {}
  }
  openInputs.length = 0;

  const completedFile = await fileHandle.getFile();
  if (!completedFile || completedFile.size === 0) {
    throw new Error('Export produced an empty output file');
  }

  self.postMessage({
    type: 'complete',
    file: completedFile,
    filename,
  } as WorkerOutMessage);
}
