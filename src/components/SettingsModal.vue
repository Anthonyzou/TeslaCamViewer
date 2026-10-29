<template>
  <div v-if="isOpen" class="
    fixed inset-0 z-2000 flex items-center justify-center
  " @keydown.esc="close">
    <div class="
      settings-overlay absolute inset-0 bg-black/80 backdrop-blur-[5px]
    " @mousedown="close" @click="close"></div>
    <div class="
      settings-panel relative flex h-[80vh] max-h-150 w-[90%] max-w-180 flex-col
      overflow-hidden rounded-2xl border border-(--border) bg-(--bg-secondary)
      shadow-[var(--shadow-lg),0_0_60px_color-mix(in_srgb,var(--accent)_10%,transparent)]
      max-md:h-screen max-md:max-h-screen max-md:w-full max-md:max-w-full
      max-md:rounded-none
    ">
      <div class="
        settings-layout flex flex-1 overflow-hidden
        max-md:flex-col
      ">
        <!-- Sidebar Navigation -->
        <div class="
          settings-sidebar flex w-50 min-w-50 flex-col border-r
          border-(--border) bg-(--bg-tertiary)
          max-md:w-full max-md:min-w-full max-md:border-r-0 max-md:border-b
        ">
          <div class="
            settings-sidebar-header border-b border-(--border) px-4 py-5
            max-md:hidden
          ">
            <h2 class="
              m-0 font-(family-name:--font-ui) text-base font-semibold
              text-(--text-primary)
            ">
              {{ t('settings.title') }}
            </h2>
          </div>
          <nav class="
            settings-nav flex flex-1 flex-col gap-1 px-2 py-3
            max-md:flex-row max-md:overflow-x-auto max-md:p-2
            [&::-webkit-scrollbar]:hidden
          ">
            <button v-for="tab in tabs" :key="tab.key" class="
              settings-nav-item group setting-nav-item
            " :class="{ 'setting-nav-active': activeTab === tab.key }" @click="activeTab = tab.key">
              <component :is="tab.icon" :size="18" class="
                shrink-0 opacity-60 transition-opacity duration-150
                group-hover:opacity-100
              " />
              <span class="flex-1">{{ t(`settings.tabs.${tab.key}`) }}</span>
            </button>
          </nav>
          <div class="settings-sidebar-footer border-t border-(--border) p-3">
            <button class="
              settings-reset-btn flex w-full cursor-pointer items-center
              justify-center gap-2 rounded-md border border-(--border)
              bg-transparent px-3 py-2 font-(family-name:--font-ui) text-xs
              font-medium text-(--text-muted) transition-all duration-150
              hover:border-(--text-muted) hover:bg-(--bg-secondary)
              hover:text-(--text-secondary)
            " @click="handleReset">
              <RotateCcw :size="16" />
              {{ t('settings.resetToDefaults') }}
            </button>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="settings-main flex min-w-0 flex-1 flex-col overflow-hidden">
          <div class="
            settings-main-header flex items-center justify-between border-b
            border-(--border) bg-(--bg-secondary) px-5 py-4
          ">
            <h3 class="
              settings-section-title setting-label m-0
              font-(family-name:--font-ui) font-semibold tracking-wider
              uppercase
            ">
              {{ currentSectionTitle }}
            </h3>
            <button class="
              settings-close-btn flex cursor-pointer items-center justify-center
              rounded-md border-none bg-transparent p-1.5 text-(--text-muted)
              transition-all duration-150
              hover:bg-(--bg-tertiary) hover:text-(--text-primary)
            " :title="t('common.close')" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div class="
            settings-content flex-1
            [scrollbar-color:var(--scrollbar-thumb)_transparent] overflow-y-auto
            px-5 pt-4 pb-6
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-thumb]:rounded-[3px]
            [&::-webkit-scrollbar-thumb]:bg-(--scrollbar-thumb)
            [&::-webkit-scrollbar-thumb:hover]:bg-(--scrollbar-thumb-hover)
            [&::-webkit-scrollbar-track]:bg-transparent
          ">
            <!-- GENERAL TAB -->
            <div v-show="activeTab === 'general'">
              <div class="setting-section">
                <h3 class="setting-section-title">{{ t('settings.sections.language') }}</h3>
                <SettingRow html-for="setting-language" :label="t('settings.language.selectLanguage')">
                  <select id="setting-language" v-model="currentLocale" class="
                    setting-select
                  " @change="onLanguageChange">
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
                </SettingRow>
              </div>

              <div class="setting-section">
                <h3 class="setting-section-title">{{ t('settings.sections.ui') }}</h3>
                <SettingRow html-for="setting-theme" :label="t('settings.ui.theme')">
                  <select id="setting-theme" v-model="settings.theme" class="
                    setting-select
                  " @change="save('theme', settings.theme)">
                    <option value="dark">{{ t('settings.ui.themeDark') }}</option>
                    <option value="light">{{ t('settings.ui.themeLight') }}</option>
                    <option value="midnight">{{ t('settings.ui.themeMidnight') }}</option>
                    <option value="tesla-red">{{ t('settings.ui.themeTeslaRed') }}</option>
                  </select>
                </SettingRow>
                <SettingRow html-for="setting-showKeyboardHints" :label="t('settings.ui.showKeyboardHints')">
                  <input id="setting-showKeyboardHints" v-model="settings.showKeyboardHints" type="checkbox" class="
                    setting-checkbox
                  " @change="save('showKeyboardHints', settings.showKeyboardHints)" />
                </SettingRow>
                <SettingRow html-for="setting-showTimestampOverlay" :label="t('settings.ui.showTimestampOverlay')">
                  <input id="setting-showTimestampOverlay" v-model="settings.showTimestampOverlay" type="checkbox"
                    class="setting-checkbox" @change="save('showTimestampOverlay', settings.showTimestampOverlay)" />
                </SettingRow>
                <SettingRow html-for="setting-showWhatsNew" :label="t('settings.ui.showWhatsNew')"
                  :hint="t('settings.ui.whatsNewHint')">
                  <input id="setting-showWhatsNew" v-model="settings.showWhatsNew" type="checkbox" class="
                    setting-checkbox
                  " @change="save('showWhatsNew', settings.showWhatsNew)" />
                </SettingRow>
              </div>
            </div>

            <!-- PLAYBACK TAB -->
            <div v-show="activeTab === 'playback'">
              <div class="setting-section">
                <h3 class="setting-section-title">{{ t('settings.sections.playback') }}</h3>
                <SettingRow html-for="setting-defaultSpeed" :label="t('settings.playback.defaultSpeed')">
                  <select id="setting-defaultSpeed" v-model="settings.defaultSpeed" class="
                    setting-select
                  " @change="save('defaultSpeed', settings.defaultSpeed)">
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </SettingRow>
                <SettingRow html-for="setting-defaultLayout" :label="t('settings.playback.defaultLayout')">
                  <select id="setting-defaultLayout" v-model="settings.defaultLayout" class="
                    setting-select
                  " @change="save('defaultLayout', settings.defaultLayout)">
                    <option value="grid-2x2">{{ t('layouts.grid2x2') }}</option>
                    <option value="layout-6-3">{{ t('layouts.layout63') }}</option>
                    <option value="layout-4-3">{{ t('layouts.layout43') }}</option>
                    <option value="layout-all-16-9">{{ t('layouts.all169') }}</option>
                    <option value="layout-front-left">{{ t('layouts.frontLeft') }}</option>
                    <option value="layout-front-right">{{ t('layouts.frontRight') }}</option>
                    <option value="layout-front-repeaters">{{ t('layouts.frontRepeaters') }}</option>
                  </select>
                </SettingRow>
                <SettingRow html-for="setting-autoPlayNextEvent" :label="t('settings.playback.autoPlayNext')">
                  <input id="setting-autoPlayNextEvent" v-model="settings.autoPlayNextEvent" type="checkbox" class="
                    setting-checkbox
                  " @change="save('autoPlayNextEvent', settings.autoPlayNextEvent)" />
                </SettingRow>
                <SettingRow html-for="setting-loopByDefault" :label="t('settings.playback.loopByDefault')">
                  <input id="setting-loopByDefault" v-model="settings.loopByDefault" type="checkbox" class="
                    setting-checkbox
                  " @change="save('loopByDefault', settings.loopByDefault)" />
                </SettingRow>
              </div>

              <div class="setting-section">
                <h3 class="setting-section-title">{{ t('settings.sections.timeline') }}</h3>
                <SettingRow html-for="setting-showClipMarkers" :label="t('settings.timeline.showClipMarkers')">
                  <input id="setting-showClipMarkers" v-model="settings.showClipMarkers" type="checkbox" class="
                    setting-checkbox
                  " @change="save('showClipMarkers', settings.showClipMarkers)" />
                </SettingRow>
              </div>
            </div>

            <!-- OVERLAYS TAB -->
            <div v-show="activeTab === 'overlays'">
              <div class="setting-section">
                <h3 class="setting-section-title">Weather</h3>
                <SettingRow html-for="setting-temperatureUnits" :label="t('settings.weather.units')">
                  <select id="setting-temperatureUnits" v-model="settings.temperatureUnits" class="
                    setting-select
                  " @change="save('temperatureUnits', settings.temperatureUnits)">
                    <option value="celsius">{{ t('settings.weather.unitsCelsius') }}</option>
                    <option value="fahrenheit">{{ t('settings.weather.unitsFahrenheit') }}</option>
                  </select>
                </SettingRow>
              </div>
            </div>

            <!-- ADVANCED TAB -->
            <div v-show="activeTab === 'advanced'">
              <div class="setting-section">
                <h3 class="setting-section-title">{{ t('settings.sections.performance') }}</h3>
                <SettingRow html-for="setting-preloadNextClip" :label="t('settings.performance.preloadNextClip')"
                  :hint="t('settings.performance.preloadHint')">
                  <input id="setting-preloadNextClip" v-model="settings.preloadNextClip" type="checkbox" class="
                    setting-checkbox
                  " @change="save('preloadNextClip', settings.preloadNextClip)" />
                </SettingRow>
              </div>

              <div class="setting-section">
                <h3 class="setting-section-title">{{ t('settings.sections.session') }}</h3>
                <SettingRow html-for="setting-rememberLastFolder" :label="t('settings.session.rememberLastFolder')"
                  :hint="t('settings.session.folderHint')">
                  <input id="setting-rememberLastFolder" v-model="settings.rememberLastFolder" type="checkbox" class="
                    setting-checkbox
                  " @change="save('rememberLastFolder', settings.rememberLastFolder)" />
                </SettingRow>
              </div>

              <div class="setting-section">
                <h3 class="setting-section-title">{{ t('settings.sections.accessibility') }}</h3>
                <SettingRow html-for="setting-highContrastMode" :label="t('settings.accessibility.highContrast')"
                  :hint="t('settings.accessibility.highContrastHint')">
                  <input id="setting-highContrastMode" v-model="settings.highContrastMode" type="checkbox" class="
                    setting-checkbox
                  " @change="save('highContrastMode', settings.highContrastMode)" />
                </SettingRow>
                <SettingRow html-for="setting-textSize" :label="t('settings.accessibility.textSize')">
                  <select id="setting-textSize" v-model="settings.textSize" class="
                    setting-select
                  " @change="save('textSize', settings.textSize)">
                    <option value="small">{{ t('settings.accessibility.textSmall') }}</option>
                    <option value="medium">{{ t('settings.accessibility.textMedium') }}</option>
                    <option value="large">{{ t('settings.accessibility.textLarge') }}</option>
                  </select>
                </SettingRow>
              </div>

              <div class="setting-section">
                <h3 class="setting-section-title">{{ t('settings.sections.mobile') }}</h3>
                <SettingRow html-for="setting-lockOrientationDuringPlayback" :label="t('settings.mobile.lockLandscape')"
                  :hint="t('settings.mobile.lockHint')">
                  <input id="setting-lockOrientationDuringPlayback" v-model="settings.lockOrientationDuringPlayback"
                    type="checkbox" class="setting-checkbox"
                    @change="save('lockOrientationDuringPlayback', settings.lockOrientationDuringPlayback)" />
                </SettingRow>
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
import SettingRow from './SettingRow.vue';

