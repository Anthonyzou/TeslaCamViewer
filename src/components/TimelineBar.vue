<template>
  <div class="timeline-row">
    <!-- Timeline -->
    <div class="timeline-container">
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

<style scoped>
/* ==================== TIMELINE ==================== */
/* Timeline row wrapper - contains timeline, zoom controls */
.timeline-row {
  display: flex;
  align-items: center;
  background: var(--bg-secondary);
}

.timeline-container {
  flex: 1;
  padding: 0.25rem 0.75rem;
  overflow: visible;
}

.timeline {
  position: relative;
  height: 36px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  overflow: visible;
  /* Allow markers to extend outside */
}

/* Timeline gradient overlay */
.timeline::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.03) 0%,
    transparent 50%
  );
  pointer-events: none;
  border-radius: 6px;
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--accent-subtle) 0%,
    var(--accent) 100%
  );
  border-radius: 6px 0 0 6px;
  width: 0%;
  transition: width 0.15s ease-out;
  pointer-events: none;
}

.timeline-scrubber {
  position: absolute;
  top: 50%;
  left: 0%;
  width: 14px;
  height: 14px;
  background: var(--accent);
  border: 2px solid var(--text-primary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  pointer-events: none;
  z-index: 10;
  /* Tight glow (was 15px blur) — scrubber animates every frame of playback,
     * so the repaint cost for its shadow is paid ~30 times per second.
     * Reducing blur radius by ~4x cuts per-frame paint work significantly. */
  box-shadow: 0 0 4px var(--accent-glow);
  transition:
    left 0.1s ease-out,
    transform 0.1s ease,
    box-shadow 0.2s ease;
}

.timeline-scrubber.dragging {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 0 8px var(--accent);
  transition:
    transform 0.1s ease,
    box-shadow 0.2s ease;
  /* Disable left transition while dragging */
}

/* Disable transitions during seeking for responsive feel */
.timeline.seeking .timeline-progress,
.timeline.seeking .timeline-scrubber {
  transition: none !important;
}

.timeline-clips {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  /* Allow markers to extend outside */
  transition: transform 0.15s ease-out;
}

/* Timeline Mini-map */
.timeline-minimap {
  position: relative;
  height: 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  margin-bottom: 6px;
  cursor: pointer;
  overflow: hidden;
}

.timeline-minimap.hidden {
  display: none;
}

.zoom-indicator {
  position: absolute;
  top: -20px;
  right: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--accent);
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  pointer-events: none;
  border: 1px solid var(--border-accent);
}

.clip-markers {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 15;
}

.mark-in-marker {
  position: absolute;
  top: -8px;
  height: calc(100% + 16px);
  width: 3px;
  background-color: #4caf50;
  z-index: 15;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
}

.mark-in-marker .marker-label {
  position: absolute;
  top: -18px;
  left: -10px;
  font-size: 10px;
  font-weight: bold;
  color: #4caf50;
  background: rgba(0, 0, 0, 0.85);
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #4caf50;
  pointer-events: none;
  white-space: nowrap;
}

.mark-out-marker {
  position: absolute;
  top: -8px;
  height: calc(100% + 16px);
  width: 3px;
  background-color: #f44336;
  z-index: 15;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
}

.mark-out-marker .marker-label {
  position: absolute;
  top: -18px;
  left: -14px;
  font-size: 10px;
  font-weight: bold;
  color: #f44336;
  background: rgba(0, 0, 0, 0.85);
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #f44336;
  pointer-events: none;
  white-space: nowrap;
}

.clip-marker {
  position: absolute;
  top: -6px;
  height: calc(100% + 12px);
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
  pointer-events: auto;
}

.sentry-trigger-marker {
  position: absolute;
  top: -10px;
  height: calc(100% + 20px);
  width: 4px;
  background: var(--danger);
  z-index: 10;
  cursor: pointer;
  box-shadow:
    0 0 12px var(--danger-glow),
    0 0 20px var(--danger-glow);
  pointer-events: auto;
}

.sentry-trigger-marker::before {
  content: '!';
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 18px;
  background: var(--danger);
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px var(--danger-glow);
}

.sentry-trigger-marker::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid var(--danger);
}
</style>
