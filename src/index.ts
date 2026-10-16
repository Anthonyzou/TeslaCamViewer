/**
 * TeslaCamViewer Application Entry Point (TypeScript)
 * Bundles application modules in dependency order and mounts the top-level App.vue shell.
 */

import { createApp } from 'vue';
import App from './components/App.vue';

// Mount App.vue into #app as soon as DOM is ready
if (typeof document !== 'undefined') {
  const mountVueApp = () => {
    const el = document.getElementById('app');
    if (el && !(el as any)._vMounted) {
      (el as any)._vMounted = true;
      createApp(App).mount(el);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountVueApp);
  } else {
    mountVueApp();
  }
}

// Core & Utilities
import '../js/i18n.js';
import '../js/cameraIds.js';
import '../js/eventFilter.js';
import '../js/mapView.js';
import '../js/folderManager.js';
import '../js/folderParser.js';

// Playback & UI
import '../js/eventBrowser.js';
import '../js/videoPlayer.js';
import '../js/fileSystemObserver.js';
import '../js/timeline.js';
import '../js/syncController.js';

// Layout Management
import '../js/layoutConfig.js';
import '../js/layoutRenderer.js';
import '../js/layoutManager.js';
import '../js/layoutEditor.js';

// Overlays & Sensors
import '../js/screenshotCapture.js';
import '../js/videoEnhancer.js';
import '../js/weatherService.js';

// Export & Reports
import '../js/videoExport.js';
import '../js/clipMarking.js';

// Settings & Metadata
import '../js/settingsManager.js';
import '../js/versionManager.js';
import '../js/statisticsManager.js';

// Drive Sync
import '../js/driveSync.js';
import '../js/driveSyncUI.js';

// B2 Cloud Client & Main App Controller
import '../js/b2Client.js';
import '../js/app.js';
