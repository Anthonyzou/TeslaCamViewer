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
        <ZoomIn :size="18" />
      </button>
      <button
        id="zoomOutBtn"
        class="control-btn zoom-btn"
        :disabled="!hasEvent"
        :title="t('controls.zoomOut')"
        @click="emit('zoomOut')"
      >
        <ZoomOut :size="18" />
      </button>
      <button
        id="zoomResetBtn"
        class="control-btn zoom-btn"
        :disabled="!hasEvent"
        :title="t('controls.resetZoom')"
        @click="emit('zoomReset')"
      >
        <RotateCcw :size="18" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-vue-next';

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
