import { onMounted } from 'vue';
import { b2Client } from './useB2';
import { folderManager } from './useFolderManager';
import { folderParser } from './useFolderParser';
import { ScreenshotCapture } from './useScreenshot';
import { VideoExport } from './useVideoExport';
import { videoPlayer } from './useVideoPlayer';
import { useClipMarking } from './useClipMarking';
import { drivesStore, useDrives } from './useDrives';
import { eventsStore, useEvents } from './useEvents';
import { filterPanelStore } from './useFilterPanel';
import { layoutStore, useLayout } from './useLayout';
import { mapViewStore } from './useMapView';
import {
  commandPaletteModalStore,
  helpModalStore,
  settingsModalStore,
} from './useModals';
import { playbackStore, usePlayback } from './usePlayback';
import { settingsStore } from './useSettings';
import { statisticsStore } from './useStatistics';
import { timelineStore, useTimeline } from './useTimeline';

export * from './useClipMarking';
export * from './useDrives';
export * from './useEvents';
export * from './useFilterPanel';
export * from './useLayout';
export * from './useMapView';
export * from './useModals';
export * from './usePlayback';
export * from './useSettings';
export * from './useStatistics';
export * from './useTimeline';

const screenshotCapture = new ScreenshotCapture(videoPlayer);
const videoExport = new VideoExport(videoPlayer);
const clipMarking = useClipMarking(() => videoPlayer);

async function exportVideo(camera = 'all'): Promise<void> {
  const formatSelect =
    typeof document !== 'undefined'
      ? (document.getElementById(
          'exportFormatSelect'
        ) as HTMLSelectElement | null)
      : null;
  const format =
    formatSelect?.value || settingsStore.get('exportFormat') || 'mp4';
  await videoExport.startExport({ camera, format });
}

function registerCommands(): void {
  commandPaletteModalStore.registerMany([
    {
      id: 'play-pause',
      title: 'Play / Pause',
      category: 'Playback',
      shortcut: 'Space',
      action: () => playbackStore.togglePlay(),
    },
    {
      id: 'next-clip',
      title: 'Next Clip',
      category: 'Playback',
      shortcut: 'Shift + →',
      action: () => playbackStore.nextClip(),
    },
    {
      id: 'prev-clip',
      title: 'Previous Clip',
      category: 'Playback',
      shortcut: 'Shift + ←',
      action: () => playbackStore.prevClip(),
    },
    {
      id: 'next-event',
      title: 'Next Event',
      category: 'Navigation',
      shortcut: 'Page Down',
      action: () => eventsStore.nextEvent(),
    },
    {
      id: 'prev-event',
      title: 'Previous Event',
      category: 'Navigation',
      shortcut: 'Page Up',
      action: () => eventsStore.previousEvent(),
    },
    {
      id: 'mark-in',
      title: 'Mark IN Point',
      category: 'Editing',
      shortcut: 'I',
      action: () => clipMarking.setInPoint(),
    },
    {
      id: 'mark-out',
      title: 'Mark OUT Point',
      category: 'Editing',
      shortcut: 'O',
      action: () => clipMarking.setOutPoint(),
    },
    {
      id: 'clear-marks',
      title: 'Clear Marks',
      category: 'Editing',
      shortcut: 'Esc',
      action: () => clipMarking.clearMarks(),
    },
    {
      id: 'screenshot',
      title: 'Capture Screenshot',
      category: 'Capture',
      shortcut: 'S',
      action: () =>
        screenshotCapture.captureComposite(layoutStore.currentConfig),
    },
    {
      id: 'export',
      title: 'Export Video',
      category: 'Capture',
      shortcut: 'E',
      action: () => exportVideo(),
    },
    {
      id: 'settings',
      title: 'Open Settings',
      category: 'General',
      shortcut: 'Q',
      action: () => settingsModalStore.open(),
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      category: 'Help',
      shortcut: '?',
      action: () => helpModalStore.show(),
    },
  ]);
}

/**
 * useTeslaCam - Top-level orchestrator hook composing domain composables
 */
export function useTeslaCam() {
  const playback = usePlayback();
  const events = useEvents();
  const drives = useDrives();
  const layout = useLayout();
  const timeline = useTimeline();

  function markIn(): void {
    clipMarking.setInPoint();
  }

  function markOut(): void {
    clipMarking.setOutPoint();
  }

  function clearMarks(): void {
    clipMarking.clearMarks();
  }

  async function captureScreenshot(): Promise<void> {
    await screenshotCapture.captureComposite(layoutStore.currentConfig);
  }

  function openStats(): void {
    statisticsStore.showModal();
  }

  function openHelp(): void {
    helpModalStore.show();
  }

  function openSettings(): void {
    settingsModalStore.open();
  }

  onMounted(async () => {
    registerCommands();

    // Auto-advance callback
    videoPlayer.onEnded = () => {
      if (settingsStore.get('autoPlayNextEvent')) {
        eventsStore.autoPlayNextEvent();
      }
    };

    // Apply performance settings
    playbackStore.applyPerformanceSettings();

    // Populate passive window.app for DevTools debugging
    if (typeof window !== 'undefined') {
      window.app = {
        videoPlayer,
        folderManager,
        folderParser,
        b2Client,
        timeline: timelineStore,
        layoutManager: layoutStore,
        screenshotCapture,
        videoExport,
        statisticsManager: statisticsStore,
        clipMarking,
        filterPanel: filterPanelStore,
        helpModal: helpModalStore,
        commandPalette: commandPaletteModalStore,
        mapView: mapViewStore.instance,
        telemetryOverlay: null,
        get allEvents() {
          return eventsStore.allEvents;
        },
        get filteredEvents() {
          return eventsStore.filteredEvents;
        },
        get currentEvent() {
          return eventsStore.currentEvent;
        },
        play: playbackStore.play,
        pause: playbackStore.pause,
        togglePlayback: playbackStore.togglePlay,
        previousClip: playbackStore.prevClip,
        nextClip: playbackStore.nextClip,
        previousEvent: eventsStore.previousEvent,
        nextEvent: eventsStore.nextEvent,
        selectEvent: eventsStore.selectEvent,
        applyFilters: eventsStore.applyFilters,
        selectFolder: drivesStore.selectFolder,
        loadFromB2: drivesStore.loadB2,
        changeDrive: drivesStore.changeDrive,
        refreshDrives: drivesStore.refreshDrives,
        addNewDrive: drivesStore.addNewDrive,
        syncArchiveDrive: drivesStore.syncArchiveDrive,
        reloadDriveEvents: drivesStore.reloadDriveEvents,
        tryRestoreLastFolder: drivesStore.tryRestoreLastFolder,
        showDriveManagementModal: drivesStore.manageDrives,
        markIn,
        markOut,
        clearMarks,
        exportVideo,
        captureScreenshot,
      };
      window.dispatchEvent(
        new CustomEvent('teslacam-ready', { detail: window.app })
      );
    }

    // Auto-connect B2 if preloaded in config
    try {
      const config = await b2Client.getConfig();
      if (config?.isConfigured && config?.isPreloaded) {
        await drivesStore.loadB2();
      }
    } catch (_e) {}

    // Restore drives from storage
    await drivesStore.tryRestoreLastFolder();
  });

  return {
    ...events,
    ...playback,
    ...drives,
    ...layout,
    ...timeline,
    markIn,
    markOut,
    clearMarks,
    exportVideo,
    captureScreenshot,
    openStats,
    openHelp,
    openSettings,
    videoPlayer,
    folderManager,
    statisticsManager: statisticsStore,
    statisticsStore,
    settingsStore,
  };
}

export default useTeslaCam;
