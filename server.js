require('dotenv').config();
const express = require('express');
const axios = require('axios');
const B2 = require('backblaze-b2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = process.env.PORT || 8000;

// Export jobs map and temporary directory
const exportJobs = new Map();
const EXPORT_DIR = path.join(os.tmpdir(), 'teslacam_exports');
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Cache for B2 data
let cachedB2Data = null;
let lastParseTime = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Perform the B2 parsing logic using the backblaze-b2 SDK
 */
async function performB2Parse(keyId, appKey, bucketName) {
  console.log(`[B2 Server Parser] Starting parse for bucket: ${bucketName}`);

  const b2 = new B2({
    applicationKeyId: keyId,
    applicationKey: appKey,
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
  let allFiles = [];
  let startFileName = null;
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
async function organizeB2Events(
  allFiles,
  bucketName,
  downloadUrl,
  downloadToken
) {
  const eventsMap = new Map();
  const metadataFetches = [];

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
      const tsMatch = eventFolderName.match(
        /^(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})$/
      );
      const timestamp = tsMatch
        ? `${tsMatch[1]}T${tsMatch[2].replace(/-/g, ':')}`
        : eventFolderName;

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

    const event = eventsMap.get(eventKey);
    const fileName = pathParts[pathParts.length - 1];
    const fileUrl = `${downloadUrl}/file/${bucketName}/${file.fileName}?Authorization=${encodeURIComponent(downloadToken)}`;

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
      event.eventVideoUrl = fileUrl;
    } else if (fileName.endsWith('.mp4')) {
      const clipMatch = fileName.match(
        /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})-(front|back|left_repeater|right_repeater|left_pillar|right_pillar)\.mp4$/
      );
      if (clipMatch) {
        event.clips.push({
          timestamp: clipMatch[1],
          camera: clipMatch[2],
          fileName: fileName,
          url: fileUrl,
        });
      }
    }
  }

  // Fetch event metadata concurrently rather than blocking file traversal serially
  if (metadataFetches.length > 0) {
    await Promise.all(metadataFetches);
  }

  const finalEvents = Array.from(eventsMap.values()).filter(
    (e) => e.clips.length > 0
  );

  for (const event of finalEvents) {
    const groups = new Map();
    for (const clip of event.clips) {
      if (!groups.has(clip.timestamp)) {
        groups.set(clip.timestamp, {
          timestamp: clip.timestamp,
          clips: {},
        });
      }
      groups.get(clip.timestamp).clips[clip.camera] = clip;
    }

    event.clipGroups = Array.from(groups.values());
    event.clipGroups.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    event.isEmpty = event.clipGroups.length === 0;
    event.hasPillarCameras = event.clips.some(
      (c) => c.camera === 'left_pillar' || c.camera === 'right_pillar'
    );

    event.driveId = 'b2';
    event.driveLabel = 'Backblaze B2';
    event.driveColor = '#003399';
    event.compoundKey = `b2:${event.name}`;
  }

  finalEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    events: finalEvents,
    stats: { totalFiles: allFiles.length, eventCount: finalEvents.length },
  };
}

