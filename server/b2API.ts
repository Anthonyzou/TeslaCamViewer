import axios from 'axios';
import B2 from 'backblaze-b2';
import type { Application, Request, Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
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
const MAX_CACHE_BACKLOG_BYTES = 32 * 1024 * 1024;
const rootDir = path.resolve(import.meta.dirname, '..');

export function getEnvB2Credentials(): {
  keyId: string;
  appKey: string;
  bucketName: string;
} | null {
  const { B2_KEY_ID, B2_APP_KEY, B2_BUCKET_NAME } = process.env;
  if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET_NAME) return null;
  return { keyId: B2_KEY_ID, appKey: B2_APP_KEY, bucketName: B2_BUCKET_NAME };
}

function toSafeRelativePath(filePath: string): string {
  return path
    .normalize(filePath)
    .replace(/^(\.\.[\/\\])+/, '')
    .replace(/^[/\\]+/, '');
}

function isValidUrl(value: string): boolean {
  try {
    void new URL(value);
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * The explicit `file` param wins; otherwise the basename of the `url` param is used.
 * An unparseable `url` is ignored here so callers decide whether that is an error.
 */
function resolveRequestedFile(fileParam?: string, urlParam?: string): string {
  let fromUrl: string | null = null;
  if (urlParam) {
    try {
      fromUrl = path.basename(new URL(urlParam).pathname);
    } catch (_err) {}
  }
  return toSafeRelativePath(fileParam || fromUrl || '');
}

// Relative values resolve against the project root, not the launch directory
export const VIDEO_CACHE_DIR = process.env.VIDEO_CACHE_DIR
  ? path.resolve(rootDir, process.env.VIDEO_CACHE_DIR)
  : path.resolve(rootDir, '.cache', 'videos');
export const MAX_CACHE_BYTES = process.env.VIDEO_CACHE_MAX_GB
  ? parseInt(process.env.VIDEO_CACHE_MAX_GB, 10) * 1024 * 1024 * 1024
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

export const inFlightDownloads = new Map<string, Promise<string>>();

// Queue for preloading videos in background with bounded concurrency
export const MAX_PRELOAD_CONCURRENCY = 30;
export const preloadQueue: Array<() => Promise<void>> = [];
export let activePreloadCount = 0;

export function pumpPreloadQueue(): void {
  while (
    activePreloadCount < MAX_PRELOAD_CONCURRENCY &&
    preloadQueue.length > 0
  ) {
    const task = preloadQueue.shift()!;
    activePreloadCount++;
    task().finally(() => {
      activePreloadCount--;
      pumpPreloadQueue();
    });
  }
}

export function scheduleVideoPreload(
  safeRelative: string,
  resolvedSource: string
): void {
  const cacheFilePath = path.join(VIDEO_CACHE_DIR, safeRelative);
  if (fs.existsSync(cacheFilePath) || inFlightDownloads.has(cacheFilePath)) {
    return;
  }
  preloadQueue.push(async () => {
    try {
      await ensureVideoCached(safeRelative, resolvedSource);
    } catch (err: any) {
      console.warn('[B2 Video Cache] Preload warning:', err.message);
    }
  });
  pumpPreloadQueue();
}

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
let prunePending = false;
// Null until seeded by a real scan; afterwards kept in step with the cache dir by the server's own writes and evictions
let cachedBytes: number | null = null;

const STAT_CONCURRENCY = 32;

interface CachedVideoFile {
  path: string;
  size: number;
  atime: number;
}

/**
 * Collect every finished cache file under `dir`, skipping in-progress `.tmp.` downloads.
 * Subdirectories are walked in parallel to suit SSD queue depths; stats run in bounded batches.
 */
async function listCacheFiles(dir: string): Promise<CachedVideoFile[]> {
  if (!fs.existsSync(dir)) return [];
  const filePaths: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && !entry.name.includes('.tmp.')) {
          filePaths.push(fullPath);
        }
      })
    );
  }

  await walk(dir);

  const files: CachedVideoFile[] = [];
  for (let i = 0; i < filePaths.length; i += STAT_CONCURRENCY) {
    const batch = await Promise.all(
      filePaths.slice(i, i + STAT_CONCURRENCY).map(async (filePath) => {
        try {
          const stats = await fs.promises.stat(filePath);
          return {
            path: filePath,
            size: stats.size,
            atime: stats.atimeMs || stats.mtimeMs,
          };
        } catch (err: any) {
          // A concurrent prune or clear may remove a file between the walk and the stat
          if (err.code === 'ENOENT') return null;
          throw err;
        }
      })
    );
    for (const file of batch) {
      if (file) files.push(file);
    }
  }
  return files;
}

