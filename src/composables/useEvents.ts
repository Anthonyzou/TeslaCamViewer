import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { folderManager } from '../services/folderManager';
import { folderParser } from '../services/folderParser';
import { videoPlayer } from '../services/videoPlayer';
import type { TeslaCamEvent } from '../types';
import { EventFilter } from '../utils/eventFilter';
import { filterPanelStore } from './useFilterPanel';
import { layoutStore } from './useLayout';
import { mapViewStore } from './useMapView';
import { settingsStore } from './useSettings';
import { timelineStore } from './useTimeline';

const currentEvent: Ref<TeslaCamEvent | null> = ref(null);
const allEvents: Ref<TeslaCamEvent[]> = ref([]);
const filteredEvents: Ref<TeslaCamEvent[]> = ref([]);
const eventFilter = new EventFilter();

async function probeClipDuration(url: string): Promise<number> {
  if (typeof document === 'undefined') return 60;
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const timeout = setTimeout(() => {
      video.src = '';
      resolve(60);
    }, 3000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const d = video.duration;
      video.src = '';
      resolve(d && isFinite(d) ? d : 60);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      video.src = '';
      resolve(60);
    };

    video.src = url;
  });
}

export async function prepareEventURLs(event: TeslaCamEvent): Promise<void> {
  const cameras = [
    'front',
    'back',
    'left_repeater',
    'right_repeater',
    'left_pillar',
    'right_pillar',
  ];

  let timeoutCount = 0;
  const MAX_TIMEOUTS = 3;

  if (!Array.isArray(event.clipGroups)) return;

  for (const group of event.clipGroups) {
    let durationLoaded = false;

    for (const camera of cameras) {
      const clip = group.clips[camera];
      if (!clip) continue;

      if (!clip.url && clip.fileHandle) {
        try {
          const file = await clip.fileHandle.getFile();
          if (file.size >= 1024) {
            clip.url = URL.createObjectURL(file);
            if (!event._blobURLs) event._blobURLs = [];
            event._blobURLs.push(clip.url);

            if (
              camera === 'front' &&
              !clip.duration &&
              timeoutCount < MAX_TIMEOUTS
            ) {
              const start = performance.now();
              clip.duration = await probeClipDuration(clip.url);
              const elapsed = performance.now() - start;
              if (elapsed > 2500) timeoutCount++;
              durationLoaded = true;
            }
          }
        } catch (e) {
          console.error(`Failed to prepare ${camera}:`, e);
        }
      }
    }

    const frontClip = group.clips.front;
    if (!durationLoaded && frontClip && !frontClip.duration) {
      frontClip.duration = 60;
    }
  }
}

export function setEventsState(state: {
  current?: TeslaCamEvent | null;
  all?: TeslaCamEvent[];
  filtered?: TeslaCamEvent[];
}): void {
  if (state.current !== undefined) currentEvent.value = state.current;
  if (state.all !== undefined) allEvents.value = state.all;
  if (state.filtered !== undefined) filteredEvents.value = state.filtered;
}

export function syncEvents(): void {}

