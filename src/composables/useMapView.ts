import { shallowRef, type ShallowRef } from 'vue';
import type { TeslaCamEvent } from '../types';

export interface MapViewLike {
  invalidateSize?: () => void;
  fitBounds?: () => void;
  loadEvents?: (events: TeslaCamEvent[]) => void;
  selectEvent?: (event: TeslaCamEvent) => void;
  destroy?: () => void;
  [key: string]: any;
}

const mapViewInstance: ShallowRef<MapViewLike | null> = shallowRef(null);

export const mapViewStore = {
  get instance(): MapViewLike | null {
    return mapViewInstance.value;
  },
  setInstance(inst: MapViewLike | null): void {
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

export default useMapView;