async function pruneOnce(targetDir: string, maxBytes: number): Promise<void> {
  const files = await listCacheFiles(targetDir);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  let currentSize = totalSize;

  if (totalSize > maxBytes) {
    // Sort by atime ascending (oldest first)
    files.sort((a, b) => a.atime - b.atime);

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
  }

  if (targetDir === VIDEO_CACHE_DIR) {
    cachedBytes = currentSize;
  }
}

/**
 * Prune video cache when disk usage exceeds threshold.
 * A request that arrives mid-prune is queued and runs once more after the current pass.
 */
export async function pruneVideoCache(
  targetDir: string = VIDEO_CACHE_DIR,
  maxBytes: number = MAX_CACHE_BYTES
): Promise<void> {
  if (prunning) {
    prunePending = true;
    return;
  }
  prunning = true;
  try {
    do {
      prunePending = false;
      await pruneOnce(targetDir, maxBytes);
    } while (prunePending);
  } catch (err: any) {
    console.warn('[B2 Video Cache] Eviction error:', err.message);
  } finally {
    prunning = false;
  }
}

/**
 * Add a freshly cached file to the running total and only scan when the total is unknown or over the limit
 */
function recordCachedFile(cacheFilePath: string): void {
  if (cachedBytes === null) {
    pruneVideoCache().catch(() => {});
    return;
  }
  fs.promises
    .stat(cacheFilePath)
    .then((stats) => {
      if (cachedBytes !== null) cachedBytes += stats.size;
      if (cachedBytes === null || cachedBytes > MAX_CACHE_BYTES) {
        return pruneVideoCache();
      }
    })
    .catch((err: any) =>
      console.warn('[B2 Video Cache] Pruning warning:', err.message)
    );
}

/**
 * Retrieve current video cache stats (parallel async traversal for SSDs)
 */
export async function getVideoCacheStatus(): Promise<VideoCacheStatus> {
  const files = await listCacheFiles(VIDEO_CACHE_DIR);
  return {
    enabled: true,
    cacheDir: VIDEO_CACHE_DIR,
    totalFiles: files.length,
    totalBytes: files.reduce((sum, f) => sum + f.size, 0),
    maxBytes: MAX_CACHE_BYTES,
  };
}

/**
 * Clear the video disk cache directory
 */
