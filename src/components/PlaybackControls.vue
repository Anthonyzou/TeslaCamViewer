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
        <Play
          class="play-icon"
          :size="24"
          :style="{ display: isPlaying ? 'none' : '' }"
          aria-hidden="true"
        />
        <Pause
          class="pause-icon"
          :size="24"
          :style="{ display: isPlaying ? '' : 'none' }"
          aria-hidden="true"
        />
      </button>

      <button
        id="prevClipBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.previousClip')"
        @click="emit('prevClip')"
      >
        <SkipBack :size="24" />
      </button>

      <button
        id="nextClipBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.nextClip')"
        @click="emit('nextClip')"
      >
        <SkipForward :size="24" />
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
        <Repeat :size="20" />
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
        <Bookmark :size="20" color="#4caf50" />
      </button>

      <button
        id="markOutBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.markOut')"
        @click="emit('markOut')"
      >
        <Bookmark :size="20" color="#f44336" />
      </button>

      <button
        id="clearMarksBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.clearMarks')"
        @click="emit('clearMarks')"
      >
        <X :size="20" />
      </button>

      <div class="export-dropdown-container">
        <button
          id="exportBtn"
          class="control-btn export-main-btn"
          :disabled="!hasEvent"
          :title="t('controls.export')"
          @click="emit('exportVideo')"
        >
          <Download :size="20" />
        </button>

        <button
          id="exportDropdownBtn"
          class="control-btn dropdown-toggle"
          :disabled="!hasEvent"
          :title="t('controls.exportOptions')"
          @click="isExportDropdownOpen = !isExportDropdownOpen"
        >
          <ChevronDown :size="14" />
        </button>

        <div id="exportDropdown" class="export-dropdown" :class="{ hidden: !isExportDropdownOpen }">
          <div class="export-dropdown-header" data-i18n="export.header">{{ t('export.header') }}</div>

          <!-- Capture Screenshot -->
          <button
            class="export-option export-action-btn"
            data-action="screenshot"
            @click="onScreenshotClick"
          >
            <Camera :size="18" style="margin-right: 8px;" />
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
              <Video :size="18" style="margin-right: 8px;" />
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
        <Sun :size="20" />
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
        <RotateCcw :size="20" />
      </button>

      <div class="sync-status">
        <span id="syncStatus" class="sync-indicator"></span>
      </div>
    </div>

    <!-- Mobile More Menu -->
    <div class="control-group control-group-mobile-more">
      <div class="mobile-more-container">
        <button id="mobileMoreBtn" class="control-btn" title="More Options" @click="isMobileMoreOpen = !isMobileMoreOpen">
          <MoreVertical :size="20" />
        </button>
        <div id="mobileMoreMenu" class="mobile-more-menu" :class="{ hidden: !isMobileMoreOpen }">
          <div class="mobile-more-section">
            <div class="mobile-more-label">View</div>
            <button class="mobile-more-option" data-action="enhance" @click="emit('toggleEnhance')">
              <Sun :size="18" style="margin-right: 8px;" />
              <span>Enhancement</span>
            </button>
            <div class="mobile-more-option mobile-layout-selector">
              <LayoutGrid :size="18" style="margin-right: 8px;" />
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
              <Camera :size="18" style="margin-right: 8px;" />
              <span>Screenshot</span>
            </button>
            <button class="mobile-more-option" data-action="export-video" @click="emit('exportVideo')">
              <Video :size="18" style="margin-right: 8px;" />
              <span>Export Video</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden buttons kept for keyboard shortcuts / compatibility -->
    <button id="frameBackBtn" class="control-btn hidden-control" disabled :title="t('controls.previousFrame')" @click="emit('frameBack')">
      <ChevronLeft :size="20" />
    </button>
    <button id="frameForwardBtn" class="control-btn hidden-control" disabled :title="t('controls.nextFrame')" @click="emit('frameForward')">
      <ChevronRight :size="20" />
    </button>
    <button id="prevEventBtn" class="control-btn hidden-control" disabled :title="t('controls.previousEvent')" @click="emit('prevEvent')">
      <ArrowLeft :size="20" />
    </button>
    <button id="nextEventBtn" class="control-btn hidden-control" disabled :title="t('controls.nextEvent')" @click="emit('nextEvent')">
      <ArrowRight :size="20" />
    </button>
    <button id="screenshotBtn" class="control-btn hidden-control" disabled :title="t('controls.screenshot')" @click="emit('captureScreenshot')">
      <Camera :size="20" />
    </button>
    <button id="pipBtn" class="control-btn hidden-control" disabled style="display: none;">
      <PictureInPicture2 :size="20" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Bookmark,
  X,
  Download,
  ChevronDown,
  Camera,
  Video,
  Sun,
  RotateCcw,
  MoreVertical,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  PictureInPicture2,
} from 'lucide-vue-next';

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
  (e: 'toggleEnhance'): void;
  (e: 'changeLayout', layout: string): void;
  (e: 'changeFocusCamera', camera: string): void;
  (e: 'resetLayout'): void;
  (e: 'frameBack'): void;
  (e: 'frameForward'): void;
  (e: 'prevEvent'): void;
  (e: 'nextEvent'): void;
  (e: 'captureScreenshot'): void;
}>();

const selectedSpeed = ref(props.speed || '1');
const selectedLayout = ref(props.layout || 'layout-6-3');
const focusCamera = ref('front');
const isExportDropdownOpen = ref(false);
const isMobileMoreOpen = ref(false);
const exportFormat = ref('webm');
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
