import { ref, onMounted, onUnmounted } from 'vue';

/**
 * useLayout - Composable for multi-camera layouts, camera visibility, and sidebar toggling
 */
export function useLayout() {
  const layout = ref('layout-6-3');
  const hiddenCameras = ref<string[]>([]);

  function syncLayout(): void {
    const app = (window as any).app;
    if (!app) return;

    const currentLayout = app.layoutManager?.currentLayout;
    if (currentLayout && layout.value !== currentLayout) {
      layout.value = currentLayout;
    }

    const hidden = app.videoPlayer?.hiddenCameras;
    if (Array.isArray(hidden) && hidden.length !== hiddenCameras.value.length) {
      hiddenCameras.value = [...hidden];
    }
  }

  let syncTimer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    syncLayout();
    syncTimer = setInterval(syncLayout, 500);
  });

  onUnmounted(() => {
    if (syncTimer) clearInterval(syncTimer);
  });

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

  function toggleCameraHide(cam: string): void {
    (window as any).app?.toggleCameraVisibility(cam);
  }

  function unhideCamera(cam: string): void {
    (window as any).app?.showCamera(cam);
  }

  function toggleSidebar(): void {
    (window as any).app?.toggleSidebar();
  }

  function closeSidebar(): void {
    (window as any).app?.closeSidebar();
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

  return {
    layout,
    hiddenCameras,
    changeLayout,
    changeFocusCamera,
    resetLayout,
    toggleCameraHide,
    unhideCamera,
    toggleSidebar,
    closeSidebar,
    zoomIn,
    zoomOut,
    zoomReset,
    syncLayout,
  };
}
