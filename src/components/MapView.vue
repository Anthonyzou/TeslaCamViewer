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

/* Leaflet Zoom Controls - Base styles */
.leaflet-control-zoom {
  border: none !important;
  border-radius: 6px !important;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
}

.leaflet-control-zoom a,
.leaflet-control-zoom a:hover {
  background: #ffffff !important;
  color: #333333 !important;
  border: none !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
  width: 30px !important;
  height: 30px !important;
  line-height: 30px !important;
  font-size: 18px !important;
  font-weight: normal !important;
}

.leaflet-control-zoom a:last-child {
  border-bottom: none !important;
}

.leaflet-control-zoom a:hover {
  background: #f0f0f0 !important;
  color: #0066cc !important;
}

/* Leaflet Attribution - Light Mode (default) */
.leaflet-control-attribution {
  background: rgba(255, 255, 255, 0.85) !important;
  color: #666666 !important;
  font-size: 10px !important;
}

.leaflet-control-attribution a {
  color: #333333 !important;
}

/* Map Control Buttons - Light Mode Base (default) */
.heatmap-control,
.struggle-zones-control,
.incident-control,
.scan-all-control {
  background: #ffffff !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.heatmap-toggle-btn,
.struggle-zones-toggle-btn,
.incident-toggle-btn,
.scan-all-btn {
  color: #666666 !important;
}

.heatmap-toggle-btn:hover,
.struggle-zones-toggle-btn:hover,
.incident-toggle-btn:hover,
.scan-all-btn:hover {
  background: #f0f0f0 !important;
  color: #0066cc !important;
}

/* Override Leaflet default focus/active states for custom controls */
.leaflet-bar a.heatmap-toggle-btn,
.leaflet-bar a.struggle-zones-toggle-btn,
.leaflet-bar a.incident-toggle-btn,
.leaflet-bar a.scan-all-btn {
  background: transparent !important;
}

.leaflet-bar a.heatmap-toggle-btn:focus,
.leaflet-bar a.struggle-zones-toggle-btn:focus,
.leaflet-bar a.incident-toggle-btn:focus,
.leaflet-bar a.scan-all-btn:focus {
  background: var(--bg-tertiary, #3a3a3a) !important;
  outline: none;
}

.leaflet-bar a.heatmap-toggle-btn.active,
.leaflet-bar a.heatmap-toggle-btn.active:focus,
.leaflet-bar a.heatmap-toggle-btn.active:hover {
  background: var(--accent, #4a9eff) !important;
  color: white !important;
}

.leaflet-bar a.struggle-zones-toggle-btn.active,
.leaflet-bar a.struggle-zones-toggle-btn.active:focus,
.leaflet-bar a.struggle-zones-toggle-btn.active:hover {
  background: #ff9800 !important;
  color: white !important;
}

.leaflet-bar a.incident-toggle-btn.active,
.leaflet-bar a.incident-toggle-btn.active:focus,
.leaflet-bar a.incident-toggle-btn.active:hover {
  background: #f44336 !important;
  color: white !important;
}
</style>
