/**
 * TeslaCamViewer Application Entry Point (TypeScript)
 * Bundles application modules in dependency order and mounts the top-level App.vue shell.
 */
import { createApp } from 'vue';

// Internationalization should be first to initalize
import '../js/i18n.js';

import App from './components/App.vue';

// Core Parsers & Managers
import '../js/eventBrowser.js';
import '../js/eventFilter.js';
import '../js/fileSystemObserver.js';
import '../js/folderManager.js';
import '../js/folderParser.js';
import '../js/mapView.js';
import '../js/syncController.js';
import '../js/videoPlayer.js';

// Layout Management
import '../js/layoutConfig.js';
import '../js/layoutManager.js';
import '../js/layoutRenderer.js';

// Overlays & Sensors
import '../js/screenshotCapture.js';
import '../js/videoEnhancer.js';
import '../js/weatherService.js';

// Export & Reports
import '../js/videoExport.js';

// Settings & Metadata
import '../js/settingsManager.js';
import '../js/statisticsManager.js';
import '../js/versionManager.js';

// B2 Cloud Client
import '../js/b2Client.js';

const app = createApp(App);
app.mount('#app');
