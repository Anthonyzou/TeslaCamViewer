import { settingsModalStore } from '../composables/useModals';

/**
 * Settings Manager - Handles user preferences and settings UI
 * Stores settings in localStorage for persistence across sessions
 */
class SettingsManager {
  public STORAGE_KEY: string = 'teslacamviewer_settings';
  public settings: typeof this.defaults = null;
  public modal: any = null;
  public callbacks: Array<(settings: Record<string, any>) => void> = [];

  // Default settings
  private defaults = {
    // Playback
    defaultSpeed: '1',
    defaultLayout: 'layout-6-3',
    autoPlayNextEvent: false,
    loopByDefault: false,

    // Performance
    preloadNextClip: true,

    // UI
    theme: 'dark',
    showKeyboardHints: true,
    showTimestampOverlay: true,
    showWhatsNew: true,

    // Weather (Open-Meteo)
    temperatureUnits: (navigator.language || 'en-US').includes('US')
      ? 'fahrenheit'
      : 'celsius', // 'celsius', 'fahrenheit'

    // Timeline
    enableTimelineZoom: false,
    showClipMarkers: true,

    // Accessibility
    highContrastMode: false,
    textSize: 'medium', // small, medium, large

    // Mobile
    lockOrientationDuringPlayback: false, // Lock to landscape during video playback

    // Remember state
    rememberLastFolder: true,
    lastFolderHandle: null,

    // Export
    exportFormat: 'mp4', // 'webm' or 'mp4' — mp4 default since 2026.20.6.1 (WebCodecs fast path)

    // Export resolution — applied as a uniform scale on the layout's
    // native canvas size. "Full" preserves native (no downscale),
    // "hd" caps at 1080p height, "web" caps at 720p. "Custom" lets
    // the user specify any height (upscale allowed).
    exportResolution: 'full', // 'full' | 'hd' | 'web' | 'custom'
    exportResolutionCustomHeight: 1920, // used only when exportResolution === 'custom'

    // Fast Export — WebCodecs VideoDecoder + VideoEncoder path.
    // Now default on (was experimental). Set to false to force the
    // legacy HTML5-seek + MediaRecorder path. Kept as an emergency
    // rollback; the UI toggle that exposed this was removed.
    fastExportExperimental: true,

    // Privacy Mode Export - strips identifying metadata from exports
    privacyModeExport: false, // When enabled, removes timestamp, GPS, location, and mini-map from exports

    // Branding in exports - only applies to licensed users
    showBrandingInExport: true, // Show TeslaCamViewer.com branding by default
  };

  constructor() {
    this.loadSettings();
  }
  /**
   * Get translation helper
   */
  t(key) {
    return window.i18n ? window.i18n.t(key) : key.split('.').pop();
  }

  /**
   * Load settings from localStorage
   */
  loadSettings(): typeof this.defaults {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored == '{}' || !stored) {
        this.settings = { ...this.defaults };
        this.saveSettings();
      } else {
        this.settings = { ...this.defaults, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return { ...this.defaults };
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
      this.notifyCallbacks();
      // Apply accessibility settings immediately when changed
      this.applyAccessibilitySettings();
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  /**
   * Get a setting value
   */
  get(key) {
    return this.settings[key] ?? this.defaults[key];
  }

  /**
   * Set a setting value
   */
  set(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }

  /**
   * Register callback for setting changes
   */
  onChange(callback) {
    this.callbacks.push(callback);
  }

  /**
   * Notify all callbacks of settings change
   */
  notifyCallbacks() {
    this.callbacks.forEach((cb) => cb(this.settings));
  }

  /**
   * Reset all settings to defaults
   */
  resetToDefaults() {
    this.settings = { ...this.defaults };
    this.saveSettings();
  }

  /**
   * Create and show the settings modal
   */
  showSettingsModal(tab = 'general') {
    settingsModalStore.open(tab);
  }

  /**
   * Hide the settings modal
   */
  hideSettingsModal() {
    settingsModalStore.close();
  }

  /**
   * Apply settings to the application
   */
  applySettings(app: any) {
    // Apply default speed
    const speedSelect = document.getElementById(
      'speedSelect'
    ) as HTMLSelectElement | null;
    if (speedSelect && !app.videoPlayer?.isPlaying) {
      speedSelect.value = this.get('defaultSpeed');
    }

    // Apply default layout
    if (app.layoutManager) {
      const savedLayout = this.get('defaultLayout');
      if (savedLayout) {
        app.layoutManager.setLayout(savedLayout);
        const layoutSelect = document.getElementById(
          'layoutSelect'
        ) as HTMLSelectElement | null;
        if (layoutSelect) layoutSelect.value = savedLayout;
      }
    }

    // Apply loop setting
    const loopCheckbox = document.getElementById(
      'loopCheckbox'
    ) as HTMLInputElement | null;
    if (loopCheckbox) {
      loopCheckbox.checked = this.get('loopByDefault');
    }

    // Apply accessibility settings
    this.applyAccessibilitySettings();
  }

  /**
   * Apply accessibility settings (high contrast, text size)
   */
  applyAccessibilitySettings() {
    const body = document.body;

    // High contrast mode
    if (this.get('highContrastMode')) {
      body?.classList?.add('high-contrast');
    } else {
      body?.classList?.remove('high-contrast');
    }

    // Text size
    body?.classList?.remove('text-small', 'text-medium', 'text-large');
    const textSize = this.get('textSize') || 'medium';
    body?.classList?.add(`text-${textSize}`);

    // Theme
    this.applyTheme();
  }

  /**
   * Apply theme setting
   */
  applyTheme() {
    const body = document.body;
    const theme = this.get('theme') || 'dark';

    // Remove all theme classes
    body?.classList?.remove(
      'theme-dark',
      'theme-light',
      'theme-midnight',
      'theme-tesla-red'
    );

    // Apply selected theme (dark is default, no class needed)
    if (theme !== 'dark') {
      body?.classList?.add(`theme-${theme}`);
    }

    // Sync map mode with theme: light theme = light map, all others = dark map
    const mapView = window.app?.mapView;
    if (mapView && mapView.map) {
      const mapShouldBeDark = theme !== 'light';
      if (mapView.isDarkMode !== mapShouldBeDark) {
        mapView.setTileLayer(mapShouldBeDark ? 'dark' : 'light');
      }
    }
  }
}

const settingsManager = new SettingsManager();
export { SettingsManager, settingsManager };
export default SettingsManager;
