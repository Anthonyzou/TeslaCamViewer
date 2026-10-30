import { onMounted } from 'vue';
import { b2Client } from './useB2';
import { useClipMarking } from './useClipMarking';
import { drivesStore, useDrives } from './useDrives';
import { eventsStore, useEvents } from './useEvents';
import { folderManager } from './useFolderManager';
import { useLayout } from './useLayout';
import {
  commandPaletteModalStore,
  helpModalStore,
  settingsModalStore,
} from './useModals';
import { playbackStore, usePlayback } from './usePlayback';
import { ScreenshotCapture } from './useScreenshot';
import { settingsStore } from './useSettings';
import { statisticsStore } from './useStatistics';
import { useTimeline } from './useTimeline';
import { VideoExport } from './useVideoExport';
import { videoPlayer } from './useVideoPlayer';

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
      action: () => screenshotCapture.captureComposite(),
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
    await screenshotCapture.captureComposite();
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

    // Auto-connect B2 if preloaded in config
    try {
      const config = await b2Client.getConfig();
      if (config?.isConfigured && config?.isPreloaded) {
        drivesStore.loadB2(); // do not await
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
