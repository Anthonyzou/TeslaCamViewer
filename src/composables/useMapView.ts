import { shallowRef, type ShallowRef } from 'vue';
import type { MapView } from '../services/mapView';
import { TeslaCamEvent } from '../types';

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
  fitBounds(): void {
    mapViewInstance.value?.fitBounds?.();
  },
  loadEvents(events: TeslaCamEvent[]): void {
    mapViewInstance.value?.loadEvents?.(events);
  },
};

export function useMapView() {
  return {
    mapView: mapViewInstance,
    setMapView: mapViewStore.setInstance,
    invalidateSize: mapViewStore.invalidateSize,
    fitBounds: mapViewStore.fitBounds,
    loadEvents: mapViewStore.loadEvents,
  };
}
