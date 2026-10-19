import { settingsManager } from '../services/settingsManager';
import { useDrives } from './useDrives';
import { useEvents } from './useEvents';
import { useLayout } from './useLayout';
import { usePlayback } from './usePlayback';

export * from './useDrives';
export * from './useEvents';
export * from './useLayout';
export * from './usePlayback';
export * from './useTimeline';
export * from './useClipMarking';
export * from './useMapView';
export * from './useFilterPanel';
export * from './useModals';

/**
 * useTeslaCam - Top-level orchestrator composing specialized domain composables
 */
export function useTeslaCam() {
  const playback = usePlayback();
  const events = useEvents();
  const drives = useDrives();
  const layout = useLayout();

  function markIn(): void {
    window.app?.markIn();
  }

  function markOut(): void {
    window.app?.markOut();
  }

  function clearMarks(): void {
    window.app?.clearMarks();
  }

  function exportVideo(): void {
    window.app?.exportVideo();
  }

  function captureScreenshot(): void {
    window.app?.captureScreenshot();
  }

  function openStats(): void {
    window.app?.statisticsManager?.showModal();
  }

  function openHelp(): void {
    window.app?.helpModal?.show();
  }

  function openSettings(): void {
    settingsManager?.showSettingsModal();
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
    activeDriveId: drives.activeDriveId,
    selectFolder: drives.selectFolder,
    loadB2: drives.loadB2,
    changeDrive: drives.changeDrive,
    manageDrives: drives.manageDrives,
    addDrive: drives.addDrive,
    refreshDrives: drives.refreshDrives,
    syncDrives: drives.refreshDrives,

    // Layout
    layout: layout.layout,
    focusCamera: layout.focusCamera,
    hiddenCameras: layout.hiddenCameras,
    changeLayout: layout.changeLayout,
    changeFocusCamera: layout.changeFocusCamera,
    resetLayout: layout.resetLayout,
    toggleCameraHide: layout.toggleCameraHide,
    unhideCamera: layout.unhideCamera,
    toggleSidebar: layout.toggleSidebar,
    closeSidebar: layout.closeSidebar,

    // Marks, Export & Modals
    markIn,
    markOut,
    clearMarks,
    exportVideo,
    captureScreenshot,
    openStats,
    openHelp,
    openSettings,
    syncFromApp,
  };
}
