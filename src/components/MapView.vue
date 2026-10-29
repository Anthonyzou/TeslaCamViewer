<template>
  <div class="map-view-wrapper">
    <div ref="mapContainer" class="map-container" id="map"></div>
  </div>
</template>

<script setup lang="ts">
import 'leaflet.markercluster';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { MapView } from '../composables/mapEngine';
import { eventsStore } from '../composables/useEvents';
import { useMapView } from '../composables/useMapView';
import type { TeslaCamEvent } from '../types';

const props = defineProps<{
  events?: TeslaCamEvent[];
  visible?: boolean;
}>();

const emit = defineEmits<{
  (e: 'selectEvent', event: TeslaCamEvent): void;
}>();

const { setMapView } = useMapView();
const mapContainer = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let mapViewInstance: MapView | null = null;

function invalidateMapSize(): void {
  if (mapViewInstance) {
    mapViewInstance.invalidateSize();
  }
}

onMounted(() => {
  if (!mapContainer.value) return;

  mapViewInstance = new MapView(mapContainer.value, (event: TeslaCamEvent) => {
    emit('selectEvent', event);
    eventsStore.selectEvent(event);
  });

  mapViewInstance.initialize();

  setMapView(mapViewInstance);

  const eventsToLoad =
    props.events || eventsStore.filteredEvents || eventsStore.allEvents;
  if (eventsToLoad && eventsToLoad.length > 0) {
    mapViewInstance.loadEvents(eventsToLoad);
  }

  mapViewInstance?.fitBounds();
  // Use ResizeObserver for automatic sizing
  if (typeof ResizeObserver !== 'undefined' && mapContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      invalidateMapSize();
    });
    resizeObserver.observe(mapContainer.value);
  }
});

watch(
  () => props.events,
  (newEvents) => {
    if (mapViewInstance && newEvents) {
      mapViewInstance.loadEvents(newEvents);
    }
  },
  { deep: false }
);

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (mapViewInstance) {
    setMapView(null);
    mapViewInstance.destroy?.();
    mapViewInstance = null;
  }
});

defineExpose({
  invalidateSize: invalidateMapSize,
  getMapView: () => mapViewInstance,
});
</script>

<style scoped>
@reference "tailwindcss";

/* ==================== MAP ==================== */
#mapTab,
.map-view-wrapper {
  @apply relative flex h-full w-full flex-1 min-h-0 flex-col;
}

#map {
  @apply h-full w-full min-h-0 flex-1 bg-(--bg-tertiary);
}

.custom-marker-icon {
  @apply border-none bg-transparent;
}

.leaflet-popup-content-wrapper {
  @apply rounded-[10px] bg-white;
  box-shadow: var(--shadow-md);
}

.leaflet-popup-tip {
  @apply bg-white;
}
</style>