export const eventsStore = {
  get currentEvent(): TeslaCamEvent | null {
    return currentEvent.value;
  },
  get allEvents(): TeslaCamEvent[] {
    return allEvents.value;
  },
  get filteredEvents(): TeslaCamEvent[] {
    return filteredEvents.value;
  },
  get eventFilter(): EventFilter {
    return eventFilter;
  },

  setAllEvents(events: TeslaCamEvent[]): void {
    allEvents.value = [...events];
    eventsStore.applyFilters();
  },

  applyFilters(): void {
    let eventsToFilter = allEvents.value;
    const activeDriveId = folderManager?.activeDriveId;

    if (activeDriveId) {
      eventsToFilter = allEvents.value.filter(
        (e) => e.driveId === activeDriveId
      );
    }

    filteredEvents.value = eventFilter.applyFilters(eventsToFilter);
    mapViewStore.instance?.loadEvents?.(filteredEvents.value);
    filterPanelStore.updateFilterBadge?.();
  },

  async selectEvent(event: TeslaCamEvent): Promise<void> {
    if (currentEvent.value && currentEvent.value._blobURLs) {
      currentEvent.value._blobURLs.forEach((url: string) =>
        URL.revokeObjectURL(url)
      );
      currentEvent.value._blobURLs = [];
    }

    currentEvent.value = event;

    try {
      await prepareEventURLs(event);

      const hasPillars = JSON.stringify(event).includes('_pillar');
      layoutStore.setHasPillarCameras(hasPillars);

      const totalDuration = videoPlayer.calculateTotalDuration(event);
      timelineStore.setDuration(totalDuration);
      timelineStore.setClipMarkers(event.clipGroups);
      timelineStore.resetThumbnailTooltip();

      if (folderParser?.detectGaps) {
        const gaps = folderParser.detectGaps(event.clipGroups);
        if (gaps && gaps.length > 0) {
          timelineStore.setGapMarkers(gaps, event.clipGroups);
        }
      }

      const isSentryEvent =
        event.type === 'SentryClips' ||
        event.metadata?.reason?.toLowerCase().includes('sentry');

      let startTime = 0;
      if (isSentryEvent) {
        startTime = Math.max(0, totalDuration - 64);
        const triggerTime = Math.max(0, totalDuration - 60);
        timelineStore.setSentryTriggerMarker(triggerTime);
      } else {
        timelineStore.setSentryTriggerMarker(0);
      }

      await videoPlayer.loadEvent(event, startTime);
      mapViewStore.instance?.selectEvent?.(event);

      if (settingsStore.get('autoPlayNextEvent')) {
        await videoPlayer.play();
      }
    } catch (err) {
      console.error('[Events] Error loading event:', err);
    }
  },

  async previousEvent(): Promise<void> {
    if (!currentEvent.value || filteredEvents.value.length === 0) return;
    const idx = filteredEvents.value.findIndex(
      (e) => e.name === currentEvent.value?.name
    );
    if (idx > 0) {
      await eventsStore.selectEvent(filteredEvents.value[idx - 1]);
    }
  },

  async nextEvent(): Promise<void> {
    if (!currentEvent.value || filteredEvents.value.length === 0) return;
    const idx = filteredEvents.value.findIndex(
      (e) => e.name === currentEvent.value?.name
    );
    if (idx >= 0 && idx < filteredEvents.value.length - 1) {
      await eventsStore.selectEvent(filteredEvents.value[idx + 1]);
    }
  },

  async autoPlayNextEvent(): Promise<void> {
    await eventsStore.nextEvent();
    await videoPlayer.play();
  },

  syncEvents(): void {},
};

/**
 * useEvents - Composable for TeslaCam events list, current selection, and navigation
 */
export function useEvents() {
  const hasEvent: ComputedRef<boolean> = computed(
    () => currentEvent.value !== null
  );

  const eventCountText: ComputedRef<string> = computed(() => {
    if (filteredEvents.value.length === 0) return '';
    return `(${filteredEvents.value.length})`;
  });

  const eventStatsText: ComputedRef<string> = computed(() => {
    const events = filteredEvents.value;
    if (events.length === 0) return '';
    const saved = events.filter((e) => e.type === 'SavedClips').length;
    const sentry = events.filter((e) => e.type === 'SentryClips').length;
    const recent = events.filter((e) => e.type === 'RecentClips').length;
    const empty = events.filter((e) => e.isEmpty).length;

    let statsText = `${saved} saved, ${sentry} sentry, ${recent} recent`;
    if (empty > 0) {
      statsText += ` (${empty} empty)`;
    }
    return statsText;
  });

  return {
    currentEvent,
    allEvents,
    filteredEvents,
    hasEvent,
    eventCountText,
    eventStatsText,
    selectEvent: eventsStore.selectEvent,
    prevEvent: eventsStore.previousEvent,
    nextEvent: eventsStore.nextEvent,
    applyFilters: eventsStore.applyFilters,
    syncEvents: eventsStore.syncEvents,
  };
}

export default useEvents;
