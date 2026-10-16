<template>
  <div class="timeline-row">
    <!-- Timeline -->
    <div class="timeline-container">
      <!-- Mini-map for zoomed timeline -->
      <div id="timelineMinimap" class="timeline-minimap hidden">
        <div id="minimapProgress" class="minimap-progress"></div>
        <div id="minimapMarkers" class="minimap-markers"></div>
        <div id="minimapViewport" class="minimap-viewport"></div>
        <div id="minimapPosition" class="minimap-position"></div>
      </div>
      <div id="timeline" class="timeline">
        <div id="timelineProgress" class="timeline-progress"></div>
        <div id="timelineScrubber" class="timeline-scrubber"></div>
        <div id="timelineClips" class="timeline-clips"></div>
      </div>
    </div>

    <!-- Zoom Controls (right side) -->
    <div class="timeline-zoom-controls">
      <button
        id="zoomInBtn"
        class="control-btn zoom-btn"
        :disabled="!hasEvent"
        :title="t('controls.zoomIn')"
        @click="emit('zoomIn')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
      <button
        id="zoomOutBtn"
        class="control-btn zoom-btn"
        :disabled="!hasEvent"
        :title="t('controls.zoomOut')"
        @click="emit('zoomOut')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13H5v-2h14v2z" />
        </svg>
      </button>
      <button
        id="zoomResetBtn"
        class="control-btn zoom-btn"
        :disabled="!hasEvent"
        :title="t('controls.resetZoom')"
        @click="emit('zoomReset')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

defineProps<{
  hasEvent: boolean;
}>();

const emit = defineEmits<{
  (e: 'zoomIn'): void;
  (e: 'zoomOut'): void;
  (e: 'zoomReset'): void;
}>();

const localeTick = ref(0);

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
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
