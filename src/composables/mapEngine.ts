/**
 * MapView - Leaflet map integration for displaying event locations
 */

// Node.js test environment guard for Leaflet
if (typeof globalThis.window === 'undefined') {
  const doc = {
    documentElement: { style: {} },
    createElement: () => ({ style: {} }),
  };
  globalThis.window = {
    devicePixelRatio: 1,
    screen: {},
    requestAnimationFrame: (cb: any) => setTimeout(cb, 0),
    cancelAnimationFrame: (id: any) => clearTimeout(id),
    addEventListener: () => {},
    removeEventListener: () => {},
    document: doc,
    navigator: globalThis.navigator || { userAgent: 'node', onLine: true },
  } as any;
  globalThis.document = doc as any;
}

import L from 'leaflet';
import { shallowRef, type ShallowRef } from 'vue';
import { TeslaCamEvent } from '../types';
import { FolderParser } from './useFolderParser';

class MapView {
  private container: HTMLElement | null = null;
  private onEventSelect: ((event: TeslaCamEvent) => void) | null = null;
  public map: L.Map | null = null;
  private markerCluster: any = null;
  private events: TeslaCamEvent[] = [];
  private initialized = false;

  // Tile layer management
  private currentTileLayer: L.TileLayer | null = null;
  public readonly isDarkMode = false;
  private tileProvider = 'osm';

  // Tile provider configurations (OpenStreetMap default)
  private TILE_PROVIDERS: Record<string, any> = {
    osm: {
      name: 'OpenStreetMap',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: '',
    },
  };

  constructor(
    containerElement: HTMLElement,
    onEventSelect: (event: TeslaCamEvent) => void
  ) {
    this.container = containerElement;
    this.onEventSelect = onEventSelect;
  }

  /**
   * Get translation helper
   */
  t(key: string): string {
    return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
  }

  /**
   * Initialize Leaflet map
   */
  initialize(): void {
    if (this.initialized || !this.container) {
      return;
    }

    try {
      const defaultCenter: [number, number] = [28.4, -81.5];
      const defaultZoom = 20;

      this.map = L.map(this.container, { keyboard: false }).setView(
        defaultCenter,
        defaultZoom
      );

      this.setTileLayer();

      // Initialize marker cluster group
      this.markerCluster = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      });

      this.map.addLayer(this.markerCluster);

