require('dotenv').config();
const express = require('express');
const axios = require('axios');
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
 * Perform the B2 parsing logic
 */
async function performB2Parse(keyId, appKey, bucketName) {
    console.log(`[B2 Server Parser] Starting parse for bucket: ${bucketName}`);

    // A. Authorize
    const auth = Buffer.from(`${keyId}:${appKey}`).toString('base64');
    const authResp = await axios.get('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
        headers: { 'Authorization': `Basic ${auth}` }
    });

    const { apiUrl, downloadUrl } = authResp.data.apiInfo.storageApi;
    const authToken = authResp.data.authorizationToken;
    const accountId = authResp.data.accountId;

    // B. Get Bucket ID
    const bucketsResp = await axios.post(`${apiUrl}/b2api/v3/b2_list_buckets`, 
        { accountId, bucketName },
        { headers: { 'Authorization': authToken } }
    );
    
    const bucket = bucketsResp.data.buckets.find(b => b.bucketName === bucketName);
    if (!bucket) throw new Error('Bucket not found');
    const bucketId = bucket.bucketId;

    // C. List Files
    let allFiles = [];
    let startFileName = null;
    while (true) {
        const listResp = await axios.post(`${apiUrl}/b2api/v3/b2_list_file_names`, 
            { bucketId, startFileName, maxFileCount: 10000 },
            { headers: { 'Authorization': authToken } }
        );
        
        allFiles = allFiles.concat(listResp.data.files);
        if (listResp.data.nextFileName) startFileName = listResp.data.nextFileName;
        else break;
    }

    // D. Get Download Authorization Token
    const downloadAuthResp = await axios.post(`${apiUrl}/b2api/v3/b2_get_download_authorization`, 
        { bucketId, fileNamePrefix: '', validDurationInSeconds: 86400 },
        { headers: { 'Authorization': authToken } }
    );

    const downloadToken = downloadAuthResp.data.authorizationToken;

    // E. Parse files into events
    const eventsMap = new Map();

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
            let timestamp = eventFolderName;
            if (tsMatch) {
                timestamp = `${tsMatch[1]}T${tsMatch[2].replace(/-/g, ':')}`;
            }

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
            try {
                const metadataResp = await axios.get(fileUrl);
                event.metadata = metadataResp.data;
            } catch (e) {
                console.warn(`[Parser] Failed to fetch metadata for ${eventKey}`);
            }
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
