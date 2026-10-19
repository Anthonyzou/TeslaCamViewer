import axios from 'axios';
import B2 from 'backblaze-b2';
import {
  groupClips,
  parseClipFilename,
  parseEventFolderName,
} from '../src/utils/teslaCamFormat.ts';

const CACHE_TTL = 3600 * 1000; // 1 hour

export let cachedB2Data = null;
export let lastParseTime = 0;

export function setCachedB2Data(data, time = Date.now()) {
  cachedB2Data = data;
  lastParseTime = time;
}

export function getCachedB2Data() {
  return { cachedB2Data, lastParseTime };
}

/**
 * Perform the B2 parsing logic using the backblaze-b2 SDK
 */
export async function performB2Parse(keyId, appKey, bucketName) {
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
export async function organizeB2Events(
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
      const parsed = parseClipFilename(fileName);
      if (parsed) {
        event.clips.push({
          timestamp: parsed.timestamp,
          camera: parsed.camera,
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
    event.clipGroups = groupClips(event.clips);
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

export default function registerB2Routes(app) {
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
}
