require('dotenv').config();
const express = require('express');
const axios = require('axios');
const B2 = require('backblaze-b2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

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
        applicationKey: appKey
    });

    await b2.authorize();

    // 1. Get Bucket ID
    const bucketsResp = await b2.getBucket({ bucketName });
    const bucket = bucketsResp.data.buckets.find(b => b.bucketName === bucketName);
    if (!bucket) throw new Error('Bucket not found');
    const bucketId = bucket.bucketId;

    // 2. List all files (with pagination)
    let allFiles = [];
    let startFileName = null;
    while (true) {
        const listResp = await b2.listFileNames({
            bucketId,
            startFileName,
            maxFileCount: 10000
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
        validDurationInSeconds: 86400
    });

    const downloadToken = downloadAuthResp.data.authorizationToken;
    const downloadUrl = b2.downloadUrl;

    // 4. Parse files into structured events
    return await organizeB2Events(allFiles, bucketName, downloadUrl, downloadToken);
}

/**
 * Group raw B2 files into TeslaCam events and clip groups
 */
async function organizeB2Events(allFiles, bucketName, downloadUrl, downloadToken) {
    const eventsMap = new Map();
    const metadataFetches = [];

    for (const file of allFiles) {
        const pathParts = file.fileName.split('/');
        if (pathParts.length < 3) continue;

        const typeIndex = pathParts.findIndex(p => ['SavedClips', 'SentryClips', 'RecentClips'].includes(p));
        if (typeIndex === -1 || typeIndex + 1 >= pathParts.length) continue;

        const type = pathParts[typeIndex];
        const eventFolderName = pathParts[typeIndex + 1];
        const eventKey = `${type}/${eventFolderName}`;

        if (!eventsMap.has(eventKey)) {
            const tsMatch = eventFolderName.match(/^(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})$/);
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
                eventVideoUrl: null
            });
        }

        const event = eventsMap.get(eventKey);
        const fileName = pathParts[pathParts.length - 1];
        const fileUrl = `${downloadUrl}/file/${bucketName}/${file.fileName}?Authorization=${encodeURIComponent(downloadToken)}`;

        if (fileName === 'event.json') {
            metadataFetches.push(
                axios.get(fileUrl)
                    .then(resp => { event.metadata = resp.data; })
                    .catch(() => console.warn(`[Parser] Failed to fetch metadata for ${eventKey}`))
            );
        } else if (fileName === 'thumb.png') {
            event.thumbnailUrl = fileUrl;
        } else if (fileName === 'event.mp4') {
            event.eventVideoUrl = fileUrl;
        } else if (fileName.endsWith('.mp4')) {
            const clipMatch = fileName.match(/^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})-(front|back|left_repeater|right_repeater|left_pillar|right_pillar)\.mp4$/);
            if (clipMatch) {
                event.clips.push({
                    timestamp: clipMatch[1],
                    camera: clipMatch[2],
                    fileName: fileName,
                    url: fileUrl
                });
            }
        }
    }

    // Fetch event metadata concurrently rather than blocking file traversal serially
    if (metadataFetches.length > 0) {
        await Promise.all(metadataFetches);
    }

    const finalEvents = Array.from(eventsMap.values()).filter(e => e.clips.length > 0);

    for (const event of finalEvents) {
        const groups = new Map();
        for (const clip of event.clips) {
            if (!groups.has(clip.timestamp)) {
                groups.set(clip.timestamp, {
                    timestamp: clip.timestamp,
                    clips: {}
                });
            }
            groups.get(clip.timestamp).clips[clip.camera] = clip;
        }

        event.clipGroups = Array.from(groups.values());
        event.clipGroups.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        event.isEmpty = event.clipGroups.length === 0;
        event.hasPillarCameras = event.clips.some(c => c.camera === 'left_pillar' || c.camera === 'right_pillar');

        event.driveId = 'b2';
        event.driveLabel = 'Backblaze B2';
        event.driveColor = '#003399';
        event.compoundKey = `b2:${event.name}`;
    }

    finalEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return { 
        events: finalEvents,
        stats: { totalFiles: allFiles.length, eventCount: finalEvents.length }
    };
}

// 1. Server-Side B2 Status/Config Route
app.get('/api/b2/config', (req, res) => {
    res.json({
        isConfigured: !!(process.env.B2_KEY_ID && process.env.B2_APP_KEY && process.env.B2_BUCKET_NAME),
        isPreloaded: !!cachedB2Data,
        lastParseTime: lastParseTime
    });
});

// 2. Server-Side B2 Parsing Route
app.post('/api/b2/parse', async (req, res) => {
    const keyId = req.body.keyId || process.env.B2_KEY_ID;
    const appKey = req.body.appKey || process.env.B2_APP_KEY;
    const bucketName = req.body.bucketName || process.env.B2_BUCKET_NAME;
    const forceRefresh = req.body.refresh === true;

    if (!keyId || !appKey || !bucketName) {
        return res.status(400).json({ error: 'Missing required parameters: keyId, appKey, or bucketName (and not set in .env)' });
    }

    // Return cached data if available and not forced to refresh
    const isDefaultConfig = keyId === process.env.B2_KEY_ID && 
                           appKey === process.env.B2_APP_KEY && 
                           bucketName === process.env.B2_BUCKET_NAME;

    if (isDefaultConfig && cachedB2Data && !forceRefresh && (Date.now() - lastParseTime < CACHE_TTL)) {
        console.log(`[B2 Server Parser] Returning cached data (${cachedB2Data.events.length} events)`);
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

// 2. Static File Server
app.use(express.static(__dirname));

// Default to index.html for unknown routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`TeslaCamViewer Server running at http://localhost:${PORT}`);

        // Preload if env variables are set
        if (process.env.B2_KEY_ID && process.env.B2_APP_KEY && process.env.B2_BUCKET_NAME) {
            console.log('[B2 Server Parser] Preloading data from environment variables...');
            try {
                cachedB2Data = await performB2Parse(
                    process.env.B2_KEY_ID, 
                    process.env.B2_APP_KEY, 
                    process.env.B2_BUCKET_NAME
                );
                lastParseTime = Date.now();
                console.log(`[B2 Server Parser] Preload complete: ${cachedB2Data.events.length} events found.`);
            } catch (e) {
                console.error('[B2 Server Parser] Preload failed:', e.message);
            }
        }
    });
}

module.exports = { app, performB2Parse, organizeB2Events };
