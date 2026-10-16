import { usePlayback } from './usePlayback';
import { useEvents } from './useEvents';
import { useDrives } from './useDrives';
import { useLayout } from './useLayout';

export * from './usePlayback';
export * from './useEvents';
export * from './useDrives';
export * from './useLayout';

/**
 * useTeslaCam - Top-level orchestrator composing specialized domain composables
 */
export function useTeslaCam() {
  const playback = usePlayback();
  const events = useEvents();
  const drives = useDrives();
  const layout = useLayout();

  function markIn(): void {
    (window as any).app?.markIn();
  }

  function markOut(): void {
    (window as any).app?.markOut();
  }

  function clearMarks(): void {
    (window as any).app?.clearMarks();
  }

  function exportVideo(): void {
    (window as any).app?.exportVideo();
  }

  function captureScreenshot(): void {
    (window as any).app?.captureScreenshot();
  }

  function toggleEnhance(): void {
    (window as any).app?.videoEnhancer?.toggleEnhancementModal();
  }

  function openStats(): void {
    (window as any).app?.statisticsManager?.showModal();
  }

  function openHelp(): void {
    (window as any).app?.helpModal?.show();
  }

  function openSettings(): void {
    (window as any).app?.settingsManager?.showSettingsModal();
  }

  function syncFromApp(): void {
    playback.syncPlayback();
    events.syncEvents();
    drives.syncDrives();
    layout.syncLayout();
  }

  return {
    // Events
    currentEvent: events.currentEvent,
    allEvents: events.allEvents,
    filteredEvents: events.filteredEvents,
    hasEvent: events.hasEvent,
    eventCountText: events.eventCountText,
    eventStatsText: events.eventStatsText,
    selectEvent: events.selectEvent,
    prevEvent: events.prevEvent,
    nextEvent: events.nextEvent,

    // Playback
    isPlaying: playback.isPlaying,
    speed: playback.speed,
    isLooping: playback.isLooping,
    currentClipIndex: playback.currentClipIndex,
    currentTime: playback.currentTime,
    duration: playback.duration,
    play: playback.play,
    pause: playback.pause,
    togglePlay: playback.togglePlay,
    prevClip: playback.prevClip,
    nextClip: playback.nextClip,
    changeSpeed: playback.changeSpeed,
    toggleLoop: playback.toggleLoop,
    frameBack: playback.frameBack,
    frameForward: playback.frameForward,

    // Drives
    drives: drives.drives,
    selectFolder: drives.selectFolder,
    loadB2: drives.loadB2,
    changeDrive: drives.changeDrive,
    manageDrives: drives.manageDrives,
    addDrive: drives.addDrive,
    refreshDrives: drives.refreshDrives,
    syncDrives: drives.refreshDrives,

    // Layout
    layout: layout.layout,
    hiddenCameras: layout.hiddenCameras,
    changeLayout: layout.changeLayout,
    changeFocusCamera: layout.changeFocusCamera,
    resetLayout: layout.resetLayout,
    toggleCameraHide: layout.toggleCameraHide,
    unhideCamera: layout.unhideCamera,
    toggleSidebar: layout.toggleSidebar,
    closeSidebar: layout.closeSidebar,
    zoomIn: layout.zoomIn,
    zoomOut: layout.zoomOut,
    zoomReset: layout.zoomReset,

    // Marks, Export & Modals
    markIn,
    markOut,
    clearMarks,
    exportVideo,
    captureScreenshot,
    toggleEnhance,
    openStats,
    openHelp,
    openSettings,
    syncFromApp,
  };
}
