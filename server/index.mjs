import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import registerB2Routes, {
  getCachedB2Data,
  organizeB2Events,
  performB2Parse,
  setCachedB2Data,
} from './b2API.mjs';
import registerFfmpegRoutes, { exportJobs } from './ffmpegAPI.mjs';

const app = express();
const PORT = process.env.PORT || 8000;
const rootDir = path.resolve(import.meta.dirname, '..');

// Middleware
app.use(cors());
app.use(express.json());

// API Routes FIRST
registerB2Routes(app);
registerFfmpegRoutes(app);

// 4. Static File Server
app.use(express.static(rootDir));

// Default to index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

function isEntryFile() {
  if (!process.argv[1]) return false;
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const invokedFile = path.resolve(process.argv[1]);
    return (
      invokedFile === currentFile ||
      invokedFile === path.dirname(currentFile) ||
      invokedFile === path.join(path.dirname(currentFile), 'index.mjs')
    );
  } catch (_e) {
    return false;
  }
}

if (isEntryFile()) {
  // Periodic cleanup of completed/failed export jobs older than 1 hour
  // Check if this is an entry file to prevent test imports from hanging
  setInterval(() => {
    const oneHourAgo = Date.now() - 3600 * 1000;
    for (const [jobId, job] of exportJobs.entries()) {
      if (job.createdAt < oneHourAgo) {
        if (job.outputPath && fs.existsSync(job.outputPath)) {
          try {
            fs.unlinkSync(job.outputPath);
          } catch (_e) {}
        }
        exportJobs.delete(jobId);
      }
    }
  }, 600 * 1000);

  app.listen(PORT, async () => {
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
      } catch (e) {
        console.error('[B2 Server Parser] Preload failed:', e.message);
      }
    }
  });
}

export {
  app,
  exportJobs,
  getCachedB2Data,
  organizeB2Events,
  performB2Parse,
  setCachedB2Data,
};
export default app;
