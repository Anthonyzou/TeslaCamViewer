import axios from 'axios';
import B2 from 'backblaze-b2';
import type { Application, Request, Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import stream from 'node:stream';
import { promisify } from 'node:util';
import type { TeslaCamEvent } from '../src/types/index.ts';
import {
  groupClips,
  parseClipFilename,
  parseEventFolderName,
} from '../src/utils/teslaCamFormat.ts';
import type {
  ActiveB2Auth,
  B2ParseResult,
  B2RawFile,
  PreloadItem,
  VideoCacheStatus,
} from './types.ts';

// Connection pooling with Keep-Alive to reuse sockets across video chunks and camera streams
export const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
  keepAliveMsecs: 30000,
  timeout: 60000,
});

export const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
  keepAliveMsecs: 30000,
  timeout: 60000,
});

axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;

const CACHE_TTL = 3600 * 1000; // 1 hour
const rootDir = path.resolve(import.meta.dirname, '..');

export const VIDEO_CACHE_DIR =
  process.env.VIDEO_CACHE_DIR || path.resolve(rootDir, '.cache', 'videos');
export const MAX_CACHE_BYTES = process.env.VIDEO_CACHE_MAX_BYTES
  ? parseInt(process.env.VIDEO_CACHE_MAX_BYTES, 10)
  : 5 * 1024 * 1024 * 1024; // 5 GB default

export let cachedB2Data: B2ParseResult | null = null;
export let lastParseTime = 0;
export let activeB2Auth: ActiveB2Auth = {
  bucketName: null,
  downloadUrl: null,
  downloadToken: null,
  keyId: null,
  appKey: null,
};

const inFlightDownloads = new Map<string, Promise<string>>();

export function setCachedB2Data(
  data: B2ParseResult | null,
  time = Date.now()
): void {
  cachedB2Data = data;
  lastParseTime = time;
}

export function getCachedB2Data(): {
  cachedB2Data: B2ParseResult | null;
  lastParseTime: number;
} {
  return { cachedB2Data, lastParseTime };
}

/**
 * Perform the B2 parsing logic using the backblaze-b2 SDK
 */
export async function performB2Parse(
  keyId: string,
  appKey: string,
  bucketName: string
): Promise<B2ParseResult> {
  console.log(`[B2 Server Parser] Starting parse for bucket: ${bucketName}`);

  const b2 = new B2({
    applicationKeyId: keyId,
    applicationKey: appKey,
    axios: {
      httpAgent,
      httpsAgent,
    },
  });

  await b2.authorize();

  // 1. Get Bucket ID
  const bucketsResp = await b2.getBucket({ bucketName });
  const bucket = bucketsResp.data.buckets.find(
    (b) => b.bucketName === bucketName
  );
  if (!bucket) throw new Error('Bucket not found');
  const bucketId = bucket.bucketId;

  // 2. List all files (with pagination)
  let allFiles: B2RawFile[] = [];
  let startFileName: string | null = null;
  while (true) {
    const listResp = await b2.listFileNames({
      bucketId,
      startFileName,
      maxFileCount: 10000,
    });

    allFiles = allFiles.concat(listResp.data.files);
    if (listResp.data.nextFileName) {
      startFileName = listResp.data.nextFileName;
    } else {
      break;
    }
  }

  // 3. Get Download Authorization Token
  const downloadAuthResp = await b2.getDownloadAuthorization({
    bucketId,
    fileNamePrefix: '',
    validDurationInSeconds: 86400,
  });

  const downloadToken = downloadAuthResp.data.authorizationToken;
  const downloadUrl = b2.downloadUrl;

  activeB2Auth = {
    bucketName,
    downloadUrl,
    downloadToken,
    keyId,
    appKey,
  };

  // 4. Parse files into structured events
  return await organizeB2Events(
    allFiles,
    bucketName,
    downloadUrl,
    downloadToken
  );
}

/**
 * Group raw B2 files into TeslaCam events and clip groups
 */
