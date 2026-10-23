import { useLocalStorage } from '@vueuse/core';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { LayoutConfig } from '../layout/layoutConfig';
import type { LayoutConfigSchema } from '../types';

const PREFS_STORAGE_KEY = 'teslacam_layout_prefs';

interface LayoutPreferences {
  layout: string;
  focusCamera: string | null;
  hiddenCameras: string[];
  cameraSwaps: Record<
    string,
    {
      position: { x: number; y: number; width: number; height: number };
      zIndex?: number;
      objectFit?: string;
    }
  >;
  cameraOrder: string[];
  customConfig: LayoutConfigSchema | any;
}

const prefs = useLocalStorage<LayoutPreferences>(PREFS_STORAGE_KEY, {
  layout: 'layout-6-3',
  focusCamera: null,
  hiddenCameras: [],
  cameraSwaps: {},
  cameraOrder: [
    'front',
    'back',
    'left_repeater',
    'right_repeater',
    'left_pillar',
    'right_pillar',
  ],
  customConfig: null,
});

const layout = computed({
  get: () => prefs.value.layout || 'layout-6-3',
  set: (val: string) => {
    prefs.value.layout = val;
  },
});

const customConfig = computed({
  get: () => prefs.value.customConfig || null,
  set: (val: any) => {
    prefs.value.customConfig = val;
  },
});

const focusCamera = computed({
  get: () => prefs.value.focusCamera ?? null,
  set: (val: string | null) => {
    prefs.value.focusCamera = val;
  },
});

const hiddenCameras = computed({
  get: () => prefs.value.hiddenCameras || [],
  set: (val: string[]) => {
    prefs.value.hiddenCameras = val;
  },
});

const cameraSwaps = computed({
  get: () => prefs.value.cameraSwaps || {},
  set: (val: any) => {
    prefs.value.cameraSwaps = val;
  },
});

const cameraOrder = computed({
  get: () =>
    prefs.value.cameraOrder || [
      'front',
      'back',
      'left_repeater',
      'right_repeater',
      'left_pillar',
      'right_pillar',
    ],
  set: (val: string[]) => {
    prefs.value.cameraOrder = val;
  },
});

const hasPillarCameras: Ref<boolean> = ref(false);

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
  },

  setFocusCamera(cam: string | null): void {
    focusCamera.value = cam;
  },

  setCameraVisibility(camera: string, visible: boolean): void {
    if (visible) {
      hiddenCameras.value = hiddenCameras.value.filter((c) => c !== camera);
    } else if (!hiddenCameras.value.includes(camera)) {
      hiddenCameras.value = [...hiddenCameras.value, camera];
    }
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
  savePreferences(): void {},
  loadPreferences(): void {},
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
