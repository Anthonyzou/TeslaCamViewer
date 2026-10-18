import { computed, getCurrentInstance, onMounted, ref, type Ref } from 'vue';
import type { TeslaCamEvent } from '../types';

const currentEvent: Ref<TeslaCamEvent | null> = ref(null);
const allEvents: Ref<TeslaCamEvent[]> = ref([]);
const filteredEvents: Ref<TeslaCamEvent[]> = ref([]);

export function setEventsState(state: {
  current?: TeslaCamEvent | null;
  all?: TeslaCamEvent[];
  filtered?: TeslaCamEvent[];
}): void {
  if (state.current !== undefined) currentEvent.value = state.current;
  if (state.all !== undefined) allEvents.value = state.all;
  if (state.filtered !== undefined) filteredEvents.value = state.filtered;
}

export function syncEvents(): void {
  if (typeof window === 'undefined') return;
  const app = window.app;
  if (!app) return;

  if (currentEvent.value !== (app.currentEvent || null)) {
    currentEvent.value = app.currentEvent || null;
  }

  if (Array.isArray(app.allEvents) && allEvents.value !== app.allEvents) {
    allEvents.value = [...app.allEvents];
  }

  if (
    Array.isArray(app.filteredEvents) &&
    filteredEvents.value !== app.filteredEvents
  ) {
    filteredEvents.value = [...app.filteredEvents];
  }
}

/**
 * useEvents - Composable for TeslaCam events list, current selection, and navigation
 */
export function useEvents() {
  const hasEvent = computed(() => currentEvent.value !== null);

  const eventCountText = computed(() => {
    if (filteredEvents.value.length === 0) return '';
    return `(${filteredEvents.value.length})`;
  });

  const eventStatsText = computed(() => {
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

  syncEvents();

  if (getCurrentInstance()) {
    onMounted(() => {
      syncEvents();
    });
  }

  async function selectEvent(event: TeslaCamEvent): Promise<void> {
    const app = typeof window !== 'undefined' ? window.app : undefined;
    if (app) {
      await app.onEventSelected(event);
      syncEvents();
    }
  }

  function prevEvent(): void {
    if (typeof window !== 'undefined') {
      window.app?.previousEvent();
    }
    syncEvents();
  }

  function nextEvent(): void {
    if (typeof window !== 'undefined') {
      window.app?.nextEvent();
    }
    syncEvents();
  }

  function applyFilters(): void {
    if (typeof window !== 'undefined') {
      window.app?.applyFilters();
    }
    syncEvents();
  }

  return {
    currentEvent,
    allEvents,
    filteredEvents,
    hasEvent,
    eventCountText,
    eventStatsText,
    selectEvent,
    prevEvent,
    nextEvent,
    applyFilters,
    syncEvents,
  };
}