      this.initialized = true;
      console.log('[MapView] Map initialized successfully');
    } catch (error) {
      console.error('[MapView] Error initializing map:', error);
    }
  }

  /**
   * Load events onto the map
   */
  loadEvents(events: TeslaCamEvent[]): void {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.map || !this.markerCluster) {
      console.warn('[MapView] Map not initialized');
      return;
    }

    this.markerCluster.clearLayers();
    this.events = events || [];

    const markers: L.Marker[] = [];
    let validEventCount = 0;

    this.events.forEach((event) => {
      if (this.hasValidGPS(event)) {
        const marker = this.createMarker(event);
        if (marker) {
          markers.push(marker);
          validEventCount++;
        }
      }
    });

    if (markers.length > 0) {
      this.markerCluster.addLayers(markers);
      console.log(
        `[MapView] Loaded ${validEventCount} events with GPS coordinates`
      );
      this.fitBounds();
    } else {
      console.log('[MapView] No events with valid GPS coordinates');
    }
  }

  /**
   * Check if event has valid GPS coordinates
   */
  hasValidGPS(event: any): boolean {
    if (!event?.metadata) return false;

    const lat = parseFloat(event.metadata.est_lat);
    const lon = parseFloat(event.metadata.est_lon);

    return !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;
  }

  /**
   * Create a marker for an event
   */
  createMarker(event: any): L.Marker | null {
    try {
      const lat = parseFloat(event.metadata.est_lat);
      const lon = parseFloat(event.metadata.est_lon);

      const marker = L.marker([lat, lon], {
        icon: this.getIconForType(event.type),
        title: event.name,
      });

      const popupContent = this.createPopupContent(event);
      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (this.onEventSelect) {
          this.onEventSelect(event);
        }
      });

      marker.on('popupopen', (e: any) => {
        const popupEl = e.popup?.getElement?.();
        if (popupEl) {
          popupEl.style.cursor = 'pointer';
          popupEl.onclick = () => {
            if (this.onEventSelect) {
              this.onEventSelect(event);
            }
          };
        }
      });

      return marker;
    } catch (error) {
      console.error(
        '[MapView] Error creating marker for event:',
        event?.name,
        error
      );
      return null;
    }
  }

  /**
   * Get custom icon for event type
   */
  getIconForType(type: string): L.DivIcon {
    let color = '#2196f3'; // Default blue

    if (type === 'SavedClips') {
      color = '#2196f3'; // Blue
    } else if (type === 'SentryClips') {
      color = '#f44336'; // Red
    } else if (type === 'RecentClips') {
      color = '#757575'; // Gray
    }

    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path fill="${color}" stroke="#fff" stroke-width="2" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
        <circle cx="12.5" cy="12.5" r="5" fill="#fff"/>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker-icon',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [0, -41],
    });
  }

  /**
   * Create popup content for event
   */
  createPopupContent(event: any): string {
    const date = new Date(event.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const typeClass = (event.type || '').toLowerCase().replace('clips', '');

    let location = '';
    if (event.metadata) {
      const city = event.metadata.city || '';
      const street = event.metadata.street || '';
      if (city && street) {
        location = `${street}, ${city}`;
      } else if (city) {
        location = city;
      } else if (street) {
        location = street;
      }
    }

    const reason = event.metadata
      ? FolderParser.formatReason(event.metadata.reason)
      : '';

    let html = `
      <div class="map-popup">
        <div class="map-popup-header">
          <span class="event-type ${typeClass}">${typeClass}</span>
          <span class="map-popup-date">${dateStr}</span>
        </div>
        <div class="map-popup-time">${timeStr}</div>
    `;

    if (location) {
      html += `<div class="map-popup-location">${location}</div>`;
    }

    if (reason) {
      html += `<div class="map-popup-reason">${reason}</div>`;
    }

    const clipCount = event.clipGroups?.length || 0;
    html += `
        <div class="map-popup-clips">${clipCount} clips</div>
        <div class="map-popup-action">Click to view event</div>
      </div>
    `;

    return html;
  }

  /**
   * Fit map bounds to show all markers
   */
  fitBounds(): void {
    if (!this.map || !this.markerCluster) {
      return;
    }

    try {
      const size = this.map.getSize();
      if (size.x === 0 || size.y === 0) {
        return;
      }

      const bounds = this.markerCluster.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
        });
      }
    } catch (e) {
      console.warn('[MapView] fitBounds failed:', e);
    }
  }

  /**
   * Select an event and focus it on the map
   */
  selectEvent(event: TeslaCamEvent): void {
    if (!this.map || !event) return;
    if (event.metadata?.est_lat && event.metadata?.est_lon) {
      const lat = parseFloat(String(event.metadata.est_lat));
      const lon = parseFloat(String(event.metadata.est_lon));
      if (!isNaN(lat) && !isNaN(lon)) {
        this.map.setView([lat, lon], 16);
      }
    }
  }

  /**
   * Invalidate map size (call when container resizes)
   */
  invalidateSize(): void {
    if (this.map) {
      setTimeout(() => {
        this.map?.invalidateSize();
        this.fitBounds();
      }, 100);
    }
  }

  /**
   * Clear all markers from map
   */
  clear(): void {
    if (this.markerCluster) {
      this.markerCluster.clearLayers();
    }
    this.events = [];
  }

  /**
   * Set the tile layer (OpenStreetMap default)
   */
  setTileLayer(_mode?: 'light' | 'dark'): void {
    if (!this.map) return;

    const provider =
      this.TILE_PROVIDERS[this.tileProvider] || this.TILE_PROVIDERS.osm;

    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    const tileOptions = {
      attribution: provider.attribution,
      maxZoom: 19,
      subdomains: provider.subdomains,
    };

    this.currentTileLayer = L.tileLayer(provider.url, tileOptions);
    this.currentTileLayer.on('tileerror', (e: any) => {
      console.warn('[MapView] Tile load error:', e.tile?.src);
    });

    this.currentTileLayer.addTo(this.map);
    console.log(`[MapView] Tile layer set to: ${provider.name}`);
  }

  /**
   * Get current tile provider ID
   */
  getCurrentProvider(): string {
    return this.tileProvider;
  }

  /**
   * Destroy map instance
   */
  destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markerCluster = null;
      this.initialized = false;
    }
  }
}

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

export { MapView };
export default MapView;
