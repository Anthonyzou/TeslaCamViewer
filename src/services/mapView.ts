/**
 * MapView - Leaflet map integration for displaying event locations
 */

import L from 'leaflet';
import { FolderParser } from './folderParser';

class MapView {
  private container: HTMLElement | null = null;
  private onEventSelect: ((event: any) => void) | null = null;
  public map: L.Map | null = null;
  private markerCluster: any = null;
  private events: any[] = [];
  private initialized = false;

  // Tile layer management
  private currentTileLayer: L.TileLayer | null = null;
  public isDarkMode = false;
  private _darkModeButton: HTMLElement | null = null;
  private darkModeControl: any = null;
  private tileProvider = 'osm';

  // Tile provider configurations
  private TILE_PROVIDERS: Record<string, any> = {
    osm: {
      name: 'OpenStreetMap',
      light: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: '',
      },
      dark: {
        // OSM doesn't have dark mode, use Stadia dark
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        attribution:
          '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: '',
      },
    },
  };

  private DARK_MODE_KEY = 'teslacam_map_dark_mode';

  constructor(
    containerElement: HTMLElement,
    onEventSelect: (event: any) => void
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

      this.isDarkMode =
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem(this.DARK_MODE_KEY)
          : null) === 'true';
      this.setTileLayer(this.isDarkMode ? 'dark' : 'light');

      // Initialize marker cluster group
      this.markerCluster = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
      });

      this.map.addLayer(this.markerCluster);

      // Add dark mode toggle control
      this.addDarkModeControl();

      this.initialized = true;
      console.log('[MapView] Map initialized successfully');
    } catch (error) {
      console.error('[MapView] Error initializing map:', error);
    }
  }

  /**
   * Load events onto the map
   */
  loadEvents(events: any[]): void {
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
   * Set the tile layer (light or dark mode)
   */
  setTileLayer(mode: 'light' | 'dark'): void {
    if (!this.map) return;

    const provider =
      this.TILE_PROVIDERS[this.tileProvider] || this.TILE_PROVIDERS.osm;
    const layerConfig = provider[mode];

    if (!layerConfig) {
      console.warn(`[MapView] Unknown tile layer mode: ${mode}`);
      return;
    }

    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    const tileOptions = {
      attribution: layerConfig.attribution,
      maxZoom: 19,
      tileOptions: layerConfig.subdomains,
    };

    this.currentTileLayer = L.tileLayer(layerConfig.url, tileOptions);
    this.currentTileLayer.on('tileerror', (e: any) => {
      console.warn('[MapView] Tile load error:', e.tile?.src);
    });

    this.currentTileLayer.addTo(this.map);
    this.isDarkMode = mode === 'dark';

    if (this.container) {
      this.container.classList.toggle('map-dark-mode', this.isDarkMode);
    }

    console.log(`[MapView] Tile layer set to: ${provider.name} (${mode})`);
  }

  /**
   * Set the tile provider
   */
  setTileProvider(providerId: string): void {
    if (!this.TILE_PROVIDERS[providerId]) {
      console.warn(`[MapView] Unknown tile provider: ${providerId}`);
      return;
    }

    this.tileProvider = providerId;

    try {
      localStorage.setItem('teslacam_map_provider', providerId);
    } catch (e) {
      console.warn('[MapView] Failed to save provider preference:', e);
    }

    const mode = this.isDarkMode ? 'dark' : 'light';
    this.setTileLayer(mode);

    console.log(
      `[MapView] Tile provider changed to: ${this.TILE_PROVIDERS[providerId].name}`
    );
  }

  /**
   * Toggle between light and dark map tiles
   */
  toggleDarkMode(): void {
    const newMode = this.isDarkMode ? 'light' : 'dark';
    this.setTileLayer(newMode);

    try {
      localStorage.setItem(this.DARK_MODE_KEY, this.isDarkMode.toString());
    } catch (e) {
      console.warn('[MapView] Failed to save dark mode preference:', e);
    }

    if (this._darkModeButton) {
      this._darkModeButton.classList.toggle('active', this.isDarkMode);
    }
  }

  /**
   * Add dark mode toggle control to the map
   */
  addDarkModeControl(): void {
    if (!this.map) return;

    const DarkModeControl = L.Control.extend({
      options: { position: 'topright' },

      onAdd: () => {
        const container = L.DomUtil.create(
          'div',
          'leaflet-bar leaflet-control dark-mode-control'
        );
        const button = L.DomUtil.create('a', 'dark-mode-toggle-btn', container);
        button.href = '#';
        button.title = this.t('map.toggleDarkMode') || 'Toggle Dark Mode Map';
        button.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
          </svg>
        `;

        this._darkModeButton = button;

        if (this.isDarkMode) {
          button.classList.add('active');
        }

        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          this.toggleDarkMode();
        });

        return container;
      },
    });

    this.darkModeControl = new DarkModeControl();
    this.map.addControl(this.darkModeControl);
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

export { MapView };
export default MapView;
