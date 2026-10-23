<template>
  <div ref="containerRef" class="video-grid-container">
    <div
      id="videoGrid"
      class="video-grid"
      :class="[layout, { 'has-pillars': hasPillarCameras }]"
      :style="gridStyle"
    >
      <div v-for="item in cameras" :key="item[0]">
        <div
          class="video-container"
          :data-camera="item[0]"
          :class="{
            hidden: isHidden(item[0]),
            dragging: draggedCamera === item[0],
            'drag-over': dragOverCamera === item[0],
          }"
          :style="getCameraContainerStyle(item[0])"
          :draggable="true"
          @dragstart="handleDragStart(item[0], $event)"
          @dragover="handleDragOver(item[0], $event)"
          @dragleave="handleDragLeave"
          @drop="handleDrop(item[0], $event)"
          @dragend="handleDragEnd"
          @dblclick="handleContainerDblClick($event)"
        >
          <video
            :id="item[1]"
            class="video-player"
            crossorigin="anonymous"
            preload="auto"
            :style="{ objectFit: getCameraObjectFit(item[0]) }"
          ></video>
          <div class="video-label" :data-i18n="'cameras.' + item[0]"></div>
          <button
            class="camera-hide-btn"
            :data-camera="item[0]"
            :title="t('cameras.' + item[2])"
            @click="emit('toggleCameraHide', item[0])"
          >
            <Eye :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Hidden Cameras Panel -->
    <div
      id="hiddenCamerasPanel"
      class="hidden-cameras-panel"
      :class="{ hidden: !hiddenCameras || hiddenCameras.length === 0 }"
    >
      <span class="hidden-cameras-label" data-i18n="cameras.hiddenCameras"
        >{{ t('cameras.hiddenCameras') }}:</span
      >
      <div id="hiddenCamerasList" class="hidden-cameras-list">
        <button
          v-for="cam in hiddenCameras"
          :key="cam"
          class="unhide-camera-btn"
          @click="emit('unhideCamera', cam)"
        >
          {{ cam }} ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Eye } from 'lucide-vue-next';
import { useResizeObserver } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';
import { layoutStore } from '../composables/useLayout';
import { LayoutConfig } from '../layout/layoutConfig';
import { calculateContainSize } from '../layout/layoutMath';
import { videoPlayer } from '../composables/useVideoPlayer';
import type { LayoutConfigSchema } from '../types';

const props = withDefaults(
  defineProps<{
    hasEvent?: boolean;
    layout?: string;
    focusCamera?: string | null;
    hasPillarCameras?: boolean;
    hiddenCameras?: string[];
  }>(),
  {
    hasEvent: false,
    layout: 'layout-6-3',
    focusCamera: null,
    hasPillarCameras: false,
    hiddenCameras: () => [],
  }
);

const emit = defineEmits<{
  (e: 'toggleCameraHide', camera: string): void;
  (e: 'unhideCamera', camera: string): void;
  (e: 'toggleMobileFullscreen'): void;
  (e: 'togglePlay'): void;
  (e: 'exitFullscreen'): void;
}>();

const { t } = useI18n();

const cameras = [
  ['front', 'videoFront', 'hideFront'],
  ['back', 'videoBack', 'hideback'],
  ['left_repeater', 'videoLeft', 'hideLeft'],
  ['right_repeater', 'videoRight', 'hideRight'],
  ['left_pillar', 'videoLeftPillar', 'hideLeftPillar'],
  ['right_pillar', 'videoRightPillar', 'hideRightPillar'],
];

const containerRef = ref<HTMLElement | null>(null);
const gridWidth = ref(0);
const gridHeight = ref(0);

const draggedCamera = ref<string | null>(null);
const dragOverCamera = ref<string | null>(null);

function handleDragStart(camera: string, e: DragEvent): void {
  draggedCamera.value = camera;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', camera);
  }
}

function handleDragOver(camera: string, e: DragEvent): void {
  e.preventDefault();
  if (draggedCamera.value && draggedCamera.value !== camera) {
    dragOverCamera.value = camera;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }
}

function handleDragLeave(): void {
  dragOverCamera.value = null;
}

function handleDrop(targetCamera: string, e: DragEvent): void {
  e.preventDefault();
  const source = draggedCamera.value || e.dataTransfer?.getData('text/plain');
  if (source && source !== targetCamera) {
    layoutStore.swapCameras(source, targetCamera);
  }
  draggedCamera.value = null;
  dragOverCamera.value = null;
}

