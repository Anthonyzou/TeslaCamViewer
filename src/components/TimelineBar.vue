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
import { videoPlayer } from '../composables/useVideoPlayer';

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
  () => videoPlayer,
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
@reference "tailwindcss";

/* ==================== TIMELINE ==================== */
/* Timeline row wrapper - contains timeline, zoom controls */
.timeline-row {
  @apply flex items-center bg-(--bg-secondary);
}

.timeline-container {
  @apply flex-1 overflow-visible px-3 py-1;
}

.timeline {
  @apply relative h-9 cursor-pointer rounded-md border border-(--border) bg-(--bg-tertiary) select-none overflow-visible;
  /* Allow markers to extend outside */
}

/* Timeline gradient overlay */
.timeline::before {
  @apply pointer-events-none absolute inset-0 rounded-md;
  content: '';
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.03) 0%,
    transparent 50%
  );
}

.timeline-progress {
  @apply pointer-events-none absolute top-0 left-0 h-full w-0 rounded-l-md transition-[width] duration-150 ease-out;
  background: linear-gradient(
    90deg,
    var(--accent-subtle) 0%,
    var(--accent) 100%
  );
}

.timeline-scrubber {
  @apply pointer-events-none absolute top-1/2 left-0 z-10 size-3.5 cursor-grab rounded-full border-2 border-(--text-primary) bg-(--accent);
  transform: translate(-50%, -50%);
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
  @apply cursor-grabbing;
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
  @apply pointer-events-none absolute top-0 left-0 size-full overflow-visible transition-transform duration-150 ease-out;
  /* Allow markers to extend outside */
}

/* Timeline Mini-map */
.timeline-minimap {
  @apply relative mb-1.5 h-5 cursor-pointer overflow-hidden rounded border border-(--border) bg-(--bg-tertiary);
}

.timeline-minimap.hidden {
  display: none;
}

.zoom-indicator {
  @apply pointer-events-none absolute top-[-20px] right-0 rounded border border-(--border-accent) bg-(--bg-tertiary) px-2 py-0.5 font-(family-name:--font-mono) text-[0.7rem] font-semibold text-(--accent);
}

.clip-markers {
  @apply pointer-events-none absolute top-0 left-0 z-15 size-full;
}

.mark-in-marker {
  @apply pointer-events-none absolute top-[-8px] z-15 h-[calc(100%+16px)] w-[3px] bg-[#4caf50];
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
}

.mark-in-marker .marker-label {
  @apply pointer-events-none absolute top-[-18px] left-[-10px] rounded-[3px] border border-[#4caf50] bg-black/85 px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#4caf50];
}

.mark-out-marker {
  @apply pointer-events-none absolute top-[-8px] z-15 h-[calc(100%+16px)] w-[3px] bg-[#f44336];
  box-shadow: 0 0 8px rgba(244, 67, 54, 0.6);
}

.mark-out-marker .marker-label {
  @apply pointer-events-none absolute top-[-18px] left-[-14px] rounded-[3px] border border-[#f44336] bg-black/85 px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#f44336];
}

.clip-marker {
  @apply pointer-events-auto absolute top-[-6px] h-[calc(100%+12px)] w-px bg-white/20;
}

.sentry-trigger-marker {
  @apply pointer-events-auto absolute top-[-10px] z-10 h-[calc(100%+20px)] w-1 cursor-pointer bg-(--danger);
  box-shadow:
    0 0 12px var(--danger-glow),
    0 0 20px var(--danger-glow);
}

.sentry-trigger-marker::before {
  @apply absolute top-[-16px] left-1/2 flex size-[18px] items-center justify-center rounded-full bg-(--danger) text-[12px] font-bold text-white;
  content: '!';
  transform: translateX(-50%);
  box-shadow: 0 0 8px var(--danger-glow);
}

.sentry-trigger-marker::after {
  @apply absolute bottom-[-8px] left-1/2 size-0;
  content: '';
  transform: translateX(-50%);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid var(--danger);
}
</style>
