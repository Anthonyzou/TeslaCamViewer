import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { TeslaCamEvent, DriveInfo } from '../types';

export function useTeslaCam() {
  const currentEvent = ref<TeslaCamEvent | null>(null);
  const isPlaying = ref(false);
  const speed = ref('1');
  const isLooping = ref(false);
  const layout = ref('layout-6-3');
  const drives = ref<DriveInfo[]>([]);
  const hiddenCameras = ref<string[]>([]);
  const hasEvent = computed(() => currentEvent.value !== null);

  const eventCountText = ref('');
  const eventStatsText = ref('');

  function syncFromApp(): void {
    const app = (window as any).app;
    if (!app) return;

    if (currentEvent.value !== (app.currentEvent || null)) {
      currentEvent.value = app.currentEvent || null;
    }
    const playing = app.videoPlayer ? !app.videoPlayer.paused : false;
    if (isPlaying.value !== playing) {
      isPlaying.value = playing;
    }
    const sp = String(app.videoPlayer?.playbackSpeed ?? '1');
    if (speed.value !== sp) {
      speed.value = sp;
    }
    const loop = app.videoPlayer?.isLooping ?? false;
    if (isLooping.value !== loop) {
      isLooping.value = loop;
    }
    const lay = app.layoutManager?.currentLayout ?? 'layout-6-3';
    if (layout.value !== lay) {
      layout.value = lay;
    }
    const drvs = app.folderManager?.drives ? [...app.folderManager.drives] : [];
    if (drives.value.length !== drvs.length) {
      drives.value = drvs;
    }

    const countEl = document.getElementById('eventCount');
    if (countEl && eventCountText.value !== (countEl.textContent || '')) {
      eventCountText.value = countEl.textContent || '';
    }
    const statsEl = document.getElementById('eventStats');
    if (statsEl && eventStatsText.value !== (statsEl.textContent || '')) {
      eventStatsText.value = statsEl.textContent || '';
    }
  }

  let syncInterval: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    syncFromApp();
    syncInterval = setInterval(syncFromApp, 200);

    const checkHook = setInterval(() => {
      const app = (window as any).app;
      if (app?.videoPlayer) {
        clearInterval(checkHook);
        const originalCallback = app.videoPlayer.onPlayStateChange;
        app.videoPlayer.onPlayStateChange = (playing: boolean) => {
          isPlaying.value = playing;
          if (typeof originalCallback === 'function') {
            originalCallback(playing);
          }
        };
      }
    }, 100);
  });

  onUnmounted(() => {
    if (syncInterval) clearInterval(syncInterval);
  });

  function togglePlay(): void {
    (window as any).app?.togglePlayback();
    syncFromApp();
  }

  function prevClip(): void {
    (window as any).app?.previousClip();
    syncFromApp();
  }

  function nextClip(): void {
    (window as any).app?.nextClip();
    syncFromApp();
  }

  function changeSpeed(val: string): void {
    speed.value = val;
    (window as any).app?.videoPlayer?.setPlaybackSpeed(parseFloat(val));
    syncFromApp();
  }

  function toggleLoop(): void {
    const app = (window as any).app;
    if (app?.videoPlayer) {
      app.videoPlayer.isLooping = !app.videoPlayer.isLooping;
      isLooping.value = app.videoPlayer.isLooping;
    }
  }

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

  function changeLayout(val: string): void {
    layout.value = val;
    (window as any).app?.layoutManager?.setLayout(val);
  }

  function changeFocusCamera(cam: string): void {
    (window as any).app?.layoutManager?.setFocusCamera(cam);
  }

  function resetLayout(): void {
    (window as any).app?.layoutManager?.resetLayout();
  }

  function frameBack(): void {
    (window as any).app?.videoPlayer?.stepFrame(-1);
  }

  function frameForward(): void {
    (window as any).app?.videoPlayer?.stepFrame(1);
  }

  function prevEvent(): void {
    (window as any).app?.previousEvent();
  }

  function nextEvent(): void {
    (window as any).app?.nextEvent();
  }

  function zoomIn(): void {
    (window as any).app?.timeline?.zoomIn();
  }

  function zoomOut(): void {
    (window as any).app?.timeline?.zoomOut();
  }

  function zoomReset(): void {
    (window as any).app?.timeline?.resetZoom();
  }

  function selectFolder(): void {
    (window as any).app?.selectFolder();
  }

  function loadB2(): void {
    (window as any).app?.loadFromB2();
  }

  function changeDrive(id: string): void {
    (window as any).app?.folderManager?.switchDrive(id || null);
  }

  function manageDrives(): void {
    (window as any).app?.showDriveManagementModal();
  }

  function addDrive(): void {
    (window as any).app?.addNewDrive();
  }

  function syncDrives(): void {
    (window as any).app?.driveSyncUI?.show();
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

  function toggleCameraHide(cam: string): void {
    (window as any).app?.toggleCameraVisibility(cam);
  }

  function toggleSidebar(): void {
    (window as any).app?.toggleSidebar();
  }

  function unhideCamera(cam: string): void {
    (window as any).app?.showCamera(cam);
  }

  return {
    currentEvent,
    isPlaying,
    speed,
    isLooping,
    layout,
    drives,
    hiddenCameras,
    hasEvent,
    eventCountText,
    eventStatsText,
    togglePlay,
    prevClip,
    nextClip,
    changeSpeed,
    toggleLoop,
    markIn,
    markOut,
    clearMarks,
    exportVideo,
    captureScreenshot,
    toggleEnhance,
    changeLayout,
    changeFocusCamera,
    resetLayout,
    frameBack,
    frameForward,
    prevEvent,
    nextEvent,
    zoomIn,
    zoomOut,
    zoomReset,
    selectFolder,
    loadB2,
    changeDrive,
    manageDrives,
    addDrive,
    syncDrives,
    openStats,
    openHelp,
    openSettings,
    toggleCameraHide,
    toggleSidebar,
    unhideCamera,
    syncFromApp,
  };
}
