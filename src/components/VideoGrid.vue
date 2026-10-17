<template>
  <div class="video-grid-container">
    <div
      id="videoGrid"
      class="video-grid"
      :class="[layout, { 'has-pillars': hasPillarCameras }]"
    >
      <div class="video-container" :class="{ hidden: isHidden('front') }">
        <video
          id="videoFront"
          class="video-player"
          crossorigin="anonymous"
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
      <div class="video-container" :class="{ hidden: isHidden('back') }">
        <video
          id="videoBack"
          class="video-player"
          crossorigin="anonymous"
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
        :class="{ hidden: isHidden('left_repeater') }"
      >
        <video
          id="videoLeft"
          class="video-player"
          crossorigin="anonymous"
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
        :class="{ hidden: isHidden('right_repeater') }"
      >
        <video
          id="videoRight"
          class="video-player"
          crossorigin="anonymous"
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
        :class="{ hidden: isHidden('left_pillar') }"
      >
        <video
          id="videoLeftPillar"
          class="video-player"
          crossorigin="anonymous"
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
        :class="{ hidden: isHidden('right_pillar') }"
      >
        <video
          id="videoRightPillar"
          class="video-player"
          crossorigin="anonymous"
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
  </div>

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
</template>

<script setup lang="ts">
import { Eye, Maximize, Minimize, Play } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';
import i18n from '../utils/i18n';

const props = withDefaults(
  defineProps<{
    layout?: string;
    hasPillarCameras?: boolean;
    hiddenCameras?: string[];
  }>(),
  {
    layout: 'layout-6-3',
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

const localeTick = ref(0);

function t(key: string): string {
  return i18n.t ? window.i18n.t(key) : key.split('.').pop() || '';
}

function isHidden(cam: string): boolean {
  return props.hiddenCameras ? props.hiddenCameras.includes(cam) : false;
}

function onLocaleChanged(): void {
  localeTick.value++;
}

onMounted(() => {
  window.addEventListener('localeChanged', onLocaleChanged);
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
});
</script>