export async function organizeB2Events(
  allFiles: B2RawFile[],
  bucketName: string,
  downloadUrl: string,
  downloadToken: string
): Promise<B2ParseResult> {
  const eventsMap = new Map<string, any>();
  const metadataFetches: Promise<void>[] = [];

  for (const file of allFiles) {
    const pathParts = file.fileName.split('/');
    if (pathParts.length < 3) continue;

    const typeIndex = pathParts.findIndex((p) =>
      ['SavedClips', 'SentryClips', 'RecentClips'].includes(p)
    );
    if (typeIndex === -1 || typeIndex + 1 >= pathParts.length) continue;

    const type = pathParts[typeIndex];
    const eventFolderName = pathParts[typeIndex + 1];
    const eventKey = `${type}/${eventFolderName}`;

    if (!eventsMap.has(eventKey)) {
      const folderInfo = parseEventFolderName(eventFolderName);
      const timestamp = folderInfo ? folderInfo.timestamp : eventFolderName;

      eventsMap.set(eventKey, {
        name: eventFolderName,
        type: type,
        timestamp: timestamp,
        clips: [],
        metadata: null,
        thumbnailUrl: null,
        eventVideoUrl: null,
      });
    }

    const event = eventsMap.get(eventKey)!;
    const fileName = pathParts[pathParts.length - 1];
    const fileUrl = `${downloadUrl}/file/${bucketName}/${file.fileName}?Authorization=${encodeURIComponent(downloadToken)}`;
    const proxyVideoUrl = `/api/b2/video?file=${encodeURIComponent(file.fileName)}&url=${encodeURIComponent(fileUrl)}`;

    if (fileName === 'event.json') {
      metadataFetches.push(
        axios
          .get(fileUrl)
          .then((resp) => {
            event.metadata = resp.data;
          })
          .catch(() =>
            console.warn(`[Parser] Failed to fetch metadata for ${eventKey}`)
          )
      );
    } else if (fileName === 'thumb.png') {
      event.thumbnailUrl = fileUrl;
    } else if (fileName === 'event.mp4') {
      event.eventVideoUrl = proxyVideoUrl;
    } else if (fileName.endsWith('.mp4')) {
      const parsed = parseClipFilename(fileName);
      if (parsed) {
        event.clips.push({
          timestamp: parsed.timestamp,
          camera: parsed.camera,
          fileName: fileName,
          file: file.fileName,
          url: proxyVideoUrl,
        });
      }
    }
  }

  // Fetch event metadata concurrently rather than blocking file traversal serially
  if (metadataFetches.length > 0) {
    await Promise.all(metadataFetches);
  }

  const finalEvents: TeslaCamEvent[] = Array.from(eventsMap.values()).filter(
    (e) => e.clips.length > 0
  );

  for (const event of finalEvents) {
    event.clipGroups = groupClips(event.clips || []);
    event.isEmpty = event.clipGroups.length === 0;
    event.hasPillarCameras = (event.clips || []).some(
      (c) => c.camera === 'left_pillar' || c.camera === 'right_pillar'
    );

    event.driveId = 'b2';
    event.driveLabel = 'Backblaze B2';
    event.driveColor = '#003399';
    event.compoundKey = `b2:${event.name}`;
  }

  finalEvents.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    events: finalEvents,
    stats: { totalFiles: allFiles.length, eventCount: finalEvents.length },
  };
}

/**
 * Update file access time in userspace to preserve accurate LRU cache eviction
 * even on SSD filesystems mounted with `noatime`
 */
export function touchCacheFile(filePath: string): void {
  const now = new Date();
  fs.promises.utimes(filePath, now, now).catch(() => {});
}

let prunning = false;
/**
 * Prune video cache when disk usage exceeds threshold
 */
export async function pruneVideoCache(
  targetDir: string = VIDEO_CACHE_DIR,
  maxBytes: number = MAX_CACHE_BYTES
): Promise<void> {
  if (prunning) return;
  prunning = true;
  try {
    if (!fs.existsSync(targetDir)) return;
    const files: Array<{ path: string; size: number; atime: number }> = [];

    // Parallel asynchronous walk optimized for SSD concurrent queue depths
    async function walk(dir: string): Promise<void> {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile() && !entry.name.includes('.tmp.')) {
            const stats = await fs.promises.stat(fullPath);
            files.push({
              path: fullPath,
              size: stats.size,
              atime: stats.atimeMs || stats.mtimeMs,
            });
          }
        })
      );
    }

    await walk(targetDir);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize <= maxBytes) return;

    // Sort by atime ascending (oldest first)
    files.sort((a, b) => a.atime - b.atime);

    let currentSize = totalSize;
    const targetSize = maxBytes * 0.8; // Evict down to 80%
    for (const file of files) {
      if (currentSize <= targetSize) break;
      try {
        await fs.promises.unlink(file.path);
        currentSize -= file.size;
      } catch (_e) {
        // Ignore unlink error if already deleted
      }
    }
  } catch (err: any) {
    console.warn('[B2 Video Cache] Eviction error:', err.message);
  } finally {
    prunning = false;
  }
}

