import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { LayoutConfig } from '../layout/layoutConfig';
import type { LayoutConfigSchema } from '../types';

const PREFS_STORAGE_KEY = 'teslacam_layout_prefs';

const layout: Ref<string> = ref('layout-6-3');
const customConfig: Ref<LayoutConfigSchema | any> = ref(null);
const focusCamera: Ref<string | null> = ref(null);
const hiddenCameras: Ref<string[]> = ref([]);
const hasPillarCameras: Ref<boolean> = ref(false);
const cameraSwaps: Ref<
  Record<
    string,
    {
      position: { x: number; y: number; width: number; height: number };
      zIndex?: number;
      objectFit?: string;
    }
  >
> = ref({});
const cameraOrder: Ref<string[]> = ref([
  'front',
  'back',
  'left_repeater',
  'right_repeater',
  'left_pillar',
  'right_pillar',
]);

const activeConfig: ComputedRef<LayoutConfigSchema | any> = computed(() => {
  let baseConfig: any = null;
  if (customConfig.value) {
    baseConfig = JSON.parse(JSON.stringify(customConfig.value));
  } else {
    const preset =
      LayoutConfig.presetToConfig(layout.value) ||
      LayoutConfig.presetToConfig('layout-6-3');
    baseConfig = JSON.parse(JSON.stringify(preset));
  }

  if (!baseConfig || !baseConfig.cameras) {
    return baseConfig;
  }

  // Apply camera swaps if any
  for (const [cam, swap] of Object.entries(cameraSwaps.value)) {
    if (baseConfig.cameras[cam]) {
      baseConfig.cameras[cam].position = { ...swap.position };
      if (swap.zIndex !== undefined) baseConfig.cameras[cam].zIndex = swap.zIndex;
      if (swap.objectFit !== undefined)
        baseConfig.cameras[cam].objectFit = swap.objectFit;
    }
  }

  return baseConfig;
});

function loadPreferences(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const saved = localStorage.getItem(PREFS_STORAGE_KEY);
    if (saved) {
      const prefs = JSON.parse(saved);
      if (prefs.layout) layout.value = prefs.layout;
      if (prefs.focusCamera !== undefined) focusCamera.value = prefs.focusCamera;
      if (Array.isArray(prefs.hiddenCameras)) hiddenCameras.value = prefs.hiddenCameras;
      if (prefs.cameraSwaps && typeof prefs.cameraSwaps === 'object') {
        cameraSwaps.value = prefs.cameraSwaps;
      }
      if (Array.isArray(prefs.cameraOrder)) cameraOrder.value = prefs.cameraOrder;
      if (prefs.customConfig) customConfig.value = prefs.customConfig;
    }
  } catch (e) {
    console.warn('[Layout] Failed to load preferences:', e);
  }
}

function savePreferences(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const prefs = {
      layout: layout.value,
      focusCamera: focusCamera.value,
      hiddenCameras: hiddenCameras.value,
      cameraSwaps: cameraSwaps.value,
      cameraOrder: cameraOrder.value,
      customConfig: customConfig.value,
    };
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('[Layout] Failed to save preferences:', e);
  }
}

// Auto-load saved preferences on startup
loadPreferences();

