import 'dotenv/config';

import cors from 'cors';
import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import registerB2Routes, {
  clearVideoCache,
  ensureVideoCached,
  getCachedB2Data,
  getVideoCacheStatus,
  httpAgent,
  httpsAgent,
  organizeB2Events,
  performB2Parse,
  pruneVideoCache,
  setCachedB2Data,
  touchCacheFile,
  VIDEO_CACHE_DIR,
} from './b2API.ts';

const app: Application = express();
const PORT = process.env.PORT || 8000;
const rootDir = path.resolve(import.meta.dirname, '..');

// Middleware
app.use(cors());
app.use(express.json());

// API Routes FIRST
registerB2Routes(app);

// 4. Static File Server
app.use(express.static(rootDir));

// Default to index.html for unknown routes
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(rootDir, 'index.html'), (err?: any) => {
    if (
      err &&
      !res.headersSent &&
      err.code !== 'ECONNABORTED' &&
      err.code !== 'ECANCELED'
    ) {
      res.status(404).end();
    }
  });
});

// Express global error handler middleware (must have 4 arguments)
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  console.error('[Server Error]', err.message || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

function isEntryFile(): boolean {
  if (!process.argv[1]) return false;
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const invokedFile = path.resolve(process.argv[1]);
    return (
      invokedFile === currentFile ||
      invokedFile === path.dirname(currentFile) ||
      invokedFile === path.join(path.dirname(currentFile), 'index.ts') ||
      invokedFile === path.join(path.dirname(currentFile), 'index.mjs')
    );
  } catch (_e) {
    return false;
  }
}

if (isEntryFile()) {
  process.on('unhandledRejection', (reason) => {
    console.error('[Process] Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught Exception:', err);
  });

  const server = app.listen(PORT, async () => {
    console.log(`TeslaCamViewer Server running at http://localhost:${PORT}`);

    // Preload if env variables are set
    if (
      process.env.B2_KEY_ID &&
      process.env.B2_APP_KEY &&
      process.env.B2_BUCKET_NAME
    ) {
      console.log(
        '[B2 Server Parser] Preloading data from environment variables...'
      );
      try {
        const cachedData = await performB2Parse(
          process.env.B2_KEY_ID,
          process.env.B2_APP_KEY,
          process.env.B2_BUCKET_NAME
        );
        setCachedB2Data(cachedData);
        console.log(
          `[B2 Server Parser] Preload complete: ${cachedData.events.length} events found.`
        );
      } catch (e: any) {
        console.error('[B2 Server Parser] Preload failed:', e.message);
      }
    }
  });

  // Optimize browser-to-server HTTP keep-alive timeouts for video scrubbing
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

export {
  app,
  clearVideoCache,
  ensureVideoCached,
  getCachedB2Data,
  getVideoCacheStatus,
  httpAgent,
  httpsAgent,
  organizeB2Events,
  performB2Parse,
  pruneVideoCache,
  setCachedB2Data,
  touchCacheFile,
  VIDEO_CACHE_DIR,
};
export default app;