function handleDragEnd(): void {
  draggedCamera.value = null;
  dragOverCamera.value = null;
}

function handleContainerDblClick(e: MouseEvent): void {
  const container = e.currentTarget as HTMLElement | null;
  if (!container) return;
  if (typeof document !== 'undefined') {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    } else {
      container.requestFullscreen?.().catch(console.error);
    }
  }
}

const activeConfig = computed<LayoutConfigSchema | any>(() => {
  return layoutStore.currentConfig;
});

function updateGridDimensions(): void {
  if (!containerRef.value) return;
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  if (!width || !height) return;

  const cfg = activeConfig.value;
  const aspectRatioStr = cfg?.canvas?.aspectRatio || '4:3';
  const arParts = LayoutConfig.ASPECT_RATIOS[aspectRatioStr] || {
    width: 4,
    height: 3,
  };
  const ar = arParts.width / arParts.height;

  const size = calculateContainSize(width, height, ar);
  gridWidth.value = size.width;
  gridHeight.value = size.height;
}

useResizeObserver(containerRef, () => {
  updateGridDimensions();
});

onMounted(() => {
  updateGridDimensions();
  videoPlayer.bindVideos();
});

watch([activeConfig, () => props.layout], () => {
  updateGridDimensions();
});

const gridStyle = computed(() => {
  const cfg = activeConfig.value;
  const aspectRatioStr = cfg?.canvas?.aspectRatio || '4:3';
  const arParts = LayoutConfig.ASPECT_RATIOS[aspectRatioStr] || {
    width: 4,
    height: 3,
  };

  const style: Record<string, string> = {
    position: 'relative',
    backgroundColor: cfg?.canvas?.backgroundColor || '#000000',
    aspectRatio: `${arParts.width} / ${arParts.height}`,
    maxWidth: '100%',
    maxHeight: '100%',
    display: 'block',
  };

  if (gridWidth.value > 0 && gridHeight.value > 0) {
    style.width = `${gridWidth.value}px`;
    style.height = `${gridHeight.value}px`;
  } else {
    style.width = '100%';
    style.height = '100%';
  }

  return style;
});

function isHidden(cam: string): boolean {
  return props.hiddenCameras ? props.hiddenCameras.includes(cam) : false;
}

function getCameraContainerStyle(
  cameraName: string
): Record<string, string | number> {
  const isPillar =
    cameraName === 'left_pillar' || cameraName === 'right_pillar';
  if (isPillar && !props.hasPillarCameras) {
    return { display: 'none' };
  }

  const isUserHidden = isHidden(cameraName);
  const cfg = activeConfig.value;
  const cam = cfg?.cameras?.[cameraName];

  if (!cam || !cam.enabled || isUserHidden) {
    return { display: 'none' };
  }

  const isFocused = props.focusCamera === cameraName;
  const pos = isFocused
    ? { x: 0, y: 0, width: 100, height: 100 }
    : cam.position;

  const crop = cam.crop || { top: 0, right: 0, bottom: 0, left: 0 };
  const hasCrop =
    (crop.top ?? 0) > 0 ||
    (crop.right ?? 0) > 0 ||
    (crop.bottom ?? 0) > 0 ||
    (crop.left ?? 0) > 0;

  const clipPath = hasCrop
    ? `inset(${crop.top ?? 0}% ${crop.right ?? 0}% ${crop.bottom ?? 0}% ${crop.left ?? 0}%)`
    : 'none';

  return {
    position: 'absolute',
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    width: `${pos.width}%`,
    height: `${pos.height}%`,
    zIndex: isFocused ? 99 : cam.zIndex || 1,
    clipPath,
    display: 'block',
  };
}

function getCameraObjectFit(cameraName: string): 'contain' | 'cover' | 'fill' {
  const cfg = activeConfig.value;
  return cfg?.cameras?.[cameraName]?.objectFit || 'contain';
}
</script>

<style scoped>
/* Scan-line overlay for video area */
.video-grid-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  pointer-events: none;
  z-index: 10;
}

.video-grid-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-void);
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.video-grid-container:has(.video-grid:not(.grid-2x2)),
.video-grid-container:has(.video-grid.layout-custom-config) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-grid-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-void);
  z-index: 1000;
  pointer-events: none;
}

.video-grid-placeholder.hidden {
  display: none;
}

.placeholder-content {
  text-align: center;
  color: var(--text-muted);
}

