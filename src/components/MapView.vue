<template>
  <div class="map-view-wrapper">
    <div ref="mapContainer" class="map-container" id="map"></div>
  </div>
</template>

<script setup lang="ts">
import 'leaflet';
import 'leaflet.markercluster';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { eventsStore } from '../composables/useEvents';
import { MapView } from '../composables/mapEngine';
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
  const app = window.app;

  mapViewInstance = new MapView(mapContainer.value, (event: TeslaCamEvent) => {
    emit('selectEvent', event);
    eventsStore.selectEvent(event);
  });

  mapViewInstance.initialize();

  setMapView(mapViewInstance);

  const eventsToLoad = props.events || app?.filteredEvents || app?.allEvents;
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
/* ==================== MAP ==================== */
#mapTab,
.map-view-wrapper {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

#map {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  background: var(--bg-tertiary);
}

.map-popup {
  min-width: 200px;
  font-family: var(--font-ui);
}

.map-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.map-popup-date {
  font-size: 0.8rem;
  color: #666;
}

.map-popup-time {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.map-popup-location {
  font-size: 0.85rem;
  color: #444;
  margin-bottom: 0.25rem;
}

.map-popup-reason {
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
  margin-bottom: 0.25rem;
}

.map-popup-clips {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.map-popup-action {
  font-size: 0.8rem;
  color: #00b4d8;
  font-weight: 600;
  text-align: center;
  padding-top: 0.5rem;
  border-top: 1px solid #e0e0e0;
}

.custom-marker-icon {
  background: transparent;
  border: none;
}

.leaflet-popup-content-wrapper {
  background: #fff;
  border-radius: 10px;
  box-shadow: var(--shadow-md);
}

.leaflet-popup-tip {
  background: #fff;
}
</style>
