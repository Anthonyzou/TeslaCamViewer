import { shallowRef, type ShallowRef } from 'vue';
import type { MapView } from '../services/mapView';

const mapViewInstance: ShallowRef<MapView | null> = shallowRef(null);

export const mapViewStore = {
  get instance(): MapView | null {
    return mapViewInstance.value;
  },
  setInstance(inst: MapView | null): void {
    mapViewInstance.value = inst;
  },
  invalidateSize(): void {
    mapViewInstance.value?.invalidateSize?.();
  },
  loadEvents(events: unknown[]): void {
    (mapViewInstance.value as any)?.loadEvents?.(events);
  },
  selectEvent(event: unknown): void {
    (mapViewInstance.value as any)?.selectEvent?.(event);
  },
};

export function useMapView() {
  return {
    mapView: mapViewInstance,
    setMapView: mapViewStore.setInstance,
    invalidateSize: mapViewStore.invalidateSize,
    loadEvents: mapViewStore.loadEvents,
    selectEvent: mapViewStore.selectEvent,
  };
}