/* Video Grid */
.video-grid {
  position: relative;
  background: var(--bg-void);
  overflow: hidden;
  margin: auto;
  transition: all 0.3s ease;
  /* Isolate the video region from layout/paint cascades in unrelated parts
     * of the UI (timeline hover, transport-button :hover shadow animations).
     * Without this, mouse movement over buttons can stall video decode. */
  contain: layout paint;
}

/* Promote every video element to its own GPU compositor layer. Prevents
 * button/timeline hover repaints from cascading into video decode and
 * causing the "Buffering: X" stutter bug. */
.video-grid video {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* Systemic root-cause fix for the mouse-hover buffering bug:
 * Every button has an <svg> child with <path> geometry. Without this rule,
 * the browser does expensive hit-testing against each SVG path on every
 * mousemove event (~200Hz on modern mice), plus fires style-recalc and
 * hover-state transitions against both the <button> AND the inner SVG.
 * Making SVGs non-interactive means the browser does one cheap rectangular
 * hit-test against the button and moves on. Applies broadly to all
 * icon-bearing controls (transport, zoom, layout dropdown, etc.) */
button svg,
button svg *,
.control-btn svg,
.control-btn svg * {
  pointer-events: none;
}

.video-grid.grid-2x2 {
  display: grid;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  aspect-ratio: 4 / 3;
  /* No gap - videos touch edge-to-edge, all dead space goes to outer edges */
}

/* Absolute positioned layouts - sizing handled by JavaScript for proper contain behavior */
.video-grid.layout-6-3,
.video-grid.layout-4-3,
.video-grid.layout-all-16-9,
.video-grid.layout-front-left,
.video-grid.layout-front-right,
.video-grid.layout-front-repeaters,
.video-grid.layout-focus,
.video-grid.layout-custom-config {
  /* JavaScript sets width/height to fit container while maintaining aspect ratio */
  max-width: 100%;
  max-height: 100%;
}

/* Layout: 6:3 */
.video-grid.layout-6-3 {
  aspect-ratio: 6 / 3;
}

.video-grid.layout-6-3 .video-container {
  position: absolute;
}

.video-grid.layout-6-3 .video-container:nth-child(1) {
  left: 20%;
  top: 0%;
  width: 60%;
  height: 55%;
  z-index: 15;
}

.video-grid.layout-6-3 .video-container:nth-child(2) {
  left: 24%;
  top: 55%;
  width: 52%;
  height: 45%;
  z-index: 20;
}

.video-grid.layout-6-3 .video-container:nth-child(3) {
  left: 54%;
  top: 51%;
  width: 46%;
  height: 49%;
  z-index: 10;
}

.video-grid.layout-6-3 .video-container:nth-child(4) {
  left: 0%;
  top: 51%;
  width: 46%;
  height: 49%;
  z-index: 10;
}

/* Layout: 4:3 */
.video-grid.layout-4-3 {
  aspect-ratio: 4 / 3;
}

.video-grid.layout-4-3 .video-container {
  position: absolute;
}

.video-grid.layout-4-3 .video-container:nth-child(1) {
  left: 18%;
  top: 1%;
  width: 64%;
  height: 68%;
  z-index: 10;
}

.video-grid.layout-4-3 .video-container:nth-child(2) {
  left: 39%;
  top: 0%;
  width: 22%;
  height: 25%;
  z-index: 20;
}

.video-grid.layout-4-3 .video-container:nth-child(3) {
  left: 55%;
  top: 55%;
  width: 45%;
  height: 45%;
  z-index: 5;
}

.video-grid.layout-4-3 .video-container:nth-child(4) {
  left: 0%;
  top: 55%;
  width: 45%;
  height: 45%;
  z-index: 5;
}

/* Layout: All 16:9 */
.video-grid.layout-all-16-9 {
  aspect-ratio: 16 / 9;
}

.video-grid.layout-all-16-9 .video-container {
  position: absolute;
}

.video-grid.layout-all-16-9 .video-container:nth-child(1) {
  left: 20%;
  top: 0%;
  width: 60%;
  height: 50%;
  z-index: 15;
}

.video-grid.layout-all-16-9 .video-container:nth-child(2) {
  left: 28%;
  top: 56%;
  width: 44%;
  height: 44%;
  z-index: 10;
}

.video-grid.layout-all-16-9 .video-container:nth-child(3) {
  left: 58%;
  top: 56%;
  width: 42%;
  height: 44%;
  z-index: 15;
}

.video-grid.layout-all-16-9 .video-container:nth-child(4) {
  left: 0%;
  top: 56%;
  width: 42%;
  height: 44%;
  z-index: 15;
}

/* Layout: Front & Left 8:3 */
.video-grid.layout-front-left {
  aspect-ratio: 8 / 3;
}

.video-grid.layout-front-left .video-container {
  position: absolute;
  top: 0%;
  height: 100%;
}

.video-grid.layout-front-left .video-container:nth-child(1) {
  left: 50%;
  width: 50%;
  z-index: 10;
}

.video-grid.layout-front-left .video-container:nth-child(2) {
  display: none;
}

.video-grid.layout-front-left .video-container:nth-child(3) {
  left: 0%;
  width: 50%;
  z-index: 10;
}

.video-grid.layout-front-left .video-container:nth-child(4) {
  display: none;
}

/* Layout: Front & Right 8:3 */
.video-grid.layout-front-right {
  aspect-ratio: 8 / 3;
}

.video-grid.layout-front-right .video-container {
  position: absolute;
  top: 0%;
  height: 100%;
}

.video-grid.layout-front-right .video-container:nth-child(1) {
  left: 0%;
  width: 50%;
  z-index: 10;
}

.video-grid.layout-front-right .video-container:nth-child(2) {
  display: none;
}

.video-grid.layout-front-right .video-container:nth-child(3) {
  display: none;
}

.video-grid.layout-front-right .video-container:nth-child(4) {
  left: 50%;
  width: 50%;
  z-index: 10;
}

/* Layout: Front & Repeaters 12:3 */
.video-grid.layout-front-repeaters {
  aspect-ratio: 12 / 3;
}

.video-grid.layout-front-repeaters .video-container {
  position: absolute;
  top: 0%;
  height: 100%;
}

.video-grid.layout-front-repeaters .video-container:nth-child(1) {
  left: 33.33%;
  width: 33.34%;
  z-index: 10;
}

.video-grid.layout-front-repeaters .video-container:nth-child(2) {
  display: none;
}

.video-grid.layout-front-repeaters .video-container:nth-child(3) {
  left: 0%;
  width: 33.33%;
  z-index: 10;
}

.video-grid.layout-front-repeaters .video-container:nth-child(4) {
  left: 66.67%;
  width: 33.33%;
  z-index: 10;
}

/* Layout: Focus Mode */
.video-grid.layout-focus {
  aspect-ratio: 4 / 3;
  width: 100%;
  max-width: 100%;
  max-height: 100%;
  position: relative;
}

.video-grid.layout-focus .video-container {
  display: none;
}

.video-grid.layout-focus .video-container.camera-focused {
  display: block;
  position: absolute;
  left: 0%;
  top: 0%;
  width: 100%;
  height: 100%;
  z-index: 100;
}

.video-container {
  position: relative;
  background: var(--bg-void);
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  transition: opacity 0.3s ease;
}

.video-container.camera-hidden {
  display: none;
}

/* Drag & Drop states */
.video-container.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.video-container.drag-over {
  outline: 3px dashed var(--accent);
  outline-offset: -3px;
  background: rgba(0, 212, 255, 0.1);
}

.video-container[draggable='true'] {
  cursor: grab;
}

.video-container[draggable='true']:active {
  cursor: grabbing;
}

.video-player {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.video-label {
  z-index: 100;
  position: absolute;
  top: 10px;
  left: 10px;
  background: var(--glass);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--text-primary);
  padding: 0.3rem 0.75rem;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  pointer-events: none;
  border: 1px solid var(--glass-border);
  text-transform: uppercase;
}

.video-label.ended {
  background: rgba(255, 59, 59, 0.85);
  border-color: var(--danger);
  box-shadow: 0 0 10px var(--danger-glow);
}

/* Camera Hide Button */
.camera-hide-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--glass);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-container:hover .camera-hide-btn {
  opacity: 1;
}

.camera-hide-btn:hover {
  background: var(--bg-elevated);
  color: var(--danger);
  border-color: var(--danger);
}

/* Hidden Cameras Panel */
.hidden-cameras-panel {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--glass);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
}

.hidden-cameras-panel.hidden {
  display: none;
}

.hidden-label {
  font-family: var(--font-ui);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hidden-cameras-list {
  display: flex;
  gap: 6px;
}

.hidden-camera-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hidden-camera-btn:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

.hidden-camera-btn svg {
  width: 14px;
  height: 14px;
}
</style>
