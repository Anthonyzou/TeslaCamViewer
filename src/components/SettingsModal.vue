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
import { computed, onMounted, onUnmounted, reactive } from 'vue';
import { useI18n } from '../composables/useI18n';
import { useModals } from '../composables/useModals';
import { settingsStore } from '../composables/useSettings';

const {
  isSettingsOpen: isOpen,
  settingsActiveTab: activeTab,
  settingsModal,
} = useModals();
const { t, currentLocale, setLocale } = useI18n();
let mouseDownOnOverlay = false;

// Reactive state mirroring settings
const settings = reactive<Record<string, any>>({});

function syncFromManager(): void {
  if (settingsStore.settings) {
    Object.assign(settings, settingsStore.settings);
  }
}

const currentSectionTitle = computed<string>(() => {
  return t(`settings.tabs.${activeTab.value}`);
});

function open(tab?: string): void {
  settingsModal.open(tab);
}

function close(): void {
  settingsModal.close();
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
  settingsStore.set(key, val);
}

function onLanguageChange(e: Event): void {
  const newLocale = (e.target as HTMLSelectElement).value;
  setLocale(newLocale);
}

function handleReset(): void {
  if (confirm(t('settings.confirmReset'))) {
    settingsStore.resetToDefaults();
    syncFromManager();
  }
}

onMounted(() => {
  syncFromManager();
  settingsModal.registerSyncHandler(syncFromManager);
});

onUnmounted(() => {
  settingsModal.unregisterSyncHandler();
});

defineExpose({
  open,
  close,
  syncFromManager,
  isOpen,
});
</script>

<style scoped>
.settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-modal.hidden {
  display: none;
}

.settings-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
}

.settings-panel {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 90%;
  max-width: 720px;
  height: 80vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow:
    var(--shadow-lg),
    0 0 60px rgba(0, 212, 255, 0.1);
  overflow: hidden;
}

.settings-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 6px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.settings-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.settings-sidebar {
  width: 200px;
  min-width: 200px;
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.settings-sidebar-header {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid var(--border);
}

.settings-sidebar-header h2 {
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.settings-nav {
  flex: 1;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
}

.settings-nav-item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.settings-nav-item.active {
  background: var(--accent-subtle);
  color: var(--accent);
}

.settings-nav-item svg {
  opacity: 0.6;
  flex-shrink: 0;
  transition: opacity 0.15s ease;
}

.settings-nav-item:hover svg,
.settings-nav-item.active svg {
  opacity: 1;
}

.settings-nav-item span {
  flex: 1;
}

.settings-sidebar-footer {
  padding: 0.75rem;
  border-top: 1px solid var(--border);
}

.settings-reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.settings-reset-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--text-muted);
  color: var(--text-secondary);
}

.settings-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.settings-main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.settings-section-title {
  font-family: var(--font-ui);
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.settings-tab-content {
  display: none;
}

.settings-tab-content.active {
  display: block;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-track {
  background: transparent;
}

.settings-content::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.settings-content::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

.settings-section {
  margin-bottom: 1.75rem;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h3 {
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 0;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-row label {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  width: 100%;
  margin-top: 0.375rem;
}

.setting-status {
  font-size: 0.75rem;
  width: 100%;
  margin-top: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.setting-status:empty {
  display: none;
}

.setting-status.loading {
  color: #ffa726;
  background: rgba(255, 167, 38, 0.1);
}

.setting-status.success {
  color: #66bb6a;
  background: rgba(102, 187, 106, 0.1);
}

.setting-status.error {
  color: #ef5350;
  background: rgba(239, 83, 80, 0.1);
}

.setting-status.info {
  color: var(--text-muted);
  background: rgba(128, 128, 128, 0.1);
}

.setting-select {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.875rem;
  font-family: var(--font-ui);
  font-size: 0.85rem;
  cursor: pointer;
  min-width: 120px;
  transition: all 0.2s ease;
}

.setting-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}

.setting-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--accent);
}

.settings-btn {
  padding: 0.625rem 1.5rem;
  border-radius: 8px;
  font-family: var(--font-ui);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
}

.settings-btn.primary {
  background: linear-gradient(135deg, var(--accent) 0%, #0099cc 100%);
  color: var(--bg-void);
  border: none;
  box-shadow: 0 0 15px var(--accent-glow);
}

.settings-btn.primary:hover {
  background: linear-gradient(
    135deg,
    var(--accent-hover) 0%,
    var(--accent) 100%
  );
  box-shadow: 0 0 25px var(--accent-glow);
}

.settings-btn.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.settings-btn.secondary:hover {
  background: var(--bg-elevated);
  border-color: var(--text-muted);
}

@media only screen and (max-width: 768px) {
  .settings-panel {
    width: 100%;
    max-width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .settings-layout {
    flex-direction: column;
  }

  .settings-sidebar {
    width: 100%;
    min-width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .settings-sidebar-header {
    display: none;
  }

  .settings-nav {
    flex-direction: row;
    padding: 0.5rem;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .settings-nav::-webkit-scrollbar {
    display: none;
  }

  .settings-nav-item {
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    min-width: fit-content;
    text-align: center;
  }
}
</style>