export async function clearVideoCache(): Promise<void> {
  preloadQueue.length = 0;
  // Node sets NODE_TEST_CONTEXT in every test process; tests may only clear directories under the OS temp dir
  const tmpRoot = path.resolve(os.tmpdir()) + path.sep;
  if (
    process.env.NODE_TEST_CONTEXT &&
    !path.resolve(VIDEO_CACHE_DIR).startsWith(tmpRoot)
  ) {
    throw new Error(
      'Refusing to clear a non-temp video cache during a test run; set VIDEO_CACHE_DIR to a directory under os.tmpdir()'
    );
  }
  if (fs.existsSync(VIDEO_CACHE_DIR)) {
    await fs.promises.rm(VIDEO_CACHE_DIR, { recursive: true, force: true });
    await fs.promises.mkdir(VIDEO_CACHE_DIR, { recursive: true });
  }
  cachedBytes = 0;
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
  const safeRelative = toSafeRelativePath(fileParam || '');

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

      recordCachedFile(cacheFilePath);

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

const VIDEO_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function baseVideoHeaders(
  upstreamContentType: unknown
): Record<string, string> {
  return {
    'Content-Type': String(upstreamContentType || 'video/mp4'),
    'Accept-Ranges': 'bytes',
    'Cache-Control': VIDEO_CACHE_CONTROL,
  };
}

// Only a request starting at byte 0 can be teed into the disk cache in full
function isBeginningRange(rangeHeader: string | undefined): boolean {
  return !rangeHeader || rangeHeader.startsWith('bytes=0-');
}

function sendCachedVideo(res: Response, cacheFilePath: string): void {
  res.sendFile(
    cacheFilePath,
    {
      acceptRanges: true,
      // The cache lives under `.cache/`, which Express 5's `send` would otherwise hide as a dotfile
      dotfiles: 'allow',
      headers: { 'Cache-Control': VIDEO_CACHE_CONTROL },
    },
    (err?: any) => {
      if (
        err &&
        !res.headersSent &&
        err.code !== 'ECONNABORTED' &&
        err.code !== 'ECANCELED'
      ) {
        console.warn('[B2 Video Proxy] sendFile error:', err.message);
      }
    }
  );
}

/**
 * Stream the full video to the client while writing the same bytes to the disk cache
 */
async function streamAndCacheVideo(
  req: Request,
  res: Response,
  resolvedSource: string,
  cacheFilePath: string,
  rangeHeader: string | undefined
): Promise<void> {
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
  const clientHeaders = baseVideoHeaders(response.headers['content-type']);

  if (rangeHeader && totalLength) {
    const totalNum = parseInt(totalLength, 10);
    clientHeaders['Content-Range'] = `bytes 0-${totalNum - 1}/${totalLength}`;
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
      response.data.resume();
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
      response.data.resume();
    } catch (_e) {}
  };
  res.on('error', onResError);

  // Tee stream: Send to client response immediately for instant playback
  response.data.pipe(res);

  // Disk writes are fed from a separate listener, not a pipe, so a slow disk never pauses the origin stream.
  const abandonCache = (reason: string) => {
    if (isDone) return;
    isDone = true;
    console.warn('[B2 Video Cache] Skipping disk cache:', reason);
    rejectInFlight(new Error(reason));
    inFlightDownloads.delete(cacheFilePath);
    diskWriter.once('close', () => {
      fs.promises.unlink(tempFilePath).catch(() => {});
    });
    diskWriter.destroy();
  };

  response.data.on('data', (chunk: Buffer) => {
    if (isDone) return;
    if (diskWriter.writableLength + chunk.length > MAX_CACHE_BACKLOG_BYTES) {
      abandonCache('disk writer fell behind the origin stream');
      return;
    }
    diskWriter.write(chunk);
  });
  response.data.on('end', () => {
    if (!isDone) diskWriter.end();
  });

  diskWriter.on('finish', async () => {
    if (isDone) return;
    isDone = true;
    try {
      await fs.promises.rename(tempFilePath, cacheFilePath);
      recordCachedFile(cacheFilePath);
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
}

/**
 * Proxy only the requested byte range to the client with HTTP 206 for zero-latency seeking,
 * without waiting for a background download to finish. Starts a background cache if none is running.
 */
async function proxyVideoRange(
  req: Request,
  res: Response,
  resolvedSource: string,
  safeRelative: string,
  cacheFilePath: string,
  rangeHeader: string | undefined
): Promise<void> {
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

  const clientHeaders = baseVideoHeaders(response.headers['content-type']);
  if (response.headers['content-range']) {
    clientHeaders['Content-Range'] = String(response.headers['content-range']);
  }
  if (response.headers['content-length']) {
    clientHeaders['Content-Length'] = String(
      response.headers['content-length']
    );
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
      console.warn('[B2 Video Cache] Background caching warning:', err.message)
    );
  }
}

export default function registerB2Routes(app: Application): void {
  // 1. Server-Side B2 Status/Config Route
  app.get('/api/b2/config', (_req: Request, res: Response) => {
    res.json({
      isConfigured: getEnvB2Credentials() !== null,
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

        const safeRelative = resolveRequestedFile(fileParam, urlParam);

        if (!safeRelative) continue;

        const resolvedSource = resolveSourceUrl(safeRelative, urlParam);
        if (resolvedSource) {
          scheduled.push(safeRelative);
          // Queue background caching with bounded concurrency so it doesn't choke active playback
          scheduleVideoPreload(safeRelative, resolvedSource);
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

      if (urlParam && !isValidUrl(urlParam)) {
        return res.status(400).json({ error: 'Invalid url query parameter' });
      }

      const safeRelative = resolveRequestedFile(fileParam, urlParam);
      if (!safeRelative) {
        return res.status(400).json({ error: 'Invalid file parameter' });
      }

      const cacheFilePath = path.join(VIDEO_CACHE_DIR, safeRelative);

      if (fs.existsSync(cacheFilePath)) {
        touchCacheFile(cacheFilePath);
        return sendCachedVideo(res, cacheFilePath);
      }

      const resolvedSource = resolveSourceUrl(safeRelative, urlParam);
      if (!resolvedSource) {
        return res
          .status(400)
          .json({ error: 'No source URL configured for this video' });
      }

      const rangeHeader = req.headers.range;
      if (
        isBeginningRange(rangeHeader) &&
        !inFlightDownloads.has(cacheFilePath)
      ) {
        await streamAndCacheVideo(
          req,
          res,
          resolvedSource,
          cacheFilePath,
          rangeHeader
        );
      } else {
        await proxyVideoRange(
          req,
          res,
          resolvedSource,
          safeRelative,
          cacheFilePath,
          rangeHeader
        );
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
      const envCredentials = getEnvB2Credentials();
      const keyId = req.body?.keyId || envCredentials?.keyId;
      const appKey = req.body?.appKey || envCredentials?.appKey;
      const bucketName = req.body?.bucketName || envCredentials?.bucketName;
      const forceRefresh = req.body?.refresh === true;

      if (!keyId || !appKey || !bucketName) {
        return res.status(400).json({
          error:
            'Missing required parameters: keyId, appKey, or bucketName (and not set in .env)',
        });
      }

      // Return cached data if available and not forced to refresh
      const isDefaultConfig =
        envCredentials !== null &&
        keyId === envCredentials.keyId &&
        appKey === envCredentials.appKey &&
        bucketName === envCredentials.bucketName;

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
