<template>
  <div class="controls">
    <!-- Primary Playback Group -->
    <div class="control-group control-group-playback">
      <button
        id="playPauseBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :aria-label="isPlaying ? 'Pause' : 'Play'"
        @click="emit('togglePlay')"
      >
        <svg
          v-if="!isPlaying"
          class="play-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg
          v-else
          class="pause-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
        </svg>
      </button>

      <button
        id="prevClipBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.previousClip')"
        @click="emit('prevClip')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6l-8.5 6z" />
        </svg>
      </button>

      <button
        id="nextClipBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.nextClip')"
        @click="emit('nextClip')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" />
        </svg>
      </button>

      <div class="speed-control">
        <select
          id="speedSelect"
          class="speed-select"
          :disabled="!hasEvent"
          title="Playback Speed"
          v-model="selectedSpeed"
          @change="emit('changeSpeed', selectedSpeed)"
        >
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1">1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
        </select>
      </div>

      <button
        id="loopBtn"
        class="control-btn"
        :class="{ active: isLooping }"
        :disabled="!hasEvent"
        title="Toggle Loop"
        @click="emit('toggleLoop')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
          />
        </svg>
      </button>
      <input type="checkbox" id="loopCheckbox" :checked="isLooping" style="display: none;" />
    </div>

    <!-- Export Group -->
    <div class="control-group control-group-export">
      <button
        id="markInBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.markIn')"
        @click="emit('markIn')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 4h4v16H2V4zm6 0v16l11-8L8 4z" fill="#4caf50" />
        </svg>
      </button>

      <button
        id="markOutBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.markOut')"
        @click="emit('markOut')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 4h4v16h-4V4zM5 12l11 8V4L5 12z" fill="#f44336" />
        </svg>
      </button>

      <button
        id="clearMarksBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.clearMarks')"
        @click="emit('clearMarks')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>

      <div class="export-dropdown-container">
        <button
          id="exportBtn"
          class="control-btn export-main-btn"
          :disabled="!hasEvent"
          :title="t('controls.export')"
          @click="emit('exportVideo')"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"
            />
          </svg>
        </button>

        <button
          id="exportDropdownBtn"
          class="control-btn dropdown-toggle"
          :disabled="!hasEvent"
          :title="t('controls.exportOptions')"
          @click="isExportDropdownOpen = !isExportDropdownOpen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>

        <div id="exportDropdown" class="export-dropdown" :class="{ hidden: !isExportDropdownOpen }">
          <div class="export-dropdown-header" data-i18n="export.header">{{ t('export.header') }}</div>

          <!-- Capture Screenshot -->
          <button
            class="export-option export-action-btn"
            data-action="screenshot"
            @click="onScreenshotClick"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
              />
            </svg>
            <span data-i18n="controls.screenshot">{{ t('controls.screenshot') }}</span>
          </button>

          <!-- Export Video with Format -->
          <div class="export-video-group">
            <button
              class="export-option export-action-btn"
              data-camera="all"
              id="exportVideoBtn"
              @click="onExportVideoClick"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"
                />
              </svg>
              <span data-i18n="export.exportVideo">{{ t('export.exportVideo') }}</span>
            </button>
            <select
              id="exportFormatSelect"
              class="export-format-select"
              title="Export format"
              v-model="exportFormat"
            >
              <option value="webm">WebM</option>
              <option value="mp4">MP4</option>
              <option value="gif">GIF</option>
            </select>
          </div>

          <div id="gifWarning" class="gif-warning" :class="{ hidden: exportFormat !== 'gif' }">
            <span class="gif-warning-icon">⏱️</span>
            <span>GIF export takes ~10x clip length</span>
          </div>

          <div class="export-dropdown-divider"></div>

          <!-- Export Settings -->
          <div class="export-settings-header">Settings</div>

          <label class="export-option export-checkbox-option">
            <input type="checkbox" id="privacyModeCheckbox" v-model="privacyMode" />
            <span class="export-checkbox-label" data-i18n="export.privacyMode">{{ t('export.privacyMode') }}</span>
            <span class="export-option-hint" data-i18n="export.privacyModeHint">{{ t('export.privacyModeHint') }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- View Controls Group -->
    <div class="control-group control-group-view">
      <button
        id="enhanceBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.enhance')"
        @click="emit('toggleEnhance')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"
          />
        </svg>
      </button>

      <div class="layout-control">
        <select
          id="layoutSelect"
          class="layout-select"
          title="Layout"
          v-model="selectedLayout"
          @change="emit('changeLayout', selectedLayout)"
        >
          <option value="grid-2x2" data-i18n="layouts.grid2x2">{{ t('layouts.grid2x2') }}</option>
          <option value="grid-3x2" data-i18n="layouts.grid3x2" class="pillar-layout-option" style="display: none;">
            3×2 Grid (6 Cam)
          </option>
          <option value="layout-6-3" data-i18n="layouts.layout63">{{ t('layouts.layout63') }}</option>
          <option value="layout-4-3" data-i18n="layouts.layout43">{{ t('layouts.layout43') }}</option>
          <option value="layout-all-16-9" data-i18n="layouts.all169">{{ t('layouts.all169') }}</option>
          <option value="layout-front-left" data-i18n="layouts.frontLeft">{{ t('layouts.frontLeft') }}</option>
          <option value="layout-front-right" data-i18n="layouts.frontRight">{{ t('layouts.frontRight') }}</option>
          <option value="layout-front-repeaters" data-i18n="layouts.frontRepeaters">{{ t('layouts.frontRepeaters') }}</option>
          <option value="layout-front-pillars" class="pillar-layout-option" style="display: none;">Front + Pillars</option>
          <option value="layout-front-left-pillar" class="pillar-layout-option" style="display: none;">Front + Left Pillar</option>
          <option value="layout-front-right-pillar" class="pillar-layout-option" style="display: none;">Front + Right Pillar</option>
          <option value="layout-focus" data-i18n="layouts.focus">{{ t('layouts.focus') }}</option>
        </select>
      </div>

      <div class="layout-control" id="focusCameraControl" :style="{ display: selectedLayout === 'layout-focus' ? '' : 'none' }">
        <select id="focusCameraSelect" class="layout-select" title="Focus Camera" v-model="focusCamera" @change="emit('changeFocusCamera', focusCamera)">
          <option value="front" data-i18n="cameras.front">{{ t('cameras.front') }}</option>
          <option value="back" data-i18n="cameras.back">{{ t('cameras.back') }}</option>
          <option value="left_repeater" data-i18n="cameras.left">{{ t('cameras.left') }}</option>
          <option value="right_repeater" data-i18n="cameras.right">{{ t('cameras.right') }}</option>
          <option value="left_pillar" data-i18n="cameras.leftPillar" class="pillar-option" style="display: none;">Left Pillar</option>
          <option value="right_pillar" data-i18n="cameras.rightPillar" class="pillar-option" style="display: none;">Right Pillar</option>
        </select>
      </div>

      <button
        id="resetLayoutBtn"
        class="control-btn"
        title="Reset camera positions to layout defaults"
        style="display: none;"
        @click="emit('resetLayout')"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
          />
        </svg>
      </button>

      <div class="sync-status">
        <span id="syncStatus" class="sync-indicator"></span>
      </div>
    </div>

    <!-- Mobile More Menu -->
    <div class="control-group control-group-mobile-more">
      <div class="mobile-more-container">
        <button id="mobileMoreBtn" class="control-btn" title="More Options" @click="isMobileMoreOpen = !isMobileMoreOpen">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        <div id="mobileMoreMenu" class="mobile-more-menu" :class="{ hidden: !isMobileMoreOpen }">
          <div class="mobile-more-section">
            <div class="mobile-more-label">View</div>
            <button class="mobile-more-option" data-action="enhance" @click="emit('toggleEnhance')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"
                />
              </svg>
              <span>Enhancement</span>
            </button>
            <div class="mobile-more-option mobile-layout-selector">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
              </svg>
              <span>Layout</span>
              <select id="mobileLayoutSelect" class="mobile-layout-select" v-model="selectedLayout" @change="emit('changeLayout', selectedLayout)">
                <option value="grid-2x2">2x2 Grid</option>
                <option value="layout-6-3">6:3 Centered</option>
                <option value="layout-4-3">4:3 Main</option>
                <option value="layout-focus">Focus</option>
              </select>
            </div>
          </div>
          <div class="mobile-more-divider"></div>
          <div class="mobile-more-section">
            <div class="mobile-more-label">Export</div>
            <button class="mobile-more-option" data-action="screenshot" @click="emit('captureScreenshot')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
                />
              </svg>
              <span>Screenshot</span>
            </button>
            <button class="mobile-more-option" data-action="export-video" @click="emit('exportVideo')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"
                />
              </svg>
              <span>Export Video</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden buttons kept for keyboard shortcuts / compatibility -->
    <button id="frameBackBtn" class="control-btn hidden-control" disabled :title="t('controls.previousFrame')" @click="emit('frameBack')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 18V6l-8.5 6 8.5 6zm7 0V6l-8.5 6 8.5 6z" />
      </svg>
    </button>
    <button id="frameForwardBtn" class="control-btn hidden-control" disabled :title="t('controls.nextFrame')" @click="emit('frameForward')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18V6l8.5 6-8.5 6zm7 0V6l8.5 6-8.5 6z" />
      </svg>
    </button>
    <button id="prevEventBtn" class="control-btn hidden-control" disabled :title="t('controls.previousEvent')" @click="emit('prevEvent')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 12l6 4V8l-6 4z" />
      </svg>
    </button>
    <button id="nextEventBtn" class="control-btn hidden-control" disabled :title="t('controls.nextEvent')" @click="emit('nextEvent')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 12l-6-4v8l6-4z" />
      </svg>
    </button>
    <button id="screenshotBtn" class="control-btn hidden-control" disabled :title="t('controls.screenshot')" @click="emit('captureScreenshot')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9z"
        />
      </svg>
    </button>
    <button id="pipBtn" class="control-btn hidden-control" disabled style="display: none;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 7h-8v6h8V7z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  hasEvent: boolean;
  isPlaying: boolean;
  speed: string;
  isLooping: boolean;
  layout: string;
}>();

