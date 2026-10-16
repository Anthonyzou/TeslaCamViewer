<template>
  <div class="video-grid-container">
    <div id="videoGridPlaceholder" class="video-grid-placeholder" :class="{ hidden: hasEvent }">
      <div class="placeholder-content">
        <p style="font-size: 1.2rem; margin-bottom: 0.5rem;" data-i18n="player.noEventSelected">
          {{ t('player.noEventSelected') }}
        </p>
        <p style="font-size: 0.9rem; color: var(--text-secondary);" data-i18n="player.selectEventHint">
          {{ t('player.selectEventHint') }}
        </p>
      </div>
    </div>
    <div class="video-grid">
      <div class="video-container" :class="{ hidden: isHidden('front') }">
        <video id="videoFront" class="video-player"></video>
        <div class="video-label" data-i18n="cameras.front">{{ t('cameras.front') }}</div>
        <button
          class="camera-hide-btn"
          data-camera="front"
          :title="t('cameras.hideFront')"
          @click="emit('toggleCameraHide', 'front')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
            />
          </svg>
        </button>
      </div>
      <div class="video-container" :class="{ hidden: isHidden('back') }">
        <video id="videoBack" class="video-player"></video>
        <div class="video-label" data-i18n="cameras.back">{{ t('cameras.back') }}</div>
        <button
          class="camera-hide-btn"
          data-camera="back"
          :title="t('cameras.hideBack')"
          @click="emit('toggleCameraHide', 'back')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
            />
          </svg>
        </button>
      </div>
      <div class="video-container" :class="{ hidden: isHidden('left_repeater') }">
        <video id="videoLeft" class="video-player"></video>
        <div class="video-label" data-i18n="cameras.left">{{ t('cameras.left') }}</div>
        <button
          class="camera-hide-btn"
          data-camera="left_repeater"
          :title="t('cameras.hideLeft')"
          @click="emit('toggleCameraHide', 'left_repeater')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
            />
          </svg>
        </button>
      </div>
      <div class="video-container" :class="{ hidden: isHidden('right_repeater') }">
        <video id="videoRight" class="video-player"></video>
        <div class="video-label" data-i18n="cameras.right">{{ t('cameras.right') }}</div>
        <button
          class="camera-hide-btn"
          data-camera="right_repeater"
          :title="t('cameras.hideRight')"
          @click="emit('toggleCameraHide', 'right_repeater')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
            />
          </svg>
        </button>
      </div>
      <div class="video-container pillar-camera" :class="{ hidden: isHidden('left_pillar') }">
        <video id="videoLeftPillar" class="video-player"></video>
        <div class="video-label" data-i18n="cameras.leftPillar">{{ t('cameras.leftPillar') }}</div>
        <button
          class="camera-hide-btn"
          data-camera="left_pillar"
          :title="t('cameras.hideLeftPillar')"
          @click="emit('toggleCameraHide', 'left_pillar')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
            />
          </svg>
        </button>
      </div>
      <div class="video-container pillar-camera" :class="{ hidden: isHidden('right_pillar') }">
        <video id="videoRightPillar" class="video-player"></video>
        <div class="video-label" data-i18n="cameras.rightPillar">{{ t('cameras.rightPillar') }}</div>
        <button
          class="camera-hide-btn"
          data-camera="right_pillar"
          :title="t('cameras.hideRightPillar')"
          @click="emit('toggleCameraHide', 'right_pillar')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
            />
          </svg>
        </button>
      </div>
    </div>
    <!-- Hidden Cameras Panel -->
    <div
      id="hiddenCamerasPanel"
      class="hidden-cameras-panel"
      :class="{ hidden: !hiddenCameras || hiddenCameras.length === 0 }"
    >
      <span class="hidden-label" data-i18n="player.hidden">{{ t('player.hidden') }}</span>
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
      </svg>
    </button>
  </div>

  <!-- Mobile Fullscreen Overlay -->
  <div id="mobileFullscreenOverlay" class="mobile-fullscreen-overlay hidden">
    <button id="fullscreenPlayBtn" class="fullscreen-control-btn" @click="emit('togglePlay')">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>
    <button
      id="exitFullscreenBtn"
      class="fullscreen-exit-btn"
      :title="t('player.exitFullscreen')"
      @click="emit('exitFullscreen')"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  hasEvent: boolean;
  hiddenCameras?: string[];
}>();

const emit = defineEmits<{
  (e: 'toggleCameraHide', cam: string): void;
  (e: 'unhideCamera', cam: string): void;
  (e: 'toggleMobileFullscreen'): void;
  (e: 'togglePlay'): void;
  (e: 'exitFullscreen'): void;
}>();

const localeTick = ref(0);

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

function isHidden(camera: string): boolean {
  return props.hiddenCameras ? props.hiddenCameras.includes(camera) : false;
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
