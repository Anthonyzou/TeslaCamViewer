import { onMounted, onUnmounted, ref } from 'vue';

/**
 * useLayout - Composable for multi-camera layouts, camera visibility, and sidebar toggling
 */
export function useLayout() {
  const layout = ref('layout-6-3');
  const focusCamera = ref<string | null>(null);
  const hiddenCameras = ref<string[]>([]);

  function syncLayout(): void {
    const app = window.app;
    if (!app) return;

    const currentLayout = app.layoutManager?.currentLayout;
    if (currentLayout && layout.value !== currentLayout) {
      layout.value = currentLayout;
    }

    const currentFocus = app.layoutManager?.focusCamera || null;
    if (focusCamera.value !== currentFocus) {
      focusCamera.value = currentFocus;
    }

    const hidden = Object.entries(app.layoutManager?.visibleCameras || {})
      .filter(([_, v]) => !v)
      .map(([k]) => k);
    if (Array.isArray(hidden) && hidden.length !== hiddenCameras.value.length) {
      hiddenCameras.value = [...hidden];
    }
  }

  function attachLayoutHooks(): void {
    const lm = typeof window !== 'undefined' ? window.app?.layoutManager : null;
    if (!lm) return;
    const origChange = lm.onLayoutChange;
    lm.onLayoutChange = (l: string) => {
      layout.value = l;
      syncLayout();
      origChange?.(l);
    };
    syncLayout();
  }

  onMounted(() => {
    syncLayout();
    if (typeof window !== 'undefined') {
      if (window.app?.layoutManager) {
        attachLayoutHooks();
      } else {
        window.addEventListener('teslacam-ready', attachLayoutHooks, {
          once: true,
        });
      }
    }
  });

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('teslacam-ready', attachLayoutHooks);
    }
  });

  function changeLayout(val: string): void {
    layout.value = val;
    window.app?.layoutManager?.setLayout(val);
    syncLayout();
  }

  function changeFocusCamera(cam: string): void {
    window.app?.layoutManager?.setFocusCamera(cam);
    syncLayout();
  }

  function resetLayout(): void {
    window.app?.layoutManager?.resetLayout();
    syncLayout();
  }

  function toggleCameraHide(cam: string): void {
    window.app?.toggleCameraVisibility(cam);
    syncLayout();
  }

  function unhideCamera(cam: string): void {
    window.app?.showCamera(cam);
    syncLayout();
  }

  function toggleSidebar(): void {
    window.app?.toggleSidebar();
  }

  function closeSidebar(): void {
    window.app?.closeSidebar();
  }

  return {
    layout,
    focusCamera,
    hiddenCameras,
    changeLayout,
    changeFocusCamera,
    resetLayout,
    toggleCameraHide,
    unhideCamera,
    toggleSidebar,
    closeSidebar,

    syncLayout,
  };
}
