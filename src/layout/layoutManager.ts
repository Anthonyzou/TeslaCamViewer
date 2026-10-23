/**
 * LayoutManager - Lightweight facade backed by reactive layoutStore
 * Preserves API compatibility for services, shortcuts, and settings
 * while delegating all state and operations to Vue 3 reactivity.
 */

import { layoutStore } from '../composables/useLayout';
import { LayoutRenderer } from './layoutRenderer';
import type { LayoutConfigSchema } from '../types';

export class LayoutManager {
  public renderer = new LayoutRenderer();
  public onLayoutChange: ((layout: string) => void) | null = null;

  get currentLayout(): string {
    return layoutStore.layout;
  }
  set currentLayout(val: string) {
    layoutStore.setLayout(val);
    this.onLayoutChange?.(val);
  }

  get currentConfig(): LayoutConfigSchema | any {
    return layoutStore.currentConfig;
  }
  set currentConfig(cfg: LayoutConfigSchema | any) {
    layoutStore.setLayout(cfg);
    if (cfg?.id) this.onLayoutChange?.(cfg.id);
  }

  get visibleCameras(): Record<string, boolean> {
    return layoutStore.visibleCameras;
  }

  get focusCamera(): string | null {
    return layoutStore.focusCamera;
  }
  set focusCamera(cam: string | null) {
    layoutStore.setFocusCamera(cam);
  }

  get hasPillarCameras(): boolean {
    return layoutStore.hasPillarCameras;
  }
  set hasPillarCameras(val: boolean) {
    layoutStore.setHasPillarCameras(val);
  }

  get cameraOrder(): string[] {
    return layoutStore.cameraOrder;
  }

  /**
   * Get the current layout config (custom or preset)
   */
  getCurrentConfig(): LayoutConfigSchema | any {
    return layoutStore.getCurrentConfig();
  }

  /**
   * Alias for getCurrentConfig for backwards compatibility
   */
  getCurrentLayoutConfig(): LayoutConfigSchema | any {
    return this.getCurrentConfig();
  }

  /**
   * Get current layout identifier
   */
  getCurrentLayout(): string {
    return layoutStore.getCurrentLayout();
  }

  /**
   * Alias for getCurrentLayout
   */
  getCurrentLayoutId(): string {
    return layoutStore.getCurrentLayoutId();
  }

  /**
   * Get visibility state for a camera
   */
  getCameraVisibility(camera: string): boolean {
    return layoutStore.getCameraVisibility(camera);
  }

  /**
   * Set visibility state for a camera
   */
  setCameraVisibility(camera: string, visible: boolean): void {
    layoutStore.setCameraVisibility(camera, visible);
    this.onLayoutChange?.(this.currentLayout);
  }

  /**
   * Set active layout mode or configuration
   */
  setLayout(layoutOrConfig: string | LayoutConfigSchema | any): void {
    layoutStore.setLayout(layoutOrConfig);
    const id =
      typeof layoutOrConfig === 'object' && layoutOrConfig !== null
        ? layoutOrConfig.id
        : layoutOrConfig;
    if (id) this.onLayoutChange?.(id);
  }

  /**
   * Set focus camera for single-camera focus mode
   */
  setFocusCamera(camera: string | null): void {
    layoutStore.setFocusCamera(camera);
    this.onLayoutChange?.(this.currentLayout);
  }

  /**
   * Set whether current event contains pillar cameras
   */
  setHasPillarCameras(hasPillars: boolean): void {
    layoutStore.setHasPillarCameras(hasPillars);
  }

  /**
   * Cycle to next layout preset
   */
  nextLayout(): void {
    layoutStore.nextLayout();
    this.onLayoutChange?.(this.currentLayout);
  }

  /**
   * Swap positions between two cameras in the layout
   */
  swapCameras(camera1: string, camera2: string): void {
    layoutStore.swapCameras(camera1, camera2);
    this.onLayoutChange?.(this.currentLayout);
  }

  /**
   * Reset camera order and layout configuration to defaults
   */
  resetLayout(): void {
    layoutStore.resetLayout();
    this.onLayoutChange?.(this.currentLayout);
  }

  /**
   * Alias for resetLayout
   */
  resetToDefault(): void {
    this.resetLayout();
  }

  /**
   * Reset camera order alias
   */
  resetCameraOrder(): void {
    this.resetLayout();
  }

  /**
   * Apply layout no-op retained for backwards compatibility
   */
  applyLayout(_layout?: string): void {
    // Layout application is handled reactively by VideoGrid.vue
  }

  /**
   * Save preferences no-op (layoutStore automatically persists)
   */
  savePreferences(): void {}

  /**
   * Load preferences no-op (layoutStore automatically loads)
   */
  loadPreferences(): void {}
}

export default LayoutManager;
