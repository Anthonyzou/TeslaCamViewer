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
      <div
        id="timeline"
        class="timeline"
        ref="timelineEl"
        @mousedown="onTimelineMouseDown"
        @touchstart.passive="onTimelineTouchStart"
      >
        <div
          id="timelineProgress"
          class="timeline-progress"
          :style="{ width: `${progressPercent}%` }"
        ></div>
        <div
          id="timelineScrubber"
          class="timeline-scrubber"
          :class="{ dragging: isDragging }"
          :style="{ left: `${progressPercent}%` }"
        ></div>

        <div id="timelineClips" class="timeline-clips">
          <!-- Clip Boundary Markers -->
          <div
            v-for="(pct, idx) in clipMarkers"
            :key="'clip-' + idx"
            class="clip-marker"
            :style="{ left: pct + '%' }"
          ></div>

          <!-- Sentry Trigger Marker -->
          <div
            v-if="sentryMarker !== null"
            class="sentry-trigger-marker"
            :style="{ left: sentryMarker + '%' }"
            title="Sentry Trigger"
          ></div>
        </div>

        <!-- IN / OUT Visual Markers -->
        <div class="clip-markers">
          <div
            v-if="inPoint !== null"
            class="mark-in-marker"
            :style="getMarkerStyle(inPoint)"
          >
            <span class="marker-label">IN</span>
          </div>
          <div
            v-if="outPoint !== null"
            class="mark-out-marker"
            :style="getMarkerStyle(outPoint)"
          >
            <span class="marker-label">OUT</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useClipMarking } from '../composables/useClipMarking';
import { useTimeline } from '../composables/useTimeline';

defineProps<{
  hasEvent: boolean;
}>();

const timelineEl = ref<HTMLElement | null>(null);

const {
  totalDuration,
  isDragging,
  clipMarkers,
  sentryMarker,
  progressPercent,
  seekToPercent,
} = useTimeline();

const { inPoint, outPoint } = useClipMarking(
  () => window.app?.videoPlayer,
  () => timelineEl.value
);

function handleSeek(clientX: number) {
  if (!timelineEl.value || totalDuration.value <= 0) return;
  const rect = timelineEl.value.getBoundingClientRect();
  const clickX = clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  seekToPercent(pct);
}

function onTimelineMouseDown(e: MouseEvent) {
  isDragging.value = true;
  handleSeek(e.clientX);
  window.addEventListener('mousemove', onTimelineMouseMove);
  window.addEventListener('mouseup', onTimelineMouseUp);
}

function onTimelineMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    handleSeek(e.clientX);
  }
}

function onTimelineMouseUp() {
  if (isDragging.value) {
    isDragging.value = false;
    window.removeEventListener('mousemove', onTimelineMouseMove);
    window.removeEventListener('mouseup', onTimelineMouseUp);
  }
}

function onTimelineTouchStart(e: TouchEvent) {
  if (e.touches.length > 0) {
    isDragging.value = true;
    handleSeek(e.touches[0].clientX);
    window.addEventListener('touchmove', onTimelineTouchMove);
    window.addEventListener('touchend', onTimelineTouchEnd);
  }
}

function onTimelineTouchMove(e: TouchEvent) {
  if (isDragging.value && e.touches.length > 0) {
    handleSeek(e.touches[0].clientX);
  }
}

function onTimelineTouchEnd() {
  if (isDragging.value) {
    isDragging.value = false;
    window.removeEventListener('touchmove', onTimelineTouchMove);
    window.removeEventListener('touchend', onTimelineTouchEnd);
  }
}

function getMarkerStyle(time: number) {
  const dur = totalDuration.value || 60;
  const pct = Math.max(0, Math.min(100, (time / dur) * 100));
  return { left: `${pct}%` };
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onTimelineMouseMove);
  window.removeEventListener('mouseup', onTimelineMouseUp);
  window.removeEventListener('touchmove', onTimelineTouchMove);
  window.removeEventListener('touchend', onTimelineTouchEnd);
});
</script>
