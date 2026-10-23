/**
 * WeatherService - Historical weather data for TeslaCamViewer
 * Uses Open-Meteo Archive API (free, no API key required)
 * Caches results in IndexedDB for offline access
 */

import dayjs from 'dayjs';
import { openDB, type IDBPDatabase } from 'idb';
import { settingsStore } from '../composables/useSettings';
import type { WeatherDBSchema } from '../types';

class WeatherService {
  private DB_NAME = 'TeslaCamViewer';
  private STORE_NAME = 'weatherCache' as const;
  private DB_VERSION = 2; // Increment if schema changes
  private db: IDBPDatabase<WeatherDBSchema> | null = null;
  // In-memory cache for current session
  private memoryCache = new Map();

  constructor() {
    this._initDB();
  }

  /**
   * Initialize IndexedDB
   */
  async _initDB(): Promise<IDBPDatabase<WeatherDBSchema> | null> {
    try {
      this.db = await openDB<WeatherDBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('weatherCache')) {
            db.createObjectStore('weatherCache', { keyPath: 'key' });
            console.log('[WeatherService] Created weatherCache store');
          }
        },
      });
      console.log('[WeatherService] IndexedDB ready');
      return this.db;
    } catch (_e) {
      console.warn(
        '[WeatherService] IndexedDB not available, using memory cache only'
      );
      return null;
    }
  }

  /**
   * Get weather for a location and time
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Date|string} timestamp - Event timestamp
   * @returns {Object|null} Weather data or null if unavailable
   */
  async getWeather(lat: number, lng: number, timestamp: Date) {
    // Validate inputs
    if (!lat || !lng || !timestamp) {
      return null;
    }

    // Round coordinates to 0.01° (~1km) for cache key
    const latRounded = Math.round(lat * 100) / 100;
    const lngRounded = Math.round(lng * 100) / 100;

    // Parse timestamp
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn('[WeatherService] Invalid timestamp:', timestamp);
      return null;
    }

    const dateStr = dayjs(date).format('YYYY-MM-DD'); // YYYY-MM-DD
    const hour = date.getHours();

    // Create cache key
    const cacheKey = `${latRounded},${lngRounded},${dateStr}`;

    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      return this._extractHourlyData(cached, hour);
    }

    // Check IndexedDB cache
    const dbCached = await this._getFromDB(cacheKey);
    if (dbCached) {
      this.memoryCache.set(cacheKey, dbCached);
      return this._extractHourlyData(dbCached, hour);
    }

    // Fetch from API
    try {
      const data = await this._fetchWeather(latRounded, lngRounded, dateStr);
      if (data) {
        // Cache the result
        this.memoryCache.set(cacheKey, data);
        await this._saveToDB(cacheKey, data);
        return this._extractHourlyData(data, hour);
      }
    } catch (error) {
      console.warn('[WeatherService] Failed to fetch weather:', error.message);
    }

    return null;
  }

  /**
   * Fetch weather from Open-Meteo Archive API
   */
  async _fetchWeather(lat: number, lng: number, dateStr: string) {
    // Check if date is too recent (archive may not have it yet)
    const requestDate = new Date(dateStr);
    const today = new Date();
    const daysDiff = Math.floor(
      (today.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let apiUrl;
    if (daysDiff < 5) {
      // Use forecast API for recent dates
      apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&start_date=${dateStr}&end_date=${dateStr}&timezone=auto`;
    } else {
      // Use archive API for older dates
      apiUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&start_date=${dateStr}&end_date=${dateStr}&timezone=auto`;
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.hourly) {
      throw new Error('No hourly data in response');
    }

    return data;
  }

  /**
   * Extract weather data for a specific hour
   */
  _extractHourlyData(data, hour) {
    const hourly = data.hourly;

    if (!hourly || !hourly.time || hour >= hourly.time.length) {
      return null;
    }

    const weatherCode = hourly.weather_code?.[hour];
    const { icon, description } = this._mapWeatherCode(weatherCode);

    // Get temperature and convert if needed
    const tempC = hourly.temperature_2m?.[hour];
    const { temp, unit } = this._formatTemperature(tempC);

    return {
      temperature: temp,
      temperatureUnit: unit,
      temperatureC: tempC,
      humidity: hourly.relative_humidity_2m?.[hour],
      precipitation: hourly.precipitation?.[hour],
      windSpeed: this._formatWindSpeed(hourly.wind_speed_10m?.[hour]),
      windSpeedRaw: hourly.wind_speed_10m?.[hour],
      weatherCode,
      icon,
      description,
      time: hourly.time?.[hour],
    };
  }

  /**
   * Map WMO weather code to icon and description
   * https://open-meteo.com/en/docs#weathervariables
   */
  _mapWeatherCode(code: number) {
    const mapping = {
      0: { icon: '☀️', description: 'Clear' },
      1: { icon: '🌤️', description: 'Mostly Clear' },
      2: { icon: '⛅', description: 'Partly Cloudy' },
      3: { icon: '☁️', description: 'Overcast' },
      45: { icon: '🌫️', description: 'Fog' },
      48: { icon: '🌫️', description: 'Freezing Fog' },
      51: { icon: '🌧️', description: 'Light Drizzle' },
      53: { icon: '🌧️', description: 'Drizzle' },
      55: { icon: '🌧️', description: 'Heavy Drizzle' },
      56: { icon: '🌧️', description: 'Freezing Drizzle' },
      57: { icon: '🌧️', description: 'Heavy Freezing Drizzle' },
      61: { icon: '🌧️', description: 'Light Rain' },
      63: { icon: '🌧️', description: 'Rain' },
      65: { icon: '🌧️', description: 'Heavy Rain' },
      66: { icon: '🌧️', description: 'Freezing Rain' },
      67: { icon: '🌧️', description: 'Heavy Freezing Rain' },
      71: { icon: '🌨️', description: 'Light Snow' },
      73: { icon: '🌨️', description: 'Snow' },
      75: { icon: '❄️', description: 'Heavy Snow' },
      77: { icon: '🌨️', description: 'Snow Grains' },
      80: { icon: '🌧️', description: 'Light Showers' },
      81: { icon: '🌧️', description: 'Showers' },
      82: { icon: '🌧️', description: 'Heavy Showers' },
      85: { icon: '🌨️', description: 'Light Snow Showers' },
      86: { icon: '🌨️', description: 'Snow Showers' },
      95: { icon: '⛈️', description: 'Thunderstorm' },
      96: { icon: '⛈️', description: 'Thunderstorm with Hail' },
      99: { icon: '⛈️', description: 'Severe Thunderstorm' },
    };

    return mapping[code] || { icon: '❓', description: 'Unknown' };
  }

  /**
   * Format temperature based on user settings
   */
  _formatTemperature(tempC) {
    if (tempC === null || tempC === undefined) {
      return { temp: null, unit: '' };
    }

    // Check user preference from settings
    const settings = settingsStore;
    const preference = settings?.get('temperatureUnits');

    let useFahrenheit;
    if (preference) {
      useFahrenheit = preference === 'fahrenheit';
    } else {
      // Fallback to locale if setting not yet available
      const locale = navigator.language || 'en-US';
      useFahrenheit =
        locale.includes('US') || locale.includes('LR') || locale.includes('MM');
    }

    if (useFahrenheit) {
      const tempF = Math.round((tempC * 9) / 5 + 32);
      return { temp: tempF, unit: '°F' };
    } else {
      return { temp: Math.round(tempC), unit: '°C' };
    }
  }

  /**
   * Format wind speed based on user settings
   */
  _formatWindSpeed(speedKmh) {
    if (speedKmh === null || speedKmh === undefined) {
      return null;
    }

    // Use telemetry units setting if available
    const settings = settingsStore;
    const units = settings?.get('telemetryOverlayUnits');

    let useMph;
    if (units) {
      useMph = units === 'mph';
    } else {
      // Fallback to locale
      const locale = navigator.language || 'en-US';
      useMph = locale.includes('US') || locale.includes('GB');
    }

    if (useMph) {
      return `${Math.round(speedKmh * 0.621371)} mph`;
    } else {
      return `${Math.round(speedKmh)} km/h`;
    }
  }

  /**
   * Get from IndexedDB
   */
  async _getFromDB(key: string) {
    if (!this.db) return null;
    try {
      const record = await this.db.get(this.STORE_NAME, key);
      return record?.data || null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * Save to IndexedDB
   */
  async _saveToDB(key: string, data: unknown) {
    if (!this.db) return false;
    try {
      await this.db.put(this.STORE_NAME, { key, data, cachedAt: Date.now() });
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Format weather for display in event panel
   * @param {Object} weather - Weather data from getWeather()
   * @returns {string} Formatted string like "☁️ 45°F Cloudy · 85% humidity · 12 mph wind"
   */
  formatForDisplay(weather) {
    if (!weather) {
      return null;
    }

    const parts = [];

    // Icon + temp + description
    if (weather.temperature !== null) {
      parts.push(
        `${weather.icon} ${weather.temperature}${weather.temperatureUnit} ${weather.description}`
      );
    } else {
      parts.push(`${weather.icon} ${weather.description}`);
    }

    // Humidity
    if (weather.humidity !== null && weather.humidity !== undefined) {
      parts.push(`${weather.humidity}% humidity`);
    }

    // Wind
    if (weather.windSpeed) {
      parts.push(`${weather.windSpeed} wind`);
    }

    return parts.join(' · ');
  }

  /**
   * Format weather for mini-map badge (compact)
   * @param {Object} weather - Weather data from getWeather()
   * @returns {string} Formatted string like "☁️ 45°F"
   */
  formatForBadge(weather) {
    if (!weather) {
      return null;
    }

    if (weather.temperature !== null) {
      return `${weather.icon} ${weather.temperature}${weather.temperatureUnit}`;
    }

    return weather.icon;
  }
}

// Export singleton instance
const weatherService = new WeatherService();

export { WeatherService, weatherService };
export default weatherService;
