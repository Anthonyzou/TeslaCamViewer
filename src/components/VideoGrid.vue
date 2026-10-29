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
          <div class="video-label">{{ t('cameras.' + item[0]) }}</div>
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
      <span class="hidden-cameras-label"
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

  const isFocused =
    props.layout === 'layout-focus' &&
    (props.focusCamera || 'front') === cameraName;
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
@reference "tailwindcss";

/* Scan-line overlay for video area */
.video-grid-container::after {
  @apply pointer-events-none absolute inset-0 z-10;
  content: '';
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    var(--c-overlay-black-3) 2px,
    var(--c-overlay-black-3) 4px
  );
}

.video-grid-container {
  @apply relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-(--bg-void);
}

.video-grid-container:has(.video-grid:not(.grid-2x2)),
.video-grid-container:has(.video-grid.layout-custom-config) {
  @apply flex items-center justify-center;
}

.video-grid-placeholder {
  @apply pointer-events-none absolute inset-0 z-1000 flex items-center justify-center bg-(--bg-void);
}

.video-grid-placeholder.hidden {
  display: none;
}

.placeholder-content {
  @apply text-center text-(--text-muted);
}

/* Video Grid */
.video-grid {
  @apply relative m-auto overflow-hidden bg-(--bg-void) transition-all duration-300;
  /* Isolate the video region from layout/paint cascades in unrelated parts
     * of the UI (timeline hover, transport-button :hover shadow animations).
     * Without this, mouse movement over buttons can stall video decode. */
  contain: layout paint;
}

/* Promote every video element to its own GPU compositor layer. Prevents
 * button/timeline hover repaints from cascading into video decode and
 * causing the "Buffering: X" stutter bug. */
.video-grid video {
  @apply will-change-transform backface-hidden;
  transform: translateZ(0);
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
  @apply pointer-events-none;
}

.video-grid.grid-2x2 {
  @apply grid h-auto w-auto max-h-full max-w-full aspect-[4/3] grid-cols-2 grid-rows-2;
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
  @apply max-h-full max-w-full;
}

/* Layout: 6:3 */
.video-grid.layout-6-3 {
  @apply aspect-[6/3];
}

.video-grid.layout-6-3 .video-container {
  @apply absolute;
}

.video-grid.layout-6-3 .video-container:nth-child(1) {
  @apply top-0 left-[20%] h-[55%] w-[60%] z-15;
}

.video-grid.layout-6-3 .video-container:nth-child(2) {
  @apply top-[55%] left-[24%] h-[45%] w-[52%] z-20;
}

.video-grid.layout-6-3 .video-container:nth-child(3) {
  @apply top-[51%] left-[54%] h-[49%] w-[46%] z-10;
}

.video-grid.layout-6-3 .video-container:nth-child(4) {
  @apply top-[51%] left-0 h-[49%] w-[46%] z-10;
}

/* Layout: 4:3 */
.video-grid.layout-4-3 {
  @apply aspect-[4/3];
}

.video-grid.layout-4-3 .video-container {
  @apply absolute;
}

.video-grid.layout-4-3 .video-container:nth-child(1) {
  @apply top-[1%] left-[18%] h-[68%] w-[64%] z-10;
}

.video-grid.layout-4-3 .video-container:nth-child(2) {
  @apply top-0 left-[39%] h-[25%] w-[22%] z-20;
}

.video-grid.layout-4-3 .video-container:nth-child(3) {
  @apply top-[55%] left-[55%] h-[45%] w-[45%] z-5;
}

.video-grid.layout-4-3 .video-container:nth-child(4) {
  @apply top-[55%] left-0 h-[45%] w-[45%] z-5;
}

/* Layout: All 16:9 */
.video-grid.layout-all-16-9 {
  @apply aspect-video;
}

.video-grid.layout-all-16-9 .video-container {
  @apply absolute;
}

.video-grid.layout-all-16-9 .video-container:nth-child(1) {
  @apply top-0 left-[20%] h-[50%] w-[60%] z-15;
}

.video-grid.layout-all-16-9 .video-container:nth-child(2) {
  @apply top-[56%] left-[28%] h-[44%] w-[44%] z-10;
}

.video-grid.layout-all-16-9 .video-container:nth-child(3) {
  @apply top-[56%] left-[58%] h-[44%] w-[42%] z-15;
}

.video-grid.layout-all-16-9 .video-container:nth-child(4) {
  @apply top-[56%] left-0 h-[44%] w-[42%] z-15;
}

/* Layout: Front & Left 8:3 */
.video-grid.layout-front-left {
  @apply aspect-[8/3];
}

.video-grid.layout-front-left .video-container {
  @apply absolute top-0 h-full;
}

.video-grid.layout-front-left .video-container:nth-child(1) {
  @apply left-1/2 w-1/2 z-10;
}

.video-grid.layout-front-left .video-container:nth-child(2) {
  @apply hidden;
}