// 1. Server-Side B2 Status/Config Route
app.get('/api/b2/config', (req, res) => {
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

// 2. Server-Side B2 Parsing Route
app.post('/api/b2/parse', async (req, res) => {
  const keyId = req.body.keyId || process.env.B2_KEY_ID;
  const appKey = req.body.appKey || process.env.B2_APP_KEY;
  const bucketName = req.body.bucketName || process.env.B2_BUCKET_NAME;
  const forceRefresh = req.body.refresh === true;

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

  try {
    const result = await performB2Parse(keyId, appKey, bucketName);

    // Only cache if using default config
    if (isDefaultConfig) {
      cachedB2Data = result;
      lastParseTime = Date.now();
    }

    res.json(result);
  } catch (e) {
    console.error('[B2 Server Parser] Error:', e.response?.data || e.message);
    res.status(500).json({ error: e.message });
  }
});

// 3. Server-Side FFmpeg Video Export Routes
app.post('/api/export', (req, res) => {
  const {
    eventName,
    camera = 'all',
    format = 'mp4',
    clips,
    inPoint,
    outPoint,
  } = req.body;

  if (!clips || Object.keys(clips).length === 0) {
    return res.status(400).json({ error: 'No clips provided for export' });
  }

  const jobId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ext = format === 'gif' ? 'gif' : 'mp4';
  const filename = `TeslaCam_${eventName || 'Export'}_${camera}.${ext}`;
  const outputPath = path.join(EXPORT_DIR, `${jobId}.${ext}`);

  const job = {
    id: jobId,
    status: 'encoding',
    percent: 0,
    outputPath,
    filename,
    createdAt: Date.now(),
    error: null,
    command: null,
  };

  exportJobs.set(jobId, job);

  try {
    const cmd = ffmpeg();
    const trimStart = Number.isFinite(inPoint) && inPoint > 0 ? inPoint : null;
    const trimDuration =
      Number.isFinite(outPoint) && outPoint > (inPoint || 0)
        ? outPoint - (inPoint || 0)
        : null;

    if (camera !== 'all' && clips[camera]) {
      cmd.input(clips[camera]);
      if (trimStart !== null) cmd.seekInput(trimStart);
      if (trimDuration !== null) cmd.setDuration(trimDuration);

      if (format === 'gif') {
        cmd.complexFilter([
          'fps=15,scale=640:-1:flags=lanczos,split[s0][s1]',
          '[s0]palettegen[p]',
          '[s1][p]paletteuse',
        ]);
      } else {
        cmd
          .videoCodec('libx264')
          .outputOptions([
            '-preset fast',
            '-crf 22',
            '-pix_fmt yuv420p',
            '-movflags +faststart',
          ]);
      }
    } else {
      const is6Cam = !!(clips.left_pillar && clips.right_pillar);
      const cameraOrder = is6Cam
        ? [
            'left_pillar',
            'front',
            'right_pillar',
            'left_repeater',
            'back',
            'right_repeater',
          ]
        : ['front', 'back', 'left_repeater', 'right_repeater'];
      const activeCameras = cameraOrder.filter((c) => !!clips[c]);

      if (activeCameras.length === 0) {
        Object.keys(clips).forEach((c) => activeCameras.push(c));
      }

      activeCameras.forEach((cam) => {
        cmd.input(clips[cam]);
        if (trimStart !== null) {
          cmd.seekInput(trimStart);
        }
      });

      if (trimDuration !== null) cmd.setDuration(trimDuration);

      let filterChain;
      if (activeCameras.length === 6) {
        filterChain = [
          '[0:v]scale=640:360[v0]',
          '[1:v]scale=640:360[v1]',
          '[2:v]scale=640:360[v2]',
          '[3:v]scale=640:360[v3]',
          '[4:v]scale=640:360[v4]',
          '[5:v]scale=640:360[v5]',
          '[v0][v1][v2]hstack=inputs=3[top]',
          '[v3][v4][v5]hstack=inputs=3[bottom]',
          '[top][bottom]vstack=inputs=2[v]',
        ];
      } else if (activeCameras.length === 4) {
        filterChain = [
          '[0:v]scale=960:540[v0]',
          '[1:v]scale=960:540[v1]',
          '[2:v]scale=960:540[v2]',
          '[3:v]scale=960:540[v3]',
          '[v0][v1]hstack=inputs=2[top]',
          '[v2][v3]hstack=inputs=2[bottom]',
          '[top][bottom]vstack=inputs=2[v]',
        ];
      } else if (activeCameras.length === 3) {
        filterChain = [
          '[0:v]scale=1920:540[top]',
          '[1:v]scale=960:540[b1]',
          '[2:v]scale=960:540[b2]',
          '[b1][b2]hstack=inputs=2[bottom]',
          '[top][bottom]vstack=inputs=2[v]',
        ];
      } else if (activeCameras.length === 2) {
        filterChain = [
          '[0:v]scale=960:540[v0]',
          '[1:v]scale=960:540[v1]',
          '[v0][v1]hstack=inputs=2[v]',
        ];
      } else {
        filterChain = ['[0:v]scale=1280:720[v]'];
      }

      if (format === 'gif') {
        filterChain.push(
          '[v]fps=12,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse'
        );
      } else {
        cmd
          .videoCodec('libx264')
          .outputOptions([
            '-map [v]',
            '-preset fast',
            '-crf 22',
            '-pix_fmt yuv420p',
            '-movflags +faststart',
          ]);
      }

      cmd.complexFilter(filterChain);
    }

    cmd.output(outputPath);

    cmd.on('progress', (progress) => {
      if (progress.percent) {
        job.percent = Math.min(100, Math.max(0, Math.round(progress.percent)));
      }
    });

    cmd.on('end', () => {
      try {
        const stats = fs.statSync(outputPath);
        if (stats.size < 1000) {
          job.status = 'error';
          job.error = 'Export produced an empty video file';
          console.error(
            `[Export] Job ${jobId} produced empty file (${stats.size} bytes): ${outputPath}`
          );
          return;
        }
      } catch (e) {
        job.status = 'error';
        job.error = 'Export failed to produce output file';
        return;
      }
      job.status = 'completed';
      job.percent = 100;
      console.log(`[Export] Job ${jobId} completed: ${outputPath}`);
    });

    cmd.on('error', (err) => {
      if (job.status !== 'cancelled') {
        job.status = 'error';
        job.error = err.message;
        console.error(`[Export] Job ${jobId} error:`, err.message);
      }
    });

    job.command = cmd;
    cmd.run();

    res.json({ jobId, status: 'encoding' });
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/status/:jobId', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Export job not found' });
  }
  res.json({
    id: job.id,
    status: job.status,
    percent: job.percent,
    error: job.error,
    filename: job.filename,
  });
});

app.get('/api/export/download/:jobId', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (!job || job.status !== 'completed' || !fs.existsSync(job.outputPath)) {
    return res
      .status(404)
      .json({ error: 'Export file not found or not yet complete' });
  }
  res.download(job.outputPath, job.filename);
});

app.post('/api/export/cancel/:jobId', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (job) {
    job.status = 'cancelled';
    if (job.command) {
      try {
        job.command.kill('SIGKILL');
      } catch (e) {}
    }
    if (job.outputPath && fs.existsSync(job.outputPath)) {
      try {
        fs.unlinkSync(job.outputPath);
      } catch (e) {}
    }
  }
  res.json({ success: true });
});

// 4. Static File Server
app.use(express.static(__dirname));

// Default to index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  // Periodically clean up completed or failed export jobs older than 1 hour
  setInterval(() => {
    const oneHourAgo = Date.now() - 3600 * 1000;
    for (const [jobId, job] of exportJobs.entries()) {
      if (job.createdAt < oneHourAgo) {
        if (job.outputPath && fs.existsSync(job.outputPath)) {
          try {
            fs.unlinkSync(job.outputPath);
          } catch (e) {}
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
        cachedB2Data = await performB2Parse(
          process.env.B2_KEY_ID,
          process.env.B2_APP_KEY,
          process.env.B2_BUCKET_NAME
        );
        lastParseTime = Date.now();
        console.log(
          `[B2 Server Parser] Preload complete: ${cachedB2Data.events.length} events found.`
        );
      } catch (e) {
        console.error('[B2 Server Parser] Preload failed:', e.message);
      }
    }
  });
}

module.exports = { app, performB2Parse, organizeB2Events, exportJobs };
