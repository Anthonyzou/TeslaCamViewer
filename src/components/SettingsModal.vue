<template>
  <div v-if="isOpen" class="settings-modal" @keydown.esc="close">
    <div class="settings-overlay" @mousedown="onOverlayMouseDown" @click="onOverlayClick"></div>
    <div class="settings-panel">
      <div class="settings-layout">
        <!-- Sidebar Navigation -->
        <div class="settings-sidebar">
          <div class="settings-sidebar-header">
            <h2>{{ t('settings.title') }}</h2>
          </div>
          <nav class="settings-nav">
            <button
              class="settings-nav-item"
              :class="{ active: activeTab === 'general' }"
              @click="activeTab = 'general'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span>{{ t('settings.tabs.general') }}</span>
            </button>
            <button
              class="settings-nav-item"
              :class="{ active: activeTab === 'playback' }"
              @click="activeTab = 'playback'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>{{ t('settings.tabs.playback') }}</span>
            </button>
            <button
              class="settings-nav-item"
              :class="{ active: activeTab === 'overlays' }"
              @click="activeTab = 'overlays'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2v-4h4v-2h-4V7h-2v4H8v2h4z" />
              </svg>
              <span>{{ t('settings.tabs.overlays') }}</span>
            </button>
            <button
              class="settings-nav-item"
              :class="{ active: activeTab === 'export' }"
              @click="activeTab = 'export'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z" />
              </svg>
              <span>{{ t('settings.tabs.export') }}</span>
            </button>
            <button
              class="settings-nav-item"
              :class="{ active: activeTab === 'advanced' }"
              @click="activeTab = 'advanced'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
              <span>{{ t('settings.tabs.advanced') }}</span>
            </button>
          </nav>
          <div class="settings-sidebar-footer">
            <button class="settings-reset-btn" @click="handleReset">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              </svg>
              {{ t('settings.resetToDefaults') }}
            </button>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="settings-main">
          <div class="settings-main-header">
            <h3 class="settings-section-title">{{ currentSectionTitle }}</h3>
            <button class="settings-close-btn" :title="t('common.close')" @click="close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          <div class="settings-content">
            <!-- GENERAL TAB -->
            <div v-show="activeTab === 'general'" class="settings-tab-content active">
              <div class="settings-section">
                <h3>{{ t('settings.sections.language') }}</h3>
                <div class="setting-row">
                  <label for="setting-language">{{ t('settings.language.selectLanguage') }}</label>
                  <select id="setting-language" class="setting-select" v-model="currentLocale" @change="onLanguageChange">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                    <option value="nl">Nederlands</option>
                    <option value="no">Norsk</option>
                  </select>
                </div>
              </div>

              <div class="settings-section">
                <h3>{{ t('settings.sections.ui') }}</h3>
                <div class="setting-row">
                  <label for="setting-theme">{{ t('settings.ui.theme') }}</label>
                  <select id="setting-theme" class="setting-select" v-model="settings.theme" @change="save('theme', settings.theme)">
                    <option value="dark">{{ t('settings.ui.themeDark') }}</option>
                    <option value="light">{{ t('settings.ui.themeLight') }}</option>
                    <option value="midnight">{{ t('settings.ui.themeMidnight') }}</option>
                    <option value="tesla-red">{{ t('settings.ui.themeTeslaRed') }}</option>
                  </select>
                </div>
                <div class="setting-row">
                  <label for="setting-showKeyboardHints">{{ t('settings.ui.showKeyboardHints') }}</label>
                  <input
                    type="checkbox"
                    id="setting-showKeyboardHints"
                    class="setting-checkbox"
                    v-model="settings.showKeyboardHints"
                    @change="save('showKeyboardHints', settings.showKeyboardHints)"
                  />
                </div>
                <div class="setting-row">
                  <label for="setting-showTimestampOverlay">{{ t('settings.ui.showTimestampOverlay') }}</label>
                  <input
                    type="checkbox"
                    id="setting-showTimestampOverlay"
                    class="setting-checkbox"
                    v-model="settings.showTimestampOverlay"
                    @change="save('showTimestampOverlay', settings.showTimestampOverlay)"
                  />
                </div>
                <div class="setting-row">
                  <label for="setting-showWhatsNew">{{ t('settings.ui.showWhatsNew') }}</label>
                  <input
                    type="checkbox"
                    id="setting-showWhatsNew"
                    class="setting-checkbox"
                    v-model="settings.showWhatsNew"
                    @change="save('showWhatsNew', settings.showWhatsNew)"
                  />
                  <span class="setting-hint">{{ t('settings.ui.whatsNewHint') }}</span>
                </div>
              </div>
            </div>

            <!-- PLAYBACK TAB -->
            <div v-show="activeTab === 'playback'" class="settings-tab-content active">
              <div class="settings-section">
                <h3>{{ t('settings.sections.playback') }}</h3>
                <div class="setting-row">
                  <label for="setting-defaultSpeed">{{ t('settings.playback.defaultSpeed') }}</label>
                  <select id="setting-defaultSpeed" class="setting-select" v-model="settings.defaultSpeed" @change="save('defaultSpeed', settings.defaultSpeed)">
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>
                <div class="setting-row">
                  <label for="setting-defaultLayout">{{ t('settings.playback.defaultLayout') }}</label>
                  <select id="setting-defaultLayout" class="setting-select" v-model="settings.defaultLayout" @change="save('defaultLayout', settings.defaultLayout)">
                    <option value="grid-2x2">{{ t('layouts.grid2x2') }}</option>
                    <option value="layout-6-3">{{ t('layouts.layout63') }}</option>
                    <option value="layout-4-3">{{ t('layouts.layout43') }}</option>
                    <option value="layout-all-16-9">{{ t('layouts.all169') }}</option>
                    <option value="layout-front-left">{{ t('layouts.frontLeft') }}</option>
                    <option value="layout-front-right">{{ t('layouts.frontRight') }}</option>
                    <option value="layout-front-repeaters">{{ t('layouts.frontRepeaters') }}</option>
                  </select>
                </div>
                <div class="setting-row">
                  <label for="setting-autoPlayNextEvent">{{ t('settings.playback.autoPlayNext') }}</label>
                  <input
                    type="checkbox"
                    id="setting-autoPlayNextEvent"
                    class="setting-checkbox"
                    v-model="settings.autoPlayNextEvent"
                    @change="save('autoPlayNextEvent', settings.autoPlayNextEvent)"
                  />
                </div>
                <div class="setting-row">
                  <label for="setting-loopByDefault">{{ t('settings.playback.loopByDefault') }}</label>
                  <input
                    type="checkbox"
                    id="setting-loopByDefault"
                    class="setting-checkbox"
                    v-model="settings.loopByDefault"
                    @change="save('loopByDefault', settings.loopByDefault)"
                  />
                </div>
              </div>

              <div class="settings-section">
                <h3>{{ t('settings.sections.timeline') }}</h3>
                <div class="setting-row">
                  <label for="setting-enableTimelineZoom">{{ t('settings.timeline.enableZoom') }}</label>
                  <input
                    type="checkbox"
                    id="setting-enableTimelineZoom"
                    class="setting-checkbox"
                    v-model="settings.enableTimelineZoom"
                    @change="save('enableTimelineZoom', settings.enableTimelineZoom)"
                  />
                  <span class="setting-hint">{{ t('settings.timeline.zoomHint') }}</span>
                </div>
                <div class="setting-row">
                  <label for="setting-showClipMarkers">{{ t('settings.timeline.showClipMarkers') }}</label>
                  <input
                    type="checkbox"
                    id="setting-showClipMarkers"
                    class="setting-checkbox"
                    v-model="settings.showClipMarkers"
                    @change="save('showClipMarkers', settings.showClipMarkers)"
                  />
                </div>
              </div>
            </div>

            <!-- OVERLAYS TAB -->
            <div v-show="activeTab === 'overlays'" class="settings-tab-content active">
              <div class="settings-section">
                <h3>Weather</h3>
                <div class="setting-row">
                  <label for="setting-temperatureUnits">{{ t('settings.weather.units') }}</label>
                  <select id="setting-temperatureUnits" class="setting-select" v-model="settings.temperatureUnits" @change="save('temperatureUnits', settings.temperatureUnits)">
                    <option value="celsius">{{ t('settings.weather.unitsCelsius') }}</option>
                    <option value="fahrenheit">{{ t('settings.weather.unitsFahrenheit') }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- EXPORT TAB -->
            <div v-show="activeTab === 'export'" class="settings-tab-content active">
              <div class="settings-section">
                <h3>{{ t('settings.sections.export') }}</h3>
                <div class="setting-row">
                  <label for="setting-exportFormat">{{ t('settings.export.videoFormat') }}</label>
                  <select id="setting-exportFormat" class="setting-select" v-model="settings.exportFormat" @change="save('exportFormat', settings.exportFormat)">
                    <option value="webm">{{ t('settings.export.webm') }}</option>
                    <option value="mp4">{{ t('settings.export.mp4') }}</option>
                    <option value="gif">GIF (Animated)</option>
                  </select>
                  <span class="setting-hint">{{ t('settings.export.formatHint') }}</span>
                </div>
                <div class="setting-row">
                  <label for="setting-exportResolution">Export quality</label>
                  <select id="setting-exportResolution" class="setting-select" v-model="settings.exportResolution" @change="save('exportResolution', settings.exportResolution)">
                    <option value="full">Full — native layout resolution</option>
                    <option value="hd">HD — 1080p height</option>
                    <option value="web">Web — 720p height</option>
                    <option value="custom">Custom — specify height</option>
                  </select>
                  <span class="setting-hint">Scales the export canvas. Full never downsamples; HD/Web cap but never upscale; Custom lets you pick (can upscale).</span>
                </div>
                <div v-show="settings.exportResolution === 'custom'" class="setting-row">
                  <label for="setting-exportResolutionCustomHeight">Custom height (px)</label>
                  <input
                    type="number"
                    id="setting-exportResolutionCustomHeight"
                    class="setting-input"
                    min="240"
                    max="4320"
                    step="10"
                    style="width: 120px;"
                    v-model.number="settings.exportResolutionCustomHeight"
                    @change="save('exportResolutionCustomHeight', settings.exportResolutionCustomHeight)"
                  />
                  <span class="setting-hint">Width is computed to preserve the layout's aspect ratio.</span>
                </div>
                <div class="setting-row">
                  <label for="setting-privacyModeExport">{{ t('settings.export.privacyMode') }}</label>
                  <input
                    type="checkbox"
                    id="setting-privacyModeExport"
                    class="setting-checkbox"
                    v-model="settings.privacyModeExport"
                    @change="save('privacyModeExport', settings.privacyModeExport)"
                  />
                  <span class="setting-hint">{{ t('settings.export.privacyModeHint') }}</span>
                </div>
              </div>
            </div>

            <!-- ADVANCED TAB -->
            <div v-show="activeTab === 'advanced'" class="settings-tab-content active">
              <div class="settings-section">
                <h3>{{ t('settings.sections.performance') }}</h3>
                <div class="setting-row">
                  <label for="setting-preloadNextClip">{{ t('settings.performance.preloadNextClip') }}</label>
                  <input
                    type="checkbox"
                    id="setting-preloadNextClip"
                    class="setting-checkbox"
                    v-model="settings.preloadNextClip"
                    @change="save('preloadNextClip', settings.preloadNextClip)"
                  />
                  <span class="setting-hint">{{ t('settings.performance.preloadHint') }}</span>
                </div>
                <div class="setting-row">
                  <label for="setting-memoryOptimization">{{ t('settings.performance.memoryOptimization') }}</label>
                  <input
                    type="checkbox"
                    id="setting-memoryOptimization"
                    class="setting-checkbox"
                    v-model="settings.memoryOptimization"
                    @change="save('memoryOptimization', settings.memoryOptimization)"
                  />
                  <span class="setting-hint">{{ t('settings.performance.memoryHint') }}</span>
                </div>
              </div>

              <div class="settings-section">
                <h3>{{ t('settings.sections.session') }}</h3>
                <div class="setting-row">
                  <label for="setting-rememberLastFolder">{{ t('settings.session.rememberLastFolder') }}</label>
                  <input
                    type="checkbox"
                    id="setting-rememberLastFolder"
                    class="setting-checkbox"
                    v-model="settings.rememberLastFolder"
                    @change="save('rememberLastFolder', settings.rememberLastFolder)"
                  />
                  <span class="setting-hint">{{ t('settings.session.folderHint') }}</span>
                </div>
              </div>

              <div class="settings-section">
                <h3>{{ t('settings.sections.accessibility') }}</h3>
                <div class="setting-row">
                  <label for="setting-highContrastMode">{{ t('settings.accessibility.highContrast') }}</label>
                  <input
                    type="checkbox"
                    id="setting-highContrastMode"
                    class="setting-checkbox"
                    v-model="settings.highContrastMode"
                    @change="save('highContrastMode', settings.highContrastMode)"
                  />
                  <span class="setting-hint">{{ t('settings.accessibility.highContrastHint') }}</span>
                </div>
                <div class="setting-row">
                  <label for="setting-textSize">{{ t('settings.accessibility.textSize') }}</label>
                  <select id="setting-textSize" class="setting-select" v-model="settings.textSize" @change="save('textSize', settings.textSize)">
                    <option value="small">{{ t('settings.accessibility.textSmall') }}</option>
                    <option value="medium">{{ t('settings.accessibility.textMedium') }}</option>
                    <option value="large">{{ t('settings.accessibility.textLarge') }}</option>
                  </select>
                </div>
              </div>

              <div class="settings-section">
                <h3>{{ t('settings.sections.mobile') }}</h3>
                <div class="setting-row">
                  <label for="setting-lockOrientationDuringPlayback">{{ t('settings.mobile.lockLandscape') }}</label>
                  <input
                    type="checkbox"
                    id="setting-lockOrientationDuringPlayback"
                    class="setting-checkbox"
                    v-model="settings.lockOrientationDuringPlayback"
                    @change="save('lockOrientationDuringPlayback', settings.lockOrientationDuringPlayback)"
                  />
                  <span class="setting-hint">{{ t('settings.mobile.lockHint') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import type { SettingsManagerLike } from '../types';

const props = defineProps<{
  settingsManager: SettingsManagerLike;
}>();

const isOpen = ref(false);
const activeTab = ref('general');
const localeTick = ref(0);
const currentLocale = ref(window.i18n ? window.i18n.getLocale() : 'en');
let mouseDownOnOverlay = false;

// Reactive state mirroring settingsManager.settings
const settings = reactive<Record<string, any>>({ ...props.settingsManager.settings });

function syncFromManager(): void {
  Object.assign(settings, props.settingsManager.settings);
  if (window.i18n) {
    currentLocale.value = window.i18n.getLocale();
  }
}

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

const currentSectionTitle = computed<string>(() => {
  return t(`settings.tabs.${activeTab.value}`);
});

function open(tab?: string): void {
  syncFromManager();
  if (tab) activeTab.value = tab;
  isOpen.value = true;
}

function close(): void {
  isOpen.value = false;
}

function onOverlayMouseDown(e: MouseEvent): void {
  mouseDownOnOverlay = (e.target as HTMLElement).classList.contains('settings-overlay');
}

function onOverlayClick(e: MouseEvent): void {
  if (mouseDownOnOverlay && (e.target as HTMLElement).classList.contains('settings-overlay')) {
    close();
  }
}

function save(key: string, val: any): void {
  props.settingsManager.set(key, val);
}

function onLanguageChange(e: Event): void {
  const newLocale = (e.target as HTMLSelectElement).value;
  if (window.i18n) {
    window.i18n.setLocale(newLocale);
  }
}

function handleReset(): void {
  if (confirm(t('settings.confirmReset'))) {
    props.settingsManager.resetToDefaults();
    syncFromManager();
  }
}

function onLocaleChanged(): void {
  localeTick.value++;
  if (window.i18n) {
    currentLocale.value = window.i18n.getLocale();
  }
}

onMounted(() => {
  window.addEventListener('localeChanged', onLocaleChanged);
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
});

defineExpose({
  open,
  close,
  syncFromManager,
  isOpen,
});
</script>