.video-grid.layout-front-left .video-container:nth-child(3) {
  @apply left-0 w-1/2 z-10;
}

.video-grid.layout-front-left .video-container:nth-child(4) {
  @apply hidden;
}

/* Layout: Front & Right 8:3 */
.video-grid.layout-front-right {
  @apply aspect-[8/3];
}

.video-grid.layout-front-right .video-container {
  @apply absolute top-0 h-full;
}

.video-grid.layout-front-right .video-container:nth-child(1) {
  @apply left-0 w-1/2 z-10;
}

.video-grid.layout-front-right .video-container:nth-child(2) {
  @apply hidden;
}

.video-grid.layout-front-right .video-container:nth-child(3) {
  @apply hidden;
}

.video-grid.layout-front-right .video-container:nth-child(4) {
  @apply left-1/2 w-1/2 z-10;
}

/* Layout: Front & Repeaters 12:3 */
.video-grid.layout-front-repeaters {
  @apply aspect-[12/3];
}

.video-grid.layout-front-repeaters .video-container {
  @apply absolute top-0 h-full;
}

.video-grid.layout-front-repeaters .video-container:nth-child(1) {
  @apply left-[33.33%] w-[33.34%] z-10;
}

.video-grid.layout-front-repeaters .video-container:nth-child(2) {
  @apply hidden;
}

.video-grid.layout-front-repeaters .video-container:nth-child(3) {
  @apply left-0 w-[33.33%] z-10;
}

.video-grid.layout-front-repeaters .video-container:nth-child(4) {
  @apply left-[66.67%] w-[33.33%] z-10;
}

/* Layout: Focus Mode */
.video-grid.layout-focus {
  @apply relative aspect-[4/3] w-full max-w-full max-h-full;
}

.video-grid.layout-focus .video-container {
  @apply hidden;
}

.video-grid.layout-focus .video-container.camera-focused {
  @apply absolute top-0 left-0 z-100 block size-full;
}

.video-container {
  @apply relative min-h-0 min-w-0 overflow-hidden bg-(--bg-void) transition-opacity duration-300;
}

.video-container.camera-hidden {
  @apply hidden;
}

/* Drag & Drop states */
.video-container.dragging {
  @apply cursor-grabbing opacity-50;
}

.video-container.drag-over {
  @apply outline-3 outline-dashed outline-(--accent) -outline-offset-3;
  background-color: color-mix(in srgb, var(--accent) 10%, transparent);
}

.video-container[draggable='true'] {
  @apply cursor-grab;
}

.video-container[draggable='true']:active {
  @apply cursor-grabbing;
}

.video-player {
  @apply block size-full object-contain;
}

.video-label {
  @apply pointer-events-none absolute top-2.5 left-2.5 z-100 rounded border border-(--glass-border) bg-(--glass) px-3 py-1.5 font-(family-name:--font-mono) text-xs font-medium tracking-[0.05em] text-(--text-primary) uppercase backdrop-blur-[8px];
  -webkit-backdrop-filter: blur(8px);
}

.video-label.ended {
  @apply border-(--danger);
  background-color: color-mix(in srgb, var(--danger) 85%, transparent);
  box-shadow: 0 0 10px var(--danger-glow);
}

/* Camera Hide Button */
.camera-hide-btn {
  @apply absolute top-2.5 right-2.5 z-10 flex cursor-pointer items-center justify-center rounded-md border border-(--glass-border) bg-(--glass) p-1.5 text-(--text-secondary) opacity-0 backdrop-blur-[8px] transition-all duration-200;
  -webkit-backdrop-filter: blur(8px);
}

.video-container:hover .camera-hide-btn {
  @apply opacity-100;
}

.camera-hide-btn:hover {
  @apply border-(--danger) bg-(--bg-elevated) text-(--danger);
}

/* Hidden Cameras Panel */
.hidden-cameras-panel {
  @apply absolute bottom-2.5 left-1/2 z-100 flex items-center gap-2 rounded-lg border border-(--glass-border) bg-(--glass) px-3 py-2 backdrop-blur-[10px];
  -webkit-backdrop-filter: blur(10px);
  transform: translateX(-50%);
}

.hidden-cameras-panel.hidden {
  display: none;
}

.hidden-label {
  @apply font-(family-name:--font-ui) text-xs tracking-[0.05em] text-(--text-muted) uppercase;
}

.hidden-cameras-list {
  @apply flex gap-1.5;
}

.hidden-camera-btn {
  @apply flex cursor-pointer items-center gap-1.5 rounded border border-(--border) bg-(--bg-tertiary) px-2.5 py-1 font-(family-name:--font-mono) text-xs text-(--text-secondary) transition-all duration-200;
}

.hidden-camera-btn:hover {
  @apply border-(--accent) bg-(--accent-subtle) text-(--accent);
}

.hidden-camera-btn svg {
  @apply size-3.5;
}
</style>
