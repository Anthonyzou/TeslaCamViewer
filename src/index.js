/**
 * TeslaCamViewer Application Entry Point
 * Bundles application modules in dependency order.
 */

// Core & Utilities
import '../js/i18n.js';
import '../js/cameraIds.js';
import '../js/sidebarResize.js';
import '../js/eventFilter.js';
import '../js/filterPanel.js';
import '../js/mapView.js';
import '../js/folderManager.js';
import '../js/folderParser.js';

// Insights & Analysis
import '../js/seiInsights.js';
import '../js/interventionSeverity.js';
import '../js/eventInsightsCache.js';
import '../js/insightsScanner.js';
import '../js/insightsScannerUI.js';

// Playback & UI
import '../js/eventBrowser.js';
import '../js/videoPlayer.js';
import '../js/commandPalette.js';
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
import '../js/seiExtractor.js';
import '../js/telemetryOverlay.js';
import '../js/miniMapOverlay.js';
import '../js/weatherService.js';
import '../js/elevationService.js';
import '../js/elevationOverlay.js';
import '../js/telemetryGraphs.js';
import '../js/incidentSlowMo.js';
import '../js/streetViewOverlay.js';

// Export & Reports
import '../js/eventDataBackup.js';
import '../js/videoExport.js';
import '../js/videoExportFast.js';
import '../js/multiCameraExportDecoder.js';
import '../js/clipMarking.js';
import '../js/insuranceReport.js';

// Settings & Metadata
import '../js/settingsManager.js';
import '../js/versionManager.js';
import '../js/statisticsManager.js';
import '../js/helpModal.js';
import '../js/quickStartGuide.js';

// Timeline Overlays
import '../js/autopilotTimelineLayer.js';

// Drive Sync
import '../js/driveSync.js';
import '../js/driveSyncUI.js';
import '../js/regionTracker.js';

// B2 Cloud Client & Main App Controller
import '../js/b2Client.js';
import '../js/app.js';
