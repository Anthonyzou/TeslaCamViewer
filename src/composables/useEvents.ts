import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { TeslaCamEvent } from '../types';

/**
 * useEvents - Composable for TeslaCam events list, current selection, and navigation
 */
export function useEvents() {
  const currentEvent = ref<TeslaCamEvent | null>(null);
  const allEvents = ref<TeslaCamEvent[]>([]);
  const filteredEvents = ref<TeslaCamEvent[]>([]);
  const eventCountText = ref('');
  const eventStatsText = ref('');

  const hasEvent = computed(() => currentEvent.value !== null);

  function syncEvents(): void {
    const app = (window as any).app;
    if (!app) return;

    if (currentEvent.value !== (app.currentEvent || null)) {
      currentEvent.value = app.currentEvent || null;
    }

    if (Array.isArray(app.allEvents) && allEvents.value.length !== app.allEvents.length) {
      allEvents.value = app.allEvents;
    }

    if (Array.isArray(app.filteredEvents) && filteredEvents.value.length !== app.filteredEvents.length) {
      filteredEvents.value = app.filteredEvents;
    }

    const countEl = document.getElementById('eventCount');
    if (countEl && eventCountText.value !== (countEl.textContent || '')) {
      eventCountText.value = countEl.textContent || '';
    }

    const statsEl = document.getElementById('eventStats');
    if (statsEl && eventStatsText.value !== (statsEl.textContent || '')) {
      eventStatsText.value = statsEl.textContent || '';
    }
  }

  let syncTimer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    syncEvents();
    syncTimer = setInterval(syncEvents, 250);
  });

  onUnmounted(() => {
    if (syncTimer) clearInterval(syncTimer);
  });

  async function selectEvent(event: TeslaCamEvent): Promise<void> {
    const app = (window as any).app;
    if (app) {
      await app.onEventSelected(event);
      syncEvents();
    }
  }

  function prevEvent(): void {
    (window as any).app?.previousEvent();
    syncEvents();
  }

  function nextEvent(): void {
    (window as any).app?.nextEvent();
    syncEvents();
  }

  function applyFilters(): void {
    (window as any).app?.applyFilters();
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
