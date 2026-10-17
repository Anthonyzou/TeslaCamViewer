<template>
  <div v-if="isOpen" class="settings-modal" @keydown.esc="close">
    <div
      class="settings-overlay"
      @mousedown="onOverlayMouseDown"
      @click="onOverlayClick"
    ></div>
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
              <Sliders :size="18" />
              <span>{{ t('settings.tabs.general') }}</span>
            </button>
            <button
              class="settings-nav-item"
              :class="{ active: activeTab === 'playback' }"
              @click="activeTab = 'playback'"
            >
              <Play :size="18" />
              <span>{{ t('settings.tabs.playback') }}</span>
            </button>
            <button
              class="settings-nav-item"
              :class="{ active: activeTab === 'overlays' }"
              @click="activeTab = 'overlays'"
            >
              <Layers :size="18" />
              <span>{{ t('settings.tabs.overlays') }}</span>
            </button>
            <button
              class="settings-nav-item"
              :class="{ active: activeTab === 'advanced' }"
              @click="activeTab = 'advanced'"
            >
              <Cpu :size="18" />
              <span>{{ t('settings.tabs.advanced') }}</span>
            </button>
          </nav>
          <div class="settings-sidebar-footer">
            <button class="settings-reset-btn" @click="handleReset">
              <RotateCcw :size="16" />
              {{ t('settings.resetToDefaults') }}
            </button>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="settings-main">
          <div class="settings-main-header">
            <h3 class="settings-section-title">{{ currentSectionTitle }}</h3>
            <button
              class="settings-close-btn"
              :title="t('common.close')"
              @click="close"
            >
              <X :size="20" />
            </button>
          </div>

          <div class="settings-content">
            <!-- GENERAL TAB -->
            <div
              v-show="activeTab === 'general'"
              class="settings-tab-content active"
            >
              <div class="settings-section">
                <h3>{{ t('settings.sections.language') }}</h3>
                <div class="setting-row">
                  <label for="setting-language">{{
                    t('settings.language.selectLanguage')
                  }}</label>
                  <select
                    id="setting-language"
                    class="setting-select"
                    v-model="currentLocale"
                    @change="onLanguageChange"
                  >
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
                  <label for="setting-theme">{{
                    t('settings.ui.theme')
                  }}</label>
                  <select
                    id="setting-theme"
                    class="setting-select"
                    v-model="settings.theme"
                    @change="save('theme', settings.theme)"
                  >
                    <option value="dark">
                      {{ t('settings.ui.themeDark') }}
                    </option>
                    <option value="light">
                      {{ t('settings.ui.themeLight') }}
                    </option>
                    <option value="midnight">
                      {{ t('settings.ui.themeMidnight') }}
                    </option>
                    <option value="tesla-red">
                      {{ t('settings.ui.themeTeslaRed') }}
                    </option>
                  </select>
                </div>
                <div class="setting-row">
                  <label for="setting-showKeyboardHints">{{
                    t('settings.ui.showKeyboardHints')
                  }}</label>
                  <input
                    type="checkbox"
                    id="setting-showKeyboardHints"
                    class="setting-checkbox"
                    v-model="settings.showKeyboardHints"
                    @change="
                      save('showKeyboardHints', settings.showKeyboardHints)
                    "
                  />
                </div>
                <div class="setting-row">
                  <label for="setting-showTimestampOverlay">{{
                    t('settings.ui.showTimestampOverlay')
                  }}</label>
                  <input
                    type="checkbox"
                    id="setting-showTimestampOverlay"
                    class="setting-checkbox"
                    v-model="settings.showTimestampOverlay"
                    @change="
                      save(
                        'showTimestampOverlay',
                        settings.showTimestampOverlay
                      )
                    "
                  />
                </div>
                <div class="setting-row">
                  <label for="setting-showWhatsNew">{{
                    t('settings.ui.showWhatsNew')
                  }}</label>
                  <input
                    type="checkbox"
                    id="setting-showWhatsNew"
                    class="setting-checkbox"
                    v-model="settings.showWhatsNew"
                    @change="save('showWhatsNew', settings.showWhatsNew)"
                  />
                  <span class="setting-hint">{{
                    t('settings.ui.whatsNewHint')
                  }}</span>
                </div>
              </div>
            </div>

            <!-- PLAYBACK TAB -->
            <div
              v-show="activeTab === 'playback'"
              class="settings-tab-content active"
            >
              <div class="settings-section">
                <h3>{{ t('settings.sections.playback') }}</h3>
                <div class="setting-row">
                  <label for="setting-defaultSpeed">{{
                    t('settings.playback.defaultSpeed')
                  }}</label>
                  <select
                    id="setting-defaultSpeed"
                    class="setting-select"
                    v-model="settings.defaultSpeed"
                    @change="save('defaultSpeed', settings.defaultSpeed)"
                  >
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
                  <label for="setting-defaultLayout">{{
                    t('settings.playback.defaultLayout')
                  }}</label>
                  <select
                    id="setting-defaultLayout"
                    class="setting-select"
                    v-model="settings.defaultLayout"
                    @change="save('defaultLayout', settings.defaultLayout)"
                  >
                    <option value="grid-2x2">{{ t('layouts.grid2x2') }}</option>
                    <option value="layout-6-3">
                      {{ t('layouts.layout63') }}
                    </option>
                    <option value="layout-4-3">
                      {{ t('layouts.layout43') }}
                    </option>
                    <option value="layout-all-16-9">
                      {{ t('layouts.all169') }}
                    </option>
                    <option value="layout-front-left">
                      {{ t('layouts.frontLeft') }}
                    </option>
                    <option value="layout-front-right">
                      {{ t('layouts.frontRight') }}
                    </option>
                    <option value="layout-front-repeaters">
                      {{ t('layouts.frontRepeaters') }}
                    </option>
                  </select>
                </div>
                <div class="setting-row">
                  <label for="setting-autoPlayNextEvent">{{
                    t('settings.playback.autoPlayNext')
                  }}</label>
                  <input
                    type="checkbox"
                    id="setting-autoPlayNextEvent"
                    class="setting-checkbox"
                    v-model="settings.autoPlayNextEvent"
                    @change="
                      save('autoPlayNextEvent', settings.autoPlayNextEvent)
                    "
                  />
                </div>
                <div class="setting-row">
                  <label for="setting-loopByDefault">{{
                    t('settings.playback.loopByDefault')
                  }}</label>
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
                  <label for="setting-enableTimelineZoom">{{
                    t('settings.timeline.enableZoom')
                  }}</label>
                  <input
                    type="checkbox"
                    id="setting-enableTimelineZoom"
                    class="setting-checkbox"
                    v-model="settings.enableTimelineZoom"
                    @change="
                      save('enableTimelineZoom', settings.enableTimelineZoom)
                    "
                  />
                  <span class="setting-hint">{{
                    t('settings.timeline.zoomHint')
                  }}</span>
                </div>
                <div class="setting-row">
                  <label for="setting-showClipMarkers">{{
                    t('settings.timeline.showClipMarkers')
                  }}</label>
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
            <div
              v-show="activeTab === 'overlays'"
              class="settings-tab-content active"
            >
              <div class="settings-section">
                <h3>Weather</h3>
                <div class="setting-row">
                  <label for="setting-temperatureUnits">{{
                    t('settings.weather.units')
                  }}</label>
                  <select
                    id="setting-temperatureUnits"
                    class="setting-select"
                    v-model="settings.temperatureUnits"
                    @change="
                      save('temperatureUnits', settings.temperatureUnits)
                    "
                  >
                    <option value="celsius">
                      {{ t('settings.weather.unitsCelsius') }}
                    </option>
                    <option value="fahrenheit">
                      {{ t('settings.weather.unitsFahrenheit') }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- ADVANCED TAB -->
            <div
              v-show="activeTab === 'advanced'"
              class="settings-tab-content active"
            >
              <div class="settings-section">
                <h3>{{ t('settings.sections.performance') }}</h3>
                <div class="setting-row">
                  <label for="setting-preloadNextClip">{{
                    t('settings.performance.preloadNextClip')
                  }}</label>
                  <input
                    type="checkbox"
                    id="setting-preloadNextClip"
                    class="setting-checkbox"
                    v-model="settings.preloadNextClip"
                    @change="save('preloadNextClip', settings.preloadNextClip)"
                  />
                  <span class="setting-hint">{{
                    t('settings.performance.preloadHint')
                  }}</span>
                </div>
              </div>

              <div class="settings-section">
                <h3>{{ t('settings.sections.session') }}</h3>
                <div class="setting-row">
                  <label for="setting-rememberLastFolder">{{
                    t('settings.session.rememberLastFolder')
                  }}</label>
                  <input
                    type="checkbox"
                    id="setting-rememberLastFolder"
                    class="setting-checkbox"
                    v-model="settings.rememberLastFolder"
                    @change="
                      save('rememberLastFolder', settings.rememberLastFolder)
                    "
                  />
                  <span class="setting-hint">{{
                    t('settings.session.folderHint')
                  }}</span>
                </div>
              </div>

              <div class="settings-section">
                <h3>{{ t('settings.sections.accessibility') }}</h3>
                <div class="setting-row">
                  <label for="setting-highContrastMode">{{
                    t('settings.accessibility.highContrast')
                  }}</label>
                  <input
                    type="checkbox"
                    id="setting-highContrastMode"
                    class="setting-checkbox"
                    v-model="settings.highContrastMode"
                    @change="
                      save('highContrastMode', settings.highContrastMode)
                    "
                  />
                  <span class="setting-hint">{{
                    t('settings.accessibility.highContrastHint')
                  }}</span>
                </div>
                <div class="setting-row">
                  <label for="setting-textSize">{{
                    t('settings.accessibility.textSize')
                  }}</label>
                  <select
                    id="setting-textSize"
                    class="setting-select"
                    v-model="settings.textSize"
                    @change="save('textSize', settings.textSize)"
                  >
                    <option value="small">
                      {{ t('settings.accessibility.textSmall') }}
                    </option>
                    <option value="medium">
                      {{ t('settings.accessibility.textMedium') }}
                    </option>
                    <option value="large">
                      {{ t('settings.accessibility.textLarge') }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="settings-section">
                <h3>{{ t('settings.sections.mobile') }}</h3>
                <div class="setting-row">
                  <label for="setting-lockOrientationDuringPlayback">{{
                    t('settings.mobile.lockLandscape')
                  }}</label>
                  <input
                    type="checkbox"
                    id="setting-lockOrientationDuringPlayback"
                    class="setting-checkbox"
                    v-model="settings.lockOrientationDuringPlayback"
                    @change="
                      save(
                        'lockOrientationDuringPlayback',
                        settings.lockOrientationDuringPlayback
                      )
                    "
                  />
                  <span class="setting-hint">{{
                    t('settings.mobile.lockHint')
                  }}</span>
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
import { Cpu, Layers, Play, RotateCcw, Sliders, X } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { settingsManager } from '../services/settingsManager';

const isOpen = ref(false);
const activeTab = ref('general');
const localeTick = ref(0);
const currentLocale = ref(window.i18n ? window.i18n.getLocale() : 'en');
let mouseDownOnOverlay = false;

function getManager() {
  return settingsManager;
}

// Reactive state mirroring settings
const settings = reactive<Record<string, any>>({});

function syncFromManager(): void {
  const mgr = getManager();
  if (mgr && mgr.settings) {
    Object.assign(settings, mgr.settings);
  }
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
  mouseDownOnOverlay = (e.target as HTMLElement).classList.contains(
    'settings-overlay'
  );
}

function onOverlayClick(e: MouseEvent): void {
  if (
    mouseDownOnOverlay &&
    (e.target as HTMLElement).classList.contains('settings-overlay')
  ) {
    close();
  }
}

function save(key: string, val: any): void {
  const mgr = getManager();
  if (mgr) {
    mgr.set(key, val);
  }
}

function onLanguageChange(e: Event): void {
  const newLocale = (e.target as HTMLSelectElement).value;
  if (window.i18n) {
    window.i18n.setLocale(newLocale);
  }
}

function handleReset(): void {
  if (confirm(t('settings.confirmReset'))) {
    const mgr = getManager();
    if (mgr) {
      mgr.resetToDefaults();
      syncFromManager();
    }
  }
}

function onLocaleChanged(): void {
  localeTick.value++;
  if (window.i18n) {
    currentLocale.value = window.i18n.getLocale();
  }
}

onMounted(() => {
  syncFromManager();
  window.addEventListener('localeChanged', onLocaleChanged);
  window.settingsModalInstance = {
    open,
    close,
    syncFromManager,
  };
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
  if (window.settingsModalInstance?.open === open) {
    delete window.settingsModalInstance;
  }
});

defineExpose({
  open,
  close,
  syncFromManager,
  isOpen,
});
</script>