/**
 * Retrieve current video cache stats (parallel async traversal for SSDs)
 */
export async function getVideoCacheStatus(): Promise<VideoCacheStatus> {
  let totalFiles = 0;
  let totalBytes = 0;

  async function walk(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) return;
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && !entry.name.includes('.tmp.')) {
          const stats = await fs.promises.stat(fullPath);
          totalFiles++;
          totalBytes += stats.size;
        }
      })
    );
  }

  await walk(VIDEO_CACHE_DIR);
  return {
    enabled: true,
    cacheDir: VIDEO_CACHE_DIR,
    totalFiles,
    totalBytes,
    maxBytes: MAX_CACHE_BYTES,
  };
}

/**
 * Clear the video disk cache directory
 */
export async function clearVideoCache(): Promise<void> {
  if (fs.existsSync(VIDEO_CACHE_DIR)) {
    await fs.promises.rm(VIDEO_CACHE_DIR, { recursive: true, force: true });
    await fs.promises.mkdir(VIDEO_CACHE_DIR, { recursive: true });
  }
}

function resolveSourceUrl(
  fileParam: string,
  sourceUrl?: string | null
): string | null {
  let resolved = sourceUrl || null;
  if (!resolved && activeB2Auth.downloadUrl && activeB2Auth.bucketName) {
    resolved = `${activeB2Auth.downloadUrl}/file/${activeB2Auth.bucketName}/${fileParam}${
      activeB2Auth.downloadToken
        ? `?Authorization=${encodeURIComponent(activeB2Auth.downloadToken)}`
        : ''
    }`;
  }
  return resolved;
}

/**
 * Ensure video file is cached locally, downloading if necessary (background helper)
 */
export async function ensureVideoCached(
  fileParam: string,
  sourceUrl?: string | null
): Promise<string> {
  const safeRelative = path
    .normalize(fileParam || '')
    .replace(/^(\.\.[\/\\])+/, '')
    .replace(/^[/\\]+/, '');

  if (!safeRelative) {
    throw new Error('Invalid file parameter');
  }

  const cacheFilePath = path.join(VIDEO_CACHE_DIR, safeRelative);

  if (fs.existsSync(cacheFilePath)) {
    return cacheFilePath;
  }

  if (inFlightDownloads.has(cacheFilePath)) {
    return await inFlightDownloads.get(cacheFilePath)!;
  }

  const downloadPromise = (async () => {
    try {
      const resolvedSource = resolveSourceUrl(safeRelative, sourceUrl);
      if (!resolvedSource) {
        throw new Error('No source URL available to download video');
      }

      await fs.promises.mkdir(path.dirname(cacheFilePath), { recursive: true });
      const tempFilePath = `${cacheFilePath}.tmp.${Date.now()}`;

      const response = await axios({
        method: 'get',
        url: resolvedSource,
        responseType: 'stream',
        timeout: 30000,
      });

      const writer = fs.createWriteStream(tempFilePath, {
        highWaterMark: 2 * 1024 * 1024,
      });
      await promisify(stream.pipeline)(response.data, writer);

      await fs.promises.rename(tempFilePath, cacheFilePath);

      pruneVideoCache().catch((err: any) =>
        console.warn('[B2 Video Cache] Pruning warning:', err.message)
      );

      return cacheFilePath;
    } catch (err) {
      try {
        if (fs.existsSync(path.dirname(cacheFilePath))) {
          const tempFiles = (
            await fs.promises.readdir(path.dirname(cacheFilePath))
          ).filter((f) => f.startsWith(`${path.basename(cacheFilePath)}.tmp.`));
          for (const tf of tempFiles) {
            await fs.promises
              .unlink(path.join(path.dirname(cacheFilePath), tf))
              .catch(() => {});
          }
        }
      } catch (_e) {}
      throw err;
    } finally {
      inFlightDownloads.delete(cacheFilePath);
    }
  })();

  downloadPromise.catch(() => {});
  inFlightDownloads.set(cacheFilePath, downloadPromise);
  return await downloadPromise;
}