export const layoutStore = {
  get layout(): string {
    return layout.value;
  },
  get currentLayout(): string {
    return layout.value;
  },
  get currentConfig(): LayoutConfigSchema | any {
    return activeConfig.value;
  },
  get focusCamera(): string | null {
    return focusCamera.value;
  },
  get hiddenCameras(): string[] {
    return hiddenCameras.value;
  },
  get hasPillarCameras(): boolean {
    return hasPillarCameras.value;
  },
  get visibleCameras(): Record<string, boolean> {
    const out: Record<string, boolean> = {
      front: true,
      back: true,
      left_repeater: true,
      right_repeater: true,
      left_pillar: hasPillarCameras.value,
      right_pillar: hasPillarCameras.value,
    };
    for (const cam of hiddenCameras.value) {
      out[cam] = false;
    }
    return out;
  },
  get cameraOrder(): string[] {
    return [...cameraOrder.value];
  },
  get cameraSwaps(): Record<string, any> {
    return cameraSwaps.value;
  },

  getCurrentConfig(): LayoutConfigSchema | any {
    return activeConfig.value;
  },
  getCurrentLayout(): string {
    return layout.value;
  },
  getCurrentLayoutId(): string {
    return layout.value;
  },
  getCameraVisibility(camera: string): boolean {
    return !hiddenCameras.value.includes(camera);
  },

  setLayout(layoutOrConfig: string | LayoutConfigSchema | any): void {
    if (typeof layoutOrConfig === 'object' && layoutOrConfig !== null) {
      customConfig.value = layoutOrConfig;
      layout.value = layoutOrConfig.id || 'custom';
    } else {
      customConfig.value = null;
      layout.value = String(layoutOrConfig);
    }
    cameraSwaps.value = {};
    savePreferences();
  },

  setFocusCamera(cam: string | null): void {
    focusCamera.value = cam;
    savePreferences();
  },

  setCameraVisibility(camera: string, visible: boolean): void {
    if (visible) {
      hiddenCameras.value = hiddenCameras.value.filter((c) => c !== camera);
    } else if (!hiddenCameras.value.includes(camera)) {
      hiddenCameras.value = [...hiddenCameras.value, camera];
    }
    savePreferences();
  },

  toggleCameraHide(cam: string): void {
    layoutStore.setCameraVisibility(cam, hiddenCameras.value.includes(cam));
  },

  unhideCamera(cam: string): void {
    layoutStore.setCameraVisibility(cam, true);
  },

  resetLayout(): void {
    layout.value = 'layout-6-3';
    customConfig.value = null;
    focusCamera.value = null;
    hiddenCameras.value = [];
    cameraSwaps.value = {};
    cameraOrder.value = [
      'front',
      'back',
      'left_repeater',
      'right_repeater',
      'left_pillar',
      'right_pillar',
    ];
    savePreferences();
  },

  swapCameras(cam1: string, cam2: string): void {
    if (cam1 === cam2) return;
    const cfg = activeConfig.value;
    if (!cfg?.cameras?.[cam1] || !cfg?.cameras?.[cam2]) return;

    const c1 = cfg.cameras[cam1];
    const c2 = cfg.cameras[cam2];

    cameraSwaps.value = {
      ...cameraSwaps.value,
      [cam1]: {
        position: { ...c2.position },
        zIndex: c2.zIndex,
        objectFit: c2.objectFit,
      },
      [cam2]: {
        position: { ...c1.position },
        zIndex: c1.zIndex,
        objectFit: c1.objectFit,
      },
    };
    savePreferences();
  },

  setHasPillarCameras(hasPillars: boolean): void {
    hasPillarCameras.value = hasPillars;
  },

  nextLayout(): void {
    const layouts = [
      'layout-6-3',
      'grid-2x2',
      'layout-4-3',
      'layout-all-16-9',
      'layout-front-left',
      'layout-front-right',
      'layout-front-repeaters',
      'layout-focus',
    ];
    const currentIndex = layouts.indexOf(layout.value);
    const nextIndex = (currentIndex + 1) % layouts.length;
    layoutStore.setLayout(layouts[nextIndex]);
  },

  toggleSidebar(): void {
    if (typeof document !== 'undefined') {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('open');
    }
  },

  closeSidebar(): void {
    if (typeof document !== 'undefined') {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('open');
    }
  },

  // Backwards compatibility no-ops
  syncLayout(): void {},
  setLayoutManager(): void {},
};

/**
 * useLayout - Composable for multi-camera layouts, camera visibility, and sidebar toggling
 */
export function useLayout() {
  return {
    layout,
    currentConfig: activeConfig,
    focusCamera,
    hiddenCameras,
    hasPillarCameras,
    cameraOrder,
    activeConfig,
    changeLayout: layoutStore.setLayout,
    changeFocusCamera: layoutStore.setFocusCamera,
    resetLayout: layoutStore.resetLayout,
    toggleCameraHide: layoutStore.toggleCameraHide,
    unhideCamera: layoutStore.unhideCamera,
    toggleSidebar: layoutStore.toggleSidebar,
    closeSidebar: layoutStore.closeSidebar,
    swapCameras: layoutStore.swapCameras,
    setHasPillarCameras: layoutStore.setHasPillarCameras,
    nextLayout: layoutStore.nextLayout,
    syncLayout: layoutStore.syncLayout,
  };
}

export default useLayout;
