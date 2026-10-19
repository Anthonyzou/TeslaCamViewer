<template>
  <div class="map-view-wrapper">
    <div ref="mapContainer" class="map-container" id="map"></div>
  </div>
</template>

<script setup lang="ts">
import 'leaflet';
import 'leaflet.markercluster';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useMapView } from '../composables/useMapView';
import { MapView } from '../services/mapView';
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
    const app = window.app;
    if (app?.onEventSelected) {
      app.onEventSelected(event);
    }
  });

  mapViewInstance.initialize();

  setMapView(mapViewInstance);
  const app = window.app;
  if (app) {
    app.mapView = mapViewInstance;
  }

  const eventsToLoad = props.events || app?.filteredEvents || app?.allEvents;
  if (eventsToLoad && eventsToLoad.length > 0) {
    mapViewInstance.loadEvents(eventsToLoad);
  }

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

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible && mapViewInstance) {
      invalidateMapSize();
      setTimeout(invalidateMapSize, 100);
      setTimeout(() => {
        mapViewInstance?.fitBounds();
      }, 250);
    }
  }
);

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (mapViewInstance) {
    setMapView(null);
    if (typeof mapViewInstance.destroy === 'function') {
      mapViewInstance.destroy();
    }
    mapViewInstance = null;
  }
});

defineExpose({
  invalidateSize: invalidateMapSize,
  getMapView: () => mapViewInstance,
});
</script>
