import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { videoPlayer } from './useVideoPlayer';

const currentTime: Ref<number> = ref(0);
const totalDuration: Ref<number> = ref(0);
const isDragging: Ref<boolean> = ref(false);
const clipMarkers: Ref<number[]> = ref([]);
const sentryMarker: Ref<number | null> = ref(null);
const gapMarkers: Ref<unknown[]> = ref([]);

const progressPercent: ComputedRef<number> = computed(() => {
  if (totalDuration.value <= 0) return 0;
  const pct = (currentTime.value / totalDuration.value) * 100;
  return Math.min(100, Math.max(0, pct));
});

export const timelineStore = {
  get isDragging(): boolean {
    return isDragging.value;
  },
  get duration(): number {
    return totalDuration.value;
  },
  get currentTime(): number {
    return currentTime.value;
  },
  updateTime(t: number): void {
    if (isDragging.value) return;
    currentTime.value = t;
  },
  setDuration(d: number): void {
    totalDuration.value = d;
  },
  setClipMarkers(clipGroups: unknown[], cachedDurations?: number[]): void {
    const markers: number[] = [];
    if (clipGroups && clipGroups.length > 0 && totalDuration.value > 0) {
      let accum = 0;
      const cached = cachedDurations || videoPlayer.cachedClipDurations || [];
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
  resetThumbnailTooltip(): void {
    // Tooltip reset placeholder
  },
  setGapMarkers(gaps?: unknown[], _clipGroups?: unknown[]): void {
    void _clipGroups;
    gapMarkers.value = gaps || [];
  },
  setSentryTriggerMarker(triggerTime: number): void {
    if (triggerTime > 0 && totalDuration.value > 0) {
      sentryMarker.value = (triggerTime / totalDuration.value) * 100;
    } else {
      sentryMarker.value = null;
    }
  },
  reset(): void {
    currentTime.value = 0;
    totalDuration.value = 0;
    isDragging.value = false;
    clipMarkers.value = [];
    sentryMarker.value = null;
    gapMarkers.value = [];
  },
};

export function useTimeline() {
  function seekToTime(targetTime: number): void {
    const clamped = Math.max(0, Math.min(totalDuration.value, targetTime));
    currentTime.value = clamped;
    void videoPlayer.seekToEventTime(clamped);
  }

  function seekToPercent(pct: number): void {
    if (totalDuration.value <= 0) return;
    const clampedPct = Math.max(0, Math.min(1, pct));
    const targetTime = clampedPct * totalDuration.value;
    currentTime.value = targetTime;
    void videoPlayer.seekToEventTime(targetTime);
  }

  return {
    currentTime,
    totalDuration,
    isDragging,
    clipMarkers,
    sentryMarker,
    gapMarkers,
    progressPercent,

    updateTime: timelineStore.updateTime,
    setDuration: timelineStore.setDuration,
    setClipMarkers: timelineStore.setClipMarkers,
    setSentryTriggerMarker: timelineStore.setSentryTriggerMarker,
    resetThumbnailTooltip: timelineStore.resetThumbnailTooltip,
    setGapMarkers: timelineStore.setGapMarkers,
    resetTimeline: timelineStore.reset,

    seekToTime,
    seekToPercent,
  };
}
