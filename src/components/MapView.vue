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

/* Scan All Events Control */
.scan-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--text-secondary, #aaa);
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 5px;
}

.scan-all-btn:hover {
  background: var(--bg-tertiary, #3a3a3a);
  color: var(--accent, #4a9eff);
}

.scan-all-btn.scanning {
  background: #2196f3 !important;
  color: white !important;
  animation: pulse-scan 1.5s ease-in-out infinite;
}

.scan-all-btn.scanning svg {
  animation: rotate-scan 2s linear infinite;
}

@keyframes pulse-scan {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.6;
  }
}

@keyframes rotate-scan {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Heatmap Toggle Control */
.heatmap-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--text-secondary, #aaa);
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 5px;
}

.heatmap-toggle-btn:hover {
  background: var(--bg-tertiary, #3a3a3a);
  color: var(--accent, #4a9eff);
}

.heatmap-toggle-btn.active {
  background: var(--accent);
  color: white;
}

.heatmap-toggle-btn.active:hover {
  background: var(--accent-hover);
}

.heatmap-toggle-btn svg {
  pointer-events: none;
}

.heatmap-toggle-btn.loading {
  opacity: 0.7;
  cursor: wait;
}

.heatmap-toggle-btn.loading svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Struggle Zones Toggle Control */
.struggle-zones-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: #ff9800;
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 5px;
}

.struggle-zones-toggle-btn:hover {
  background: rgba(255, 152, 0, 0.15);
  color: #ffb74d;
}

.struggle-zones-toggle-btn.active {
  background: #ff9800;
  color: white;
}

.struggle-zones-toggle-btn.active:hover {
  background: #f57c00;
}

.struggle-zones-toggle-btn svg {
  pointer-events: none;
}

.struggle-zones-toggle-btn.loading {
  opacity: 0.7;
  cursor: wait;
}

.struggle-zones-toggle-btn.loading svg {
  animation: spin 1s linear infinite;
}

/* Struggle Zone Icons */
.struggle-zone-icon {
  background: transparent;
  border: none;
}

.struggle-zone-cluster-icon {
  background: transparent;
  border: none;
}

.struggle-zone-cluster {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #ff9800, #f44336);
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Struggle Zone Popup */
.struggle-zone-popup {
  min-width: 280px;
  max-width: 350px;
  font-family: var(--font-ui);
}

.struggle-zone-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.struggle-zone-title {
  font-size: 14px;
  font-weight: 600;
  color: #f44336;
}

.struggle-zone-count {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.struggle-zone-breakdown {
  margin-bottom: 12px;
}

.struggle-zone-breakdown .breakdown-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.struggle-zone-breakdown label {
  font-size: 11px;
  color: #666;
  min-width: 80px;
}

.struggle-zone-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.struggle-zone-type.saved {
  background: #e3f2fd;
  color: #1565c0;
}

.struggle-zone-type.sentry {
  background: #ffebee;
  color: #c62828;
}

.struggle-zone-type.recent {
  background: #f5f5f5;
  color: #616161;
}

.struggle-zone-state {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  background: #e8f5e9;
  color: #2e7d32;
}

.struggle-zone-events-header {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  margin-bottom: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.struggle-zone-events {
  max-height: 150px;
  overflow-y: auto;
}

.struggle-zone-event {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 11px;
}

.struggle-zone-event:last-child {
  border-bottom: none;
}

.struggle-zone-event .event-date {
  color: #666;
  flex: 1;
}

.struggle-zone-event .event-from-state {
  background: #fff3e0;
  color: #e65100;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 600;
  margin: 0 6px;
}

.struggle-zone-event .event-speed {
  color: #333;
  font-weight: 500;
  min-width: 50px;
  text-align: right;
}

.struggle-zone-more {
  font-size: 10px;
  color: #999;
  font-style: italic;
  padding-top: 4px;
}

.struggle-zone-tip {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.struggle-zone-tip small {
  font-size: 10px;
  color: #888;
  font-style: italic;
}

/* Clickable struggle zone events */
.struggle-zone-event.clickable {
  cursor: pointer;
  transition: background-color 0.15s ease;
  padding: 6px 4px;
  margin: 0 -4px;
  border-radius: 4px;
}

.struggle-zone-event.clickable:hover {
  background: #fff3e0;
}

.struggle-zone-event .event-view-icon {
  color: #999;
  opacity: 0;
  transition: opacity 0.15s ease;
  margin-left: 4px;
}

.struggle-zone-event.clickable:hover .event-view-icon {
  opacity: 1;
  color: #ff9800;
}

/* Direction indicator in popup header */
.struggle-zone-direction {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
  margin-left: auto;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 12px;
}

.struggle-zone-direction svg {
  color: #ff9800;
}

/* ==================== PHANTOM BRAKE HOTSPOTS ==================== */

/* Phantom Brake Toggle Control */
.incident-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: #f44336;
  transition: all 0.2s ease;
  border-radius: 5px;
}

.incident-toggle-btn:hover {
  background: rgba(244, 67, 54, 0.15);
  color: #ef5350;
}

.incident-toggle-btn.active {
  background: #f44336;
  color: white;
}

.incident-toggle-btn.active:hover {
  background: #d32f2f;
}

.incident-toggle-btn svg {
  pointer-events: none;
}

.incident-toggle-btn.loading {
  opacity: 0.7;
  cursor: wait;
}

.incident-toggle-btn.loading svg {
  animation: spin 1s linear infinite;
}

/* Phantom Brake Icons */
.incident-icon {
  background: transparent;
  border: none;
}

.incident-cluster-icon {
  background: transparent;
  border: none;
}

.incident-cluster {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #f44336, #b71c1c);
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 6px rgba(183, 28, 28, 0.4);
}

/* Phantom Brake Popup */
.incident-popup {
  min-width: 280px;
  max-width: 350px;
  font-family: var(--font-ui);
}

.incident-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ffcdd2;
}

.incident-title {
  font-size: 14px;
  font-weight: 600;
  color: #b71c1c;
}

.incident-count {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.incident-breakdown {
  margin-bottom: 12px;
}

.incident-breakdown .breakdown-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.incident-breakdown label {
  font-size: 11px;
  color: #666;
}

.incident-severity {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.incident-severity.critical {
  background: #ffebee;
  color: #b71c1c;
}

.incident-severity.warning {
  background: #fff3e0;
  color: #e65100;
}

.incident-severity.info {
  background: #fff8e1;
  color: #ff8f00;
}

.incident-ap-mode {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  background: #e3f2fd;
  color: #1565c0;
}

.incident-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.incident-type.braking {
  background: #ffebee;
  color: #c62828;
}

.incident-type.swerve {
  background: #e0f7fa;
  color: #00838f;
}

.incident-type.combined {
  background: #fff3e0;
  color: #e65100;
}

/* Scoped to the incident-events list — the original unscoped .event-type
 * rule stomped the sidebar event pills, forcing their text to #666. */
.incident-events .event-type {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.05);
  color: #666;
}

.incident-events-header {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  margin-bottom: 6px;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.incident-events {
  max-height: 150px;
  overflow-y: auto;
}

.incident-event {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 11px;
  gap: 6px;
}

.incident-event:last-child {
  border-bottom: none;
}

.incident-event .event-date {
  color: #666;
  flex: 1;
  min-width: 100px;
}

.incident-event .event-offset {
  color: #4a9eff;
  font-weight: 500;
  margin-left: 4px;
}

.incident-event .event-severity {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
}

.incident-event .event-severity.critical {
  background: #ffcdd2;
  color: #b71c1c;
}

.incident-event .event-severity.warning {
  background: #ffe0b2;
  color: #e65100;
}

.incident-event .event-severity.info {
  background: #fff8e1;
  color: #ff8f00;
}

.incident-event .event-speed {
  color: #333;
  font-weight: 500;
  min-width: 45px;
  text-align: right;
}

.incident-event .event-gforce {
  color: #b71c1c;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.incident-more {
  font-size: 10px;
  color: #999;
  font-style: italic;
  padding-top: 4px;
}

.incident-tip {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #ffcdd2;
}

.incident-tip small {
  font-size: 10px;
  color: #888;
  font-style: italic;
}

/* Clickable phantom brake events */
.incident-event.clickable {
  cursor: pointer;
  transition: background-color 0.15s ease;
  padding: 6px 4px;
  margin: 0 -4px;
  border-radius: 4px;
}

.incident-event.clickable:hover {
  background: #ffebee;
}

.incident-event .event-view-icon {
  color: #999;
  opacity: 0;
  transition: opacity 0.15s ease;
  margin-left: 4px;
}

.incident-event.clickable:hover .event-view-icon {
  opacity: 1;
  color: #f44336;
}
</style>
