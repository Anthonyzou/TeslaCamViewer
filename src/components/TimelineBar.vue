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
        <div id="timelineProgress" class="timeline-progress"></div>
        <div id="timelineScrubber" class="timeline-scrubber"></div>

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
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';
import { useClipMarking } from '../composables/useClipMarking';

defineProps<{
  hasEvent: boolean;
}>();

const emit = defineEmits<{
  (e: 'zoomIn'): void;
  (e: 'zoomOut'): void;
  (e: 'zoomReset'): void;
}>();

const timelineEl = ref<HTMLElement | null>(null);
const clipMarkers = ref<number[]>([]);
const sentryMarker = ref<number | null>(null);
const isDragging = ref(false);

const clipMarking = useClipMarking(
  () => (window as any).app?.videoPlayer,
  () => timelineEl.value
);

const { inPoint, outPoint } = clipMarking;

const totalDuration = ref<number>(0);
let currentTime = 0;

const timelineInterface = {
  get isDragging() {
    return isDragging.value;
  },
  updateTime(time: number) {
    if (isDragging.value) return;
    currentTime = time;
    const progressEl = document.getElementById('timelineProgress');
    const scrubberEl = document.getElementById('timelineScrubber');
    const pct =
      totalDuration.value > 0 ? (time / totalDuration.value) * 100 : 0;
    const clampedPct = Math.min(100, Math.max(0, pct));
    if (progressEl) progressEl.style.width = `${clampedPct}%`;
    if (scrubberEl) scrubberEl.style.left = `${clampedPct}%`;
  },
  setDuration(dur: number) {
    totalDuration.value = dur;
  },
  setClipMarkers(clipGroups: any[]) {
    const markers: number[] = [];
    if (clipGroups && clipGroups.length > 0 && totalDuration.value > 0) {
      let accum = 0;
      const cached =
        (window as any).app?.videoPlayer?.cachedClipDurations || [];
      for (let i = 0; i < clipGroups.length; i++) {
        const dur = cached[i] || 60;
        if (i > 0) {
          markers.push((accum / totalDuration.value) * 100);
        }
        accum += dur;
      }
    }
    clipMarkers.value = markers;
  },
  setSentryTriggerMarker(triggerTime: number) {
    if (triggerTime > 0 && totalDuration.value > 0) {
      sentryMarker.value = (triggerTime / totalDuration.value) * 100;
    } else {
      sentryMarker.value = null;
    }
  },
  resetThumbnailTooltip() {},
  setGapMarkers() {},
};

function handleSeek(clientX: number) {
  if (!timelineEl.value || totalDuration.value <= 0) return;
  const rect = timelineEl.value.getBoundingClientRect();
  const clickX = clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  const targetTime = pct * totalDuration.value;

  // Immediate visual feedback
  const progressEl = document.getElementById('timelineProgress');
  const scrubberEl = document.getElementById('timelineScrubber');
  if (progressEl) progressEl.style.width = `${pct * 100}%`;
  if (scrubberEl) scrubberEl.style.left = `${pct * 100}%`;

  const app = (window as any).app;
  if (app?.videoPlayer?.seekToEventTime) {
    app.videoPlayer.seekToEventTime(targetTime);
  }
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
  if (typeof window !== 'undefined') {
    (window as any)._vueClipMarking = clipMarking;
    (window as any)._vueTimeline = timelineInterface;
  }
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
  window.removeEventListener('mousemove', onTimelineMouseMove);
  window.removeEventListener('mouseup', onTimelineMouseUp);
  window.removeEventListener('touchmove', onTimelineTouchMove);
  window.removeEventListener('touchend', onTimelineTouchEnd);
});
</script>
