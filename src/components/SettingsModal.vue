<template>
  <div v-if="isOpen" class="
      fixed inset-0 z-2000 flex items-center justify-center
  " @keydown.esc="close">
    <div class="
        settings-overlay absolute inset-0 bg-black/80 backdrop-blur-[5px]
    " @mousedown="close" @click="close">
    </div>
    <div class="
        settings-panel relative flex h-[80vh] max-h-[600px] w-[90%]
        max-w-[720px] flex-col overflow-hidden rounded-2xl border
        border-(--border) bg-(--bg-secondary)
        shadow-[var(--shadow-lg),0_0_60px_rgba(0,212,255,0.1)]
        max-md:h-screen max-md:max-h-screen max-md:w-full max-md:max-w-full
        max-md:rounded-none
    ">
      <div class="
          settings-layout flex flex-1 overflow-hidden
          max-md:flex-col
      ">
        <!-- Sidebar Navigation -->
        <div class="
            settings-sidebar flex w-[200px] min-w-[200px] flex-col border-r
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
              settings-nav flex flex-1 scrollbar-none flex-col gap-1 px-2 py-3
              max-md:flex-row max-md:overflow-x-auto max-md:p-2
              [&::-webkit-scrollbar]:hidden
          ">
            <button class="
                settings-nav-item group flex w-full cursor-pointer items-center
                gap-3 rounded-lg border-none bg-transparent px-3.5 py-2.5
                text-left font-(family-name:--font-ui) text-sm font-medium
                text-(--text-secondary) transition-all duration-150
                hover:bg-(--bg-secondary) hover:text-(--text-primary)
                max-md:min-w-fit max-md:flex-col max-md:gap-1 max-md:px-3
                max-md:py-2 max-md:text-center
            " :class="{
              'bg-(--accent-subtle) text-(--accent) [&>svg]:opacity-100':
                activeTab === 'general',
            }" @click="activeTab = 'general'">
              <Sliders :size="18" class="
                  shrink-0 opacity-60 transition-opacity duration-150
                  group-hover:opacity-100
              " />
              <span class="flex-1">{{ t('settings.tabs.general') }}</span>
            </button>
            <button class="
                settings-nav-item group flex w-full cursor-pointer items-center
                gap-3 rounded-lg border-none bg-transparent px-3.5 py-2.5
                text-left font-(family-name:--font-ui) text-sm font-medium
                text-(--text-secondary) transition-all duration-150
                hover:bg-(--bg-secondary) hover:text-(--text-primary)
                max-md:min-w-fit max-md:flex-col max-md:gap-1 max-md:px-3
                max-md:py-2 max-md:text-center
            " :class="{
              'bg-(--accent-subtle) text-(--accent) [&>svg]:opacity-100':
                activeTab === 'playback',
            }" @click="activeTab = 'playback'">
              <Play :size="18" class="
                  shrink-0 opacity-60 transition-opacity duration-150
                  group-hover:opacity-100
              " />
              <span class="flex-1">{{ t('settings.tabs.playback') }}</span>
            </button>
            <button class="
                settings-nav-item group flex w-full cursor-pointer items-center
                gap-3 rounded-lg border-none bg-transparent px-3.5 py-2.5
                text-left font-(family-name:--font-ui) text-sm font-medium
                text-(--text-secondary) transition-all duration-150
                hover:bg-(--bg-secondary) hover:text-(--text-primary)
                max-md:min-w-fit max-md:flex-col max-md:gap-1 max-md:px-3
                max-md:py-2 max-md:text-center
            " :class="{
              'bg-(--accent-subtle) text-(--accent) [&>svg]:opacity-100':
                activeTab === 'overlays',
            }" @click="activeTab = 'overlays'">
              <Layers :size="18" class="
                  shrink-0 opacity-60 transition-opacity duration-150
                  group-hover:opacity-100
              " />
              <span class="flex-1">{{ t('settings.tabs.overlays') }}</span>
            </button>
            <button class="
                settings-nav-item group flex w-full cursor-pointer items-center
                gap-3 rounded-lg border-none bg-transparent px-3.5 py-2.5
                text-left font-(family-name:--font-ui) text-sm font-medium
                text-(--text-secondary) transition-all duration-150
                hover:bg-(--bg-secondary) hover:text-(--text-primary)
                max-md:min-w-fit max-md:flex-col max-md:gap-1 max-md:px-3
                max-md:py-2 max-md:text-center
            " :class="{
              'bg-(--accent-subtle) text-(--accent) [&>svg]:opacity-100':
                activeTab === 'advanced',
            }" @click="activeTab = 'advanced'">
              <Cpu :size="18" class="
                  shrink-0 opacity-60 transition-opacity duration-150
                  group-hover:opacity-100
              " />
              <span class="flex-1">{{ t('settings.tabs.advanced') }}</span>
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
                settings-section-title m-0 font-(family-name:--font-ui)
                text-[0.9rem] font-semibold tracking-wider text-(--text-primary)
                uppercase
            ">
              {{ currentSectionTitle }}
            </h3>
            <button class="
                settings-close-btn flex cursor-pointer items-center
                justify-center rounded-md border-none bg-transparent p-1.5
                text-(--text-muted) transition-all duration-150
                hover:bg-(--bg-tertiary) hover:text-(--text-primary)
            " :title="t('common.close')" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div class="
              settings-content flex-1 scrollbar-thin
              [scrollbar-color:var(--scrollbar-thumb)_transparent]
              overflow-y-auto px-5 pt-4 pb-6
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-thumb]:rounded-[3px]
              [&::-webkit-scrollbar-thumb]:bg-(--scrollbar-thumb)
              [&::-webkit-scrollbar-thumb:hover]:bg-(--scrollbar-thumb-hover)
              [&::-webkit-scrollbar-track]:bg-transparent
          ">
            <!-- GENERAL TAB -->
            <div v-show="activeTab === 'general'">
              <div class="
                  settings-section mb-7
                  last:mb-0
              ">
                <h3 class="
                    mb-4 font-(family-name:--font-ui) text-xs font-semibold
                    tracking-widest text-(--accent) uppercase
                ">
                  {{ t('settings.sections.language') }}
                </h3>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-language" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.language.selectLanguage') }}</label>
                  <select id="setting-language" class="
                      setting-select min-w-[120px] cursor-pointer rounded-md
                      border border-(--border) bg-(--bg-tertiary) px-3.5 py-2
                      font-(family-name:--font-ui) text-[0.85rem]
                      text-(--text-primary) transition-all duration-200
                      focus:border-(--accent)
                      focus:shadow-[0_0_10px_var(--accent-glow)]
                      focus:outline-none
                  " v-model="currentLocale" @change="onLanguageChange">
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

              <div class="
                  settings-section mb-7
                  last:mb-0
              ">
                <h3 class="
                    mb-4 font-(family-name:--font-ui) text-xs font-semibold
                    tracking-widest text-(--accent) uppercase
                ">
                  {{ t('settings.sections.ui') }}
                </h3>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-theme" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{ t('settings.ui.theme')
                    }}</label>
                  <select id="setting-theme" class="
                      setting-select min-w-[120px] cursor-pointer rounded-md
                      border border-(--border) bg-(--bg-tertiary) px-3.5 py-2
                      font-(family-name:--font-ui) text-[0.85rem]
                      text-(--text-primary) transition-all duration-200
                      focus:border-(--accent)
                      focus:shadow-[0_0_10px_var(--accent-glow)]
                      focus:outline-none
                  " v-model="settings.theme" @change="save('theme', settings.theme)">
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
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-showKeyboardHints" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.ui.showKeyboardHints') }}</label>
                  <input type="checkbox" id="setting-showKeyboardHints" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.showKeyboardHints" @change="
                    save('showKeyboardHints', settings.showKeyboardHints)
                    " />
                </div>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-showTimestampOverlay" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.ui.showTimestampOverlay') }}</label>
                  <input type="checkbox" id="setting-showTimestampOverlay" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.showTimestampOverlay" @change="
                    save(
                      'showTimestampOverlay',
                      settings.showTimestampOverlay
                    )
                    " />
                </div>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-showWhatsNew" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.ui.showWhatsNew') }}</label>
                  <input type="checkbox" id="setting-showWhatsNew" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.showWhatsNew" @change="save('showWhatsNew', settings.showWhatsNew)" />
                  <span class="
                      setting-hint mt-1.5 w-full text-xs text-(--text-muted)
                  ">{{ t('settings.ui.whatsNewHint') }}</span>
                </div>
              </div>
            </div>

            <!-- PLAYBACK TAB -->
            <div v-show="activeTab === 'playback'">
              <div class="
                  settings-section mb-7
                  last:mb-0
              ">
                <h3 class="
                    mb-4 font-(family-name:--font-ui) text-xs font-semibold
                    tracking-widest text-(--accent) uppercase
                ">
                  {{ t('settings.sections.playback') }}
                </h3>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-defaultSpeed" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.playback.defaultSpeed') }}</label>
                  <select id="setting-defaultSpeed" class="
                      setting-select min-w-[120px] cursor-pointer rounded-md
                      border border-(--border) bg-(--bg-tertiary) px-3.5 py-2
                      font-(family-name:--font-ui) text-[0.85rem]
                      text-(--text-primary) transition-all duration-200
                      focus:border-(--accent)
                      focus:shadow-[0_0_10px_var(--accent-glow)]
                      focus:outline-none
                  " v-model="settings.defaultSpeed" @change="save('defaultSpeed', settings.defaultSpeed)">
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-defaultLayout" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.playback.defaultLayout') }}</label>
                  <select id="setting-defaultLayout" class="
                      setting-select min-w-[120px] cursor-pointer rounded-md
                      border border-(--border) bg-(--bg-tertiary) px-3.5 py-2
                      font-(family-name:--font-ui) text-[0.85rem]
                      text-(--text-primary) transition-all duration-200
                      focus:border-(--accent)
                      focus:shadow-[0_0_10px_var(--accent-glow)]
                      focus:outline-none
                  " v-model="settings.defaultLayout" @change="save('defaultLayout', settings.defaultLayout)">
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
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-autoPlayNextEvent" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.playback.autoPlayNext') }}</label>
                  <input type="checkbox" id="setting-autoPlayNextEvent" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.autoPlayNextEvent" @change="
                    save('autoPlayNextEvent', settings.autoPlayNextEvent)
                    " />
                </div>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-loopByDefault" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.playback.loopByDefault') }}</label>
                  <input type="checkbox" id="setting-loopByDefault" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.loopByDefault" @change="save('loopByDefault', settings.loopByDefault)" />
                </div>
              </div>

              <div class="
                  settings-section mb-7
                  last:mb-0
              ">
                <h3 class="
                    mb-4 font-(family-name:--font-ui) text-xs font-semibold
                    tracking-widest text-(--accent) uppercase
                ">
                  {{ t('settings.sections.timeline') }}
                </h3>

                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-showClipMarkers" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.timeline.showClipMarkers') }}</label>
                  <input type="checkbox" id="setting-showClipMarkers" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.showClipMarkers" @change="save('showClipMarkers', settings.showClipMarkers)" />
                </div>
              </div>
            </div>

            <!-- OVERLAYS TAB -->
            <div v-show="activeTab === 'overlays'">
              <div class="
                  settings-section mb-7
                  last:mb-0
              ">
                <h3 class="
                    mb-4 font-(family-name:--font-ui) text-xs font-semibold
                    tracking-widest text-(--accent) uppercase
                ">
                  Weather
                </h3>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-temperatureUnits" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.weather.units') }}</label>
                  <select id="setting-temperatureUnits" class="
                      setting-select min-w-[120px] cursor-pointer rounded-md
                      border border-(--border) bg-(--bg-tertiary) px-3.5 py-2
                      font-(family-name:--font-ui) text-[0.85rem]
                      text-(--text-primary) transition-all duration-200
                      focus:border-(--accent)
                      focus:shadow-[0_0_10px_var(--accent-glow)]
                      focus:outline-none
                  " v-model="settings.temperatureUnits" @change="
                    save('temperatureUnits', settings.temperatureUnits)
                    ">
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
            <div v-show="activeTab === 'advanced'">
              <div class="
                  settings-section mb-7
                  last:mb-0
              ">
                <h3 class="
                    mb-4 font-(family-name:--font-ui) text-xs font-semibold
                    tracking-widest text-(--accent) uppercase
                ">
                  {{ t('settings.sections.performance') }}
                </h3>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-preloadNextClip" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.performance.preloadNextClip') }}</label>
                  <input type="checkbox" id="setting-preloadNextClip" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.preloadNextClip" @change="save('preloadNextClip', settings.preloadNextClip)" />
                  <span class="
                      setting-hint mt-1.5 w-full text-xs text-(--text-muted)
                  ">{{ t('settings.performance.preloadHint') }}</span>
                </div>
              </div>

              <div class="
                  settings-section mb-7
                  last:mb-0
              ">
                <h3 class="
                    mb-4 font-(family-name:--font-ui) text-xs font-semibold
                    tracking-widest text-(--accent) uppercase
                ">
                  {{ t('settings.sections.session') }}
                </h3>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-rememberLastFolder" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.session.rememberLastFolder') }}</label>
                  <input type="checkbox" id="setting-rememberLastFolder" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.rememberLastFolder" @change="
                    save('rememberLastFolder', settings.rememberLastFolder)
                    " />
                  <span class="
                      setting-hint mt-1.5 w-full text-xs text-(--text-muted)
                  ">{{ t('settings.session.folderHint') }}</span>
                </div>
              </div>

              <div class="
                  settings-section mb-7
                  last:mb-0
              ">
                <h3 class="
                    mb-4 font-(family-name:--font-ui) text-xs font-semibold
                    tracking-widest text-(--accent) uppercase
                ">
                  {{ t('settings.sections.accessibility') }}
                </h3>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-highContrastMode" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.accessibility.highContrast') }}</label>
                  <input type="checkbox" id="setting-highContrastMode" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.highContrastMode" @change="
                    save('highContrastMode', settings.highContrastMode)
                    " />
                  <span class="
                      setting-hint mt-1.5 w-full text-xs text-(--text-muted)
                  ">{{ t('settings.accessibility.highContrastHint') }}</span>
                </div>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-textSize" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.accessibility.textSize') }}</label>
                  <select id="setting-textSize" class="
                      setting-select min-w-[120px] cursor-pointer rounded-md
                      border border-(--border) bg-(--bg-tertiary) px-3.5 py-2
                      font-(family-name:--font-ui) text-[0.85rem]
                      text-(--text-primary) transition-all duration-200
                      focus:border-(--accent)
                      focus:shadow-[0_0_10px_var(--accent-glow)]
                      focus:outline-none
                  " v-model="settings.textSize" @change="save('textSize', settings.textSize)">
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

              <div class="
                  settings-section mb-7
                  last:mb-0
              ">
                <h3 class="
                    mb-4 font-(family-name:--font-ui) text-xs font-semibold
                    tracking-widest text-(--accent) uppercase
                ">
                  {{ t('settings.sections.mobile') }}
                </h3>
                <div class="
                    setting-row flex flex-wrap items-center justify-between
                    gap-2 border-b border-(--border) py-3.5
                    last:border-b-0
                ">
                  <label for="setting-lockOrientationDuringPlayback" class="
                      text-[0.9rem] text-(--text-primary)
                  ">{{
                    t('settings.mobile.lockLandscape') }}</label>
                  <input type="checkbox" id="setting-lockOrientationDuringPlayback" class="
                      setting-checkbox size-5 cursor-pointer accent-(--accent)
                  " v-model="settings.lockOrientationDuringPlayback" @change="
                    save(
                      'lockOrientationDuringPlayback',
                      settings.lockOrientationDuringPlayback
                    )
                    " />
                  <span class="
                      setting-hint mt-1.5 w-full text-xs text-(--text-muted)
                  ">{{ t('settings.mobile.lockHint') }}</span>
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