export default function registerB2Routes(app: Application): void {
  // 1. Server-Side B2 Status/Config Route
  app.get('/api/b2/config', (_req: Request, res: Response) => {
    res.json({
      isConfigured: !!(
        process.env.B2_KEY_ID &&
        process.env.B2_APP_KEY &&
        process.env.B2_BUCKET_NAME
      ),
      isPreloaded: !!cachedB2Data,
      lastParseTime: lastParseTime,
    });
  });

  // 2. Server-Side B2 Video Cache Status
  app.get('/api/b2/cache/status', async (_req: Request, res: Response) => {
    try {
      const status = await getVideoCacheStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Clear Server-Side Video Cache
  app.post('/api/b2/cache/clear', async (_req: Request, res: Response) => {
    try {
      await clearVideoCache();
      res.json({ success: true, message: 'Video cache cleared' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3b. Server-Side Video Cache Preload / Warming Route
  app.post('/api/b2/cache/preload', async (req: Request, res: Response) => {
    try {
      const items: PreloadItem[] = req.body?.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Missing or empty items array' });
      }

      const scheduled: string[] = [];
      for (const item of items) {
        let fileParam = item.file || item.fileName;
        let urlParam = item.url;
        if (!fileParam && !urlParam) continue;

        // If url is a proxy URL (/api/b2/video?file=...&url=...), extract the query parameters
        if (
          urlParam &&
          (urlParam.includes('/api/b2/video') ||
            urlParam.startsWith('/api/b2/video') ||
            urlParam.includes('file='))
        ) {
          try {
            const parsedUrl = new URL(urlParam, 'http://localhost');
            const extractedFile = parsedUrl.searchParams.get('file');
            const extractedUrl = parsedUrl.searchParams.get('url');
            if (extractedFile) fileParam = extractedFile;
            if (extractedUrl) urlParam = extractedUrl;
          } catch (_e) {}
        }

        let parsedFromUrl: string | null = null;
        if (urlParam) {
          try {
            parsedFromUrl = path.basename(new URL(urlParam).pathname);
          } catch (_err) {
            // Ignore invalid url parameter
          }
        }

        const resolvedFile = fileParam || parsedFromUrl;
        const safeRelative = path
          .normalize(resolvedFile || '')
          .replace(/^(\.\.[\/\\])+/, '')
          .replace(/^[/\\]+/, '');

        if (!safeRelative) continue;

        const resolvedSource = resolveSourceUrl(safeRelative, urlParam);
        if (resolvedSource) {
          scheduled.push(safeRelative);
          // Trigger background caching to warm the disk cache
          ensureVideoCached(safeRelative, resolvedSource).catch((err: any) =>
            console.warn('[B2 Video Cache] Preload warning:', err.message)
          );
        }
      }

      res.json({ success: true, count: scheduled.length, files: scheduled });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Video Streaming Proxy with Concurrent Streaming & Local Disk Caching
  app.get('/api/b2/video', async (req: Request, res: Response) => {
    try {
      const fileParam = req.query.file as string | undefined;
      const urlParam = req.query.url as string | undefined;

      if (!fileParam && !urlParam) {
        return res
          .status(400)
          .json({ error: 'Missing file or url query parameter' });
      }

      let parsedFromUrl: string | null = null;
      if (urlParam) {
        try {
          parsedFromUrl = path.basename(new URL(urlParam).pathname);
        } catch (_err) {
          return res.status(400).json({ error: 'Invalid url query parameter' });
        }
      }

      const resolvedFile = fileParam || parsedFromUrl;

      const safeRelative = path
        .normalize(resolvedFile || '')
        .replace(/^(\.\.[\/\\])+/, '')
        .replace(/^[/\\]+/, '');

      if (!safeRelative) {
        return res.status(400).json({ error: 'Invalid file parameter' });
      }

      const cacheFilePath = path.join(VIDEO_CACHE_DIR, safeRelative);

      const sendFileCallback = (err?: any) => {
        if (
          err &&
          !res.headersSent &&
          err.code !== 'ECONNABORTED' &&
          err.code !== 'ECANCELED'
        ) {
          console.warn('[B2 Video Proxy] sendFile error:', err.message);
        }
      };

      // Fast path: If already cached on disk, serve instantly via res.sendFile with full Range support
      if (fs.existsSync(cacheFilePath)) {
        touchCacheFile(cacheFilePath);
        return res.sendFile(
          cacheFilePath,
          {
            acceptRanges: true,
            headers: {
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          },
          sendFileCallback
        );
      }

      const resolvedSource = resolveSourceUrl(safeRelative, urlParam);
      if (!resolvedSource) {
        return res
          .status(400)
          .json({ error: 'No source URL configured for this video' });
      }

      const rangeHeader = req.headers.range;
      const isBeginningRange =
        !rangeHeader ||
        rangeHeader.startsWith('bytes=0-') ||
        rangeHeader === 'bytes=0-';

      // If client requests from the beginning AND no download is already writing to disk,
      // concurrently stream to the browser for instant playback AND save to disk cache.
      if (isBeginningRange && !inFlightDownloads.has(cacheFilePath)) {
        const response = await axios({
          method: 'get',
          url: resolvedSource,
          responseType: 'stream',
          timeout: 30000,
        });

        const totalLength =
          response.headers['content-length'] != null
            ? String(response.headers['content-length'])
            : undefined;
        const contentType = String(
          response.headers['content-type'] || 'video/mp4'
        );

        const clientHeaders: Record<string, string> = {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        };

        if (rangeHeader && totalLength) {
          const totalNum = parseInt(totalLength, 10);
          clientHeaders['Content-Range'] =
            `bytes 0-${totalNum - 1}/${totalLength}`;
          clientHeaders['Content-Length'] = totalLength;
          res.writeHead(206, clientHeaders);
        } else {
          if (totalLength) {
            clientHeaders['Content-Length'] = totalLength;
          }
          res.writeHead(200, clientHeaders);
        }

        await fs.promises.mkdir(path.dirname(cacheFilePath), {
          recursive: true,
        });
        const tempFilePath = `${cacheFilePath}.tmp.${Date.now()}`;
        const diskWriter = fs.createWriteStream(tempFilePath, {
          highWaterMark: 2 * 1024 * 1024,
        });

        let resolveInFlight!: (path: string) => void;
        let rejectInFlight!: (err: any) => void;
        const inFlightPromise = new Promise<string>((resolve, reject) => {
          resolveInFlight = resolve;
          rejectInFlight = reject;
        });
        // Prevent unhandled rejection if no secondary request attaches a .catch() handler
        inFlightPromise.catch(() => {});
        inFlightDownloads.set(cacheFilePath, inFlightPromise);

        let isDone = false;
        let isClientClosed = false;

        const onClientClose = () => {
          isClientClosed = true;
          try {
            response.data.unpipe(res);
          } catch (_e) {}
          if (!res.writableEnded) {
            try {
              res.end();
            } catch (_e) {}
          }
          // Note: diskWriter continues streaming to tempFilePath in background
        };
        req.on('close', onClientClose);
        res.on('close', onClientClose);

        const onResError = (_err: any) => {
          try {
            response.data.unpipe(res);
          } catch (_e) {}
        };
        res.on('error', onResError);

        // Tee stream: Send to client response immediately for instant playback
        response.data.pipe(res);

        // Tee stream: Send to disk cache simultaneously
        response.data.pipe(diskWriter);

        diskWriter.on('finish', async () => {
          if (isDone) return;
          isDone = true;
          try {
            await fs.promises.rename(tempFilePath, cacheFilePath);
            pruneVideoCache().catch((err: any) =>
              console.warn('[B2 Video Cache] Pruning warning:', err.message)
            );
            resolveInFlight(cacheFilePath);
          } catch (err: any) {
            rejectInFlight(err);
          } finally {
            inFlightDownloads.delete(cacheFilePath);
          }
        });

        const cleanupError = (err: any) => {
          if (isDone) return;
          isDone = true;
          rejectInFlight(err);
          inFlightDownloads.delete(cacheFilePath);
          try {
            response.data.unpipe(diskWriter);
            response.data.unpipe(res);
            response.data.destroy();
          } catch (_e) {}
          try {
            diskWriter.destroy();
          } catch (_e) {}
          fs.promises.unlink(tempFilePath).catch(() => {});

          if (!res.headersSent) {
            res.status(502).json({ error: `Stream failed: ${err.message}` });
          } else if (!res.writableEnded && !isClientClosed) {
            res.destroy(err);
          }
        };

        diskWriter.on('error', cleanupError);
        response.data.on('error', cleanupError);
      } else {
        // Seeking into an uncached file OR an in-flight download is already active:
        // Proxy the requested range slice directly to the client with HTTP 206 for zero-latency seeking,
        // without waiting for the full background download to finish.
        const requestHeaders: Record<string, string> = {};
        if (rangeHeader) {
          requestHeaders.Range = rangeHeader;
        }

        const response = await axios({
          method: 'get',
          url: resolvedSource,
          headers: requestHeaders,
          responseType: 'stream',
          timeout: 30000,
          validateStatus: (status) => status >= 200 && status < 300,
        });

        const clientHeaders: Record<string, string> = {
          'Content-Type': String(response.headers['content-type'] || 'video/mp4'),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        };
        if (response.headers['content-range']) {
          clientHeaders['Content-Range'] = String(response.headers['content-range']);
        }
        if (response.headers['content-length']) {
          clientHeaders['Content-Length'] = String(response.headers['content-length']);
        }

        res.writeHead(response.status, clientHeaders);

        const onClientClose = () => {
          try {
            response.data.destroy();
          } catch (_e) {}
        };
        req.on('close', onClientClose);
        res.on('close', onClientClose);

        res.on('error', (_err: any) => {
          try {
            response.data.destroy();
          } catch (_e) {}
        });

        response.data.on('error', (err: any) => {
          console.error('[B2 Video Proxy] Range stream error:', err.message);
          try {
            if (!res.headersSent) {
              res
                .status(502)
                .json({ error: `Failed to stream video: ${err.message}` });
            } else if (!res.writableEnded) {
              res.destroy(err);
            }
          } catch (_e) {}
        });

        response.data.pipe(res);

        // If not already being cached to disk in background, trigger background caching
        if (!inFlightDownloads.has(cacheFilePath)) {
          ensureVideoCached(safeRelative, resolvedSource).catch((err: any) =>
            console.warn(
              '[B2 Video Cache] Background caching warning:',
              err.message
            )
          );
        }
      }
    } catch (err: any) {
      console.error('[B2 Video Proxy] Failed to stream video:', err.message);
      if (!res.headersSent) {
        res
          .status(502)
          .json({ error: `Failed to retrieve video: ${err.message}` });
      } else if (!res.writableEnded) {
        res.destroy(err);
      }
    }
  });

  // 5. Server-Side B2 Parsing Route
  app.post('/api/b2/parse', async (req: Request, res: Response) => {
    try {
      const keyId = req.body?.keyId || process.env.B2_KEY_ID;
      const appKey = req.body?.appKey || process.env.B2_APP_KEY;
      const bucketName = req.body?.bucketName || process.env.B2_BUCKET_NAME;
      const forceRefresh = req.body?.refresh === true;

      if (!keyId || !appKey || !bucketName) {
        return res.status(400).json({
          error:
            'Missing required parameters: keyId, appKey, or bucketName (and not set in .env)',
        });
      }

      // Return cached data if available and not forced to refresh
      const isDefaultConfig =
        keyId === process.env.B2_KEY_ID &&
        appKey === process.env.B2_APP_KEY &&
        bucketName === process.env.B2_BUCKET_NAME;

      if (
        isDefaultConfig &&
        cachedB2Data &&
        !forceRefresh &&
        Date.now() - lastParseTime < CACHE_TTL
      ) {
        console.log(
          `[B2 Server Parser] Returning cached data (${cachedB2Data.events.length} events)`
        );
        return res.json(cachedB2Data);
      }

      const result = await performB2Parse(keyId, appKey, bucketName);

      // Only cache if using default config
      if (isDefaultConfig) {
        cachedB2Data = result;
        lastParseTime = Date.now();
      }

      res.json(result);
    } catch (e: any) {
      console.error('[B2 Server Parser] Error:', e.response?.data || e.message);
      if (!res.headersSent) {
        res.status(500).json({ error: e.message });
      }
    }
  });
}
