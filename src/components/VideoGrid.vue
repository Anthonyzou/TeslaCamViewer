<template>
  <div ref="containerRef" class="video-grid-container">
    <div
      id="videoGrid"
      class="video-grid"
      :class="[layout, { 'has-pillars': hasPillarCameras }]"
      :style="gridStyle"
    >
      <div
        class="video-container"
        data-camera="front"
        :class="{ hidden: isHidden('front') }"
        :style="getCameraContainerStyle('front')"
      >
        <video
          id="videoFront"
          class="video-player"
          crossorigin="anonymous"
          preload="auto"
          :style="{ objectFit: getCameraObjectFit('front') }"
        ></video>
        <div class="video-label" data-i18n="cameras.front">
          {{ t('cameras.front') }}
        </div>
        <button
          class="camera-hide-btn"
          data-camera="front"
          :title="t('cameras.hideFront')"
          @click="emit('toggleCameraHide', 'front')"
        >
          <Eye :size="16" />
        </button>
      </div>

      <div
        class="video-container"
        data-camera="back"
        :class="{ hidden: isHidden('back') }"
        :style="getCameraContainerStyle('back')"
      >
        <video
          id="videoBack"
          class="video-player"
          crossorigin="anonymous"
          preload="auto"
          :style="{ objectFit: getCameraObjectFit('back') }"
        ></video>
        <div class="video-label" data-i18n="cameras.back">
          {{ t('cameras.back') }}
        </div>
        <button
          class="camera-hide-btn"
          data-camera="back"
          :title="t('cameras.hideBack')"
          @click="emit('toggleCameraHide', 'back')"
        >
          <Eye :size="16" />
        </button>
      </div>

      <div
        class="video-container"
        data-camera="left_repeater"
        :class="{ hidden: isHidden('left_repeater') }"
        :style="getCameraContainerStyle('left_repeater')"
      >
        <video
          id="videoLeft"
          class="video-player"
          crossorigin="anonymous"
          preload="auto"
          :style="{ objectFit: getCameraObjectFit('left_repeater') }"
        ></video>
        <div class="video-label" data-i18n="cameras.left">
          {{ t('cameras.left') }}
        </div>
        <button
          class="camera-hide-btn"
          data-camera="left_repeater"
          :title="t('cameras.hideLeft')"
          @click="emit('toggleCameraHide', 'left_repeater')"
        >
          <Eye :size="16" />
        </button>
      </div>

      <div
        class="video-container"
        data-camera="right_repeater"
        :class="{ hidden: isHidden('right_repeater') }"
        :style="getCameraContainerStyle('right_repeater')"
      >
        <video
          id="videoRight"
          class="video-player"
          crossorigin="anonymous"
          preload="auto"
          :style="{ objectFit: getCameraObjectFit('right_repeater') }"
        ></video>
        <div class="video-label" data-i18n="cameras.right">
          {{ t('cameras.right') }}
        </div>
        <button
          class="camera-hide-btn"
          data-camera="right_repeater"
          :title="t('cameras.hideRight')"
          @click="emit('toggleCameraHide', 'right_repeater')"
        >
          <Eye :size="16" />
        </button>
      </div>

      <div
        class="video-container pillar-camera"
        data-camera="left_pillar"
        :class="{ hidden: isHidden('left_pillar') }"
        :style="getCameraContainerStyle('left_pillar')"
      >
        <video
          id="videoLeftPillar"
          class="video-player"
          crossorigin="anonymous"
          preload="auto"
          :style="{ objectFit: getCameraObjectFit('left_pillar') }"
        ></video>
        <div class="video-label" data-i18n="cameras.leftPillar">
          {{ t('cameras.leftPillar') }}
        </div>
        <button
          class="camera-hide-btn"
          data-camera="left_pillar"
          :title="t('cameras.hideLeftPillar')"
          @click="emit('toggleCameraHide', 'left_pillar')"
        >
          <Eye :size="16" />
        </button>
      </div>

      <div
        class="video-container pillar-camera"
        data-camera="right_pillar"
        :class="{ hidden: isHidden('right_pillar') }"
        :style="getCameraContainerStyle('right_pillar')"
      >
        <video
          id="videoRightPillar"
          class="video-player"
          crossorigin="anonymous"
          preload="auto"
          :style="{ objectFit: getCameraObjectFit('right_pillar') }"
        ></video>
        <div class="video-label" data-i18n="cameras.rightPillar">
          {{ t('cameras.rightPillar') }}
        </div>
        <button
          class="camera-hide-btn"
          data-camera="right_pillar"
          :title="t('cameras.hideRightPillar')"
          @click="emit('toggleCameraHide', 'right_pillar')"
        >
          <Eye :size="16" />
        </button>
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

    <!-- Mobile Fullscreen Button -->
    <button
      id="mobileFullscreenBtn"
      class="mobile-fullscreen-btn hidden"
      :title="t('player.fullscreen')"
      @click="emit('toggleMobileFullscreen')"
    >
      <Maximize :size="24" />
    </button>

    <!-- Mobile Fullscreen Overlay -->
    <div id="mobileFullscreenOverlay" class="mobile-fullscreen-overlay hidden">
      <button
        id="fullscreenPlayBtn"
        class="fullscreen-control-btn"
        @click="emit('togglePlay')"
      >
        <Play :size="48" />
      </button>
      <button
        id="exitFullscreenBtn"
        class="fullscreen-exit-btn"
        :title="t('player.exitFullscreen')"
        @click="emit('exitFullscreen')"
      >
        <Minimize :size="24" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Eye, Maximize, Minimize, Play } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';
import { LayoutConfig } from '../layout/layoutConfig';
import { calculateContainSize } from '../layout/layoutMath';
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

const containerRef = ref<HTMLElement | null>(null);
const gridWidth = ref(0);
const gridHeight = ref(0);

const activeConfig = computed<LayoutConfigSchema | any>(() => {
  const lm = typeof window !== 'undefined' ? window.app?.layoutManager : null;
  if (lm?.currentConfig) {
    return lm.currentConfig;
  }
  return (
    LayoutConfig.presetToConfig(props.layout) ||
    LayoutConfig.presetToConfig('layout-6-3')
  );
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

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateGridDimensions();
    });
    resizeObserver.observe(containerRef.value);
  }
  updateGridDimensions();
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
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
