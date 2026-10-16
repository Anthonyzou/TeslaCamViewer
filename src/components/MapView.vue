<template>
  <div class="map-view-wrapper">
    <div ref="mapContainer" class="map-container" id="map"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { MapView } from '../services/mapView';
import type { TeslaCamEvent } from '../types';

// Ensure L and MapView are globally available for plugins and existing helper modules
if (typeof window !== 'undefined') {
  (window as any).L = L;
  (window as any).MapView = MapView;
}

const props = defineProps<{
  events?: TeslaCamEvent[];
  visible?: boolean;
}>();

const emit = defineEmits<{
  (e: 'selectEvent', event: TeslaCamEvent): void;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let mapViewInstance: any = null;

function invalidateMapSize(): void {
  if (mapViewInstance?.map) {
    mapViewInstance.map.invalidateSize();
  }
}

onMounted(() => {
  if (!mapContainer.value) return;

  mapViewInstance = new MapView(
    mapContainer.value,
    (event: TeslaCamEvent) => {
      emit('selectEvent', event);
      const app = (window as any).app;
      if (app?.onEventSelected) {
        app.onEventSelected(event);
      }
    }
  );

  mapViewInstance.initialize();

  (window as any)._vueMapView = mapViewInstance;
  const app = (window as any).app;
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
    if (isVisible) {
      invalidateMapSize();
      setTimeout(invalidateMapSize, 50);
      setTimeout(invalidateMapSize, 200);
    }
  }
);

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (mapViewInstance) {
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