const {
  isSettingsOpen: isOpen,
  settingsActiveTab: activeTab,
  settingsModal,
} = useModals();
const { t, currentLocale, setLocale } = useI18n();

const tabs = [
  { key: 'general', icon: Sliders },
  { key: 'playback', icon: Play },
  { key: 'overlays', icon: Layers },
  { key: 'advanced', icon: Cpu },
] as const;

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
@reference "tailwindcss";

.setting-select {
  @apply min-w-30 cursor-pointer rounded-md border border-(--border) bg-(--bg-tertiary) px-3.5 py-2 font-(family-name:--font-ui) text-[0.85rem] text-(--text-primary) transition-all duration-200 focus:border-(--accent) focus:shadow-[0_0_10px_var(--accent-glow)] focus:outline-none;
}

.setting-checkbox {
  @apply size-5 cursor-pointer accent-(--accent);
}

.setting-section-title {
  @apply mb-4 font-(family-name:--font-ui) text-xs font-semibold tracking-widest text-(--accent) uppercase;
}

.setting-section {
  @apply mb-7 last:mb-0;
}

.setting-nav-item {
  @apply flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3.5 py-2.5 text-left font-(family-name:--font-ui) text-sm font-medium text-(--text-secondary) transition-all duration-150 hover:bg-(--bg-secondary) hover:text-(--text-primary) max-md:min-w-fit max-md:flex-col max-md:gap-1 max-md:px-3 max-md:py-2 max-md:text-center;
}

.setting-nav-active {
  @apply bg-(--accent-subtle) text-(--accent) [&>svg]:opacity-100;
}
</style>
