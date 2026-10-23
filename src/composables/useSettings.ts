import { useLocalStorage } from '@vueuse/core';
import { watch, type Ref } from 'vue';
import { settingsModalStore } from './useModals';

export interface AppSettings {
  defaultSpeed: string;
  defaultLayout: string;
  autoPlayNextEvent: boolean;
  loopByDefault: boolean;
  preloadNextClip: boolean;
  theme: string;
  showKeyboardHints: boolean;
  showTimestampOverlay: boolean;
  showWhatsNew: boolean;
  temperatureUnits: string;
  enableTimelineZoom: boolean;
  showClipMarkers: boolean;
  highContrastMode: boolean;
  textSize: string;
  lockOrientationDuringPlayback: boolean;
  rememberLastFolder: boolean;
  lastFolderHandle: any;
  exportFormat: string;
  exportResolution: string;
  exportResolutionCustomHeight: number;
  fastExportExperimental: boolean;
  privacyModeExport: boolean;
  showBrandingInExport: boolean;
  [key: string]: any;
}

const defaultSettings: AppSettings = {
  defaultSpeed: '1',
  defaultLayout: 'layout-6-3',
  autoPlayNextEvent: false,
  loopByDefault: false,
  preloadNextClip: true,
  theme: 'dark',
  showKeyboardHints: true,
  showTimestampOverlay: true,
  showWhatsNew: true,
  temperatureUnits:
    typeof navigator !== 'undefined' &&
    (navigator.language || 'en-US').includes('US')
      ? 'fahrenheit'
      : 'celsius',
  enableTimelineZoom: false,
  showClipMarkers: true,
  highContrastMode: false,
  textSize: 'medium',
  lockOrientationDuringPlayback: false,
  rememberLastFolder: true,
  lastFolderHandle: null,
  exportFormat: 'mp4',
  exportResolution: 'full',
  exportResolutionCustomHeight: 1920,
  fastExportExperimental: true,
  privacyModeExport: false,
  showBrandingInExport: true,
};

const settings: Ref<AppSettings> = useLocalStorage<AppSettings>(
  'teslacamviewer_settings',
  defaultSettings
);

function applyAccessibilityAndTheme(): void {
  if (typeof document === 'undefined') return;
  const body = document.body;
  if (!body) return;

  // High contrast mode
  if (settings.value.highContrastMode) {
    body.classList.add('high-contrast');
  } else {
    body.classList.remove('high-contrast');
  }

  // Text size
  body.classList.remove('text-small', 'text-medium', 'text-large');
  const textSize = settings.value.textSize || 'medium';
  body.classList.add(`text-${textSize}`);

  // Theme
  body.classList.remove(
    'theme-dark',
    'theme-light',
    'theme-midnight',
    'theme-tesla-red'
  );
  const theme = settings.value.theme || 'dark';
  if (theme !== 'dark') {
    body.classList.add(`theme-${theme}`);
  }
}

// Automatically watch and apply styles on changes
watch(
  () => [
    settings.value.highContrastMode,
    settings.value.textSize,
    settings.value.theme,
  ],
  () => {
    applyAccessibilityAndTheme();
  },
  { immediate: true }
);

export const settingsStore = {
  get settings(): AppSettings {
    return settings.value;
  },

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return settings.value[key] ?? defaultSettings[key];
  },

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    settings.value[key] = value;
  },

  saveSettings(): void {
    // Automatically saved by useLocalStorage
  },

  resetToDefaults(): void {
    settings.value = { ...defaultSettings };
  },

  showSettingsModal(tab = 'general'): void {
    settingsModalStore.open(tab);
  },

  hideSettingsModal(): void {
    settingsModalStore.close();
  },

  onChange(_callback: (s: AppSettings) => void): () => void {
    return () => {};
  },
};

/**
 * useSettings - Composable for user preferences, accessibility styling, and persistence
 */
export function useSettings() {
  return {
    settings,
    get: settingsStore.get,
    set: settingsStore.set,
    resetToDefaults: settingsStore.resetToDefaults,
    showSettingsModal: settingsStore.showSettingsModal,
    hideSettingsModal: settingsStore.hideSettingsModal,
  };
}

export default useSettings;
