/**
 * TeslaCamViewer Application Entry Point (TypeScript)
 * Bundles application modules in dependency order and mounts the top-level App.vue shell.
 */

import { createApp } from 'vue';
import App from './components/App.vue';

// Core Parsers & Managers
import '../js/folderParser.js';
import '../js/folderManager.js';
import '../js/eventFilter.js';
import '../js/eventBrowser.js';
import '../js/mapView.js';
import '../js/videoPlayer.js';
import '../js/fileSystemObserver.js';
import '../js/syncController.js';

// Layout Management
import '../js/layoutConfig.js';
import '../js/layoutRenderer.js';
import '../js/layoutManager.js';

// Overlays & Sensors
import '../js/screenshotCapture.js';
import '../js/videoEnhancer.js';
import '../js/weatherService.js';

// Export & Reports
import '../js/videoExport.js';

// Settings & Metadata
import '../js/settingsManager.js';
import '../js/versionManager.js';
import '../js/statisticsManager.js';

// B2 Cloud Client
import '../js/b2Client.js';

// Mount Vue App
const app = createApp(App);
app.mount('#app');