const emit = defineEmits<{
  (e: 'togglePlay'): void;
  (e: 'prevClip'): void;
  (e: 'nextClip'): void;
  (e: 'changeSpeed', speed: string): void;
  (e: 'toggleLoop'): void;
  (e: 'markIn'): void;
  (e: 'markOut'): void;
  (e: 'clearMarks'): void;
  (e: 'exportVideo'): void;
  (e: 'captureScreenshot'): void;
  (e: 'toggleEnhance'): void;
  (e: 'changeLayout', layout: string): void;
  (e: 'changeFocusCamera', cam: string): void;
  (e: 'resetLayout'): void;
  (e: 'frameBack'): void;
  (e: 'frameForward'): void;
  (e: 'prevEvent'): void;
  (e: 'nextEvent'): void;
}>();

const selectedSpeed = ref(props.speed || '1');
const selectedLayout = ref(props.layout || 'grid-2x2');
const focusCamera = ref('front');
const isExportDropdownOpen = ref(false);
const isMobileMoreOpen = ref(false);
const exportFormat = ref('mp4');
const privacyMode = ref(false);

const localeTick = ref(0);

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

function onScreenshotClick(): void {
  isExportDropdownOpen.value = false;
  emit('captureScreenshot');
}

function onExportVideoClick(): void {
  isExportDropdownOpen.value = false;
  emit('exportVideo');
}

function onLocaleChanged(): void {
  localeTick.value++;
}

onMounted(() => {
  window.addEventListener('localeChanged', onLocaleChanged);
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
});
</script>
