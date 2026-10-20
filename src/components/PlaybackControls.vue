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
      <input
        type="checkbox"
        id="loopCheckbox"
        :checked="isLooping"
        style="display: none"
      />
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

        <div
          id="exportDropdown"
          class="export-dropdown"
          :class="{ hidden: !isExportDropdownOpen }"
        >
          <div class="export-dropdown-header" data-i18n="export.header">
            {{ t('export.header') }}
          </div>

          <!-- Capture Screenshot -->
          <button
            class="export-option export-action-btn"
            data-action="screenshot"
            @click="onScreenshotClick"
          >
            <Camera :size="18" style="margin-right: 8px" />
            <span data-i18n="controls.screenshot">{{
              t('controls.screenshot')
            }}</span>
          </button>

          <!-- Export Video with Format -->
          <div class="export-video-group">
            <button
              class="export-option export-action-btn"
              data-camera="all"
              id="exportVideoBtn"
              @click="onExportVideoClick"
            >
              <Video :size="18" style="margin-right: 8px" />
              <span data-i18n="export.exportVideo">{{
                t('export.exportVideo')
              }}</span>
            </button>
          </div>

          <div class="export-dropdown-divider"></div>

          <!-- Export Settings -->
          <div class="export-settings-header">Settings</div>

          <label class="export-option export-checkbox-option">
            <input
              type="checkbox"
              id="privacyModeCheckbox"
              v-model="privacyMode"
            />
            <span
              class="export-checkbox-label"
              data-i18n="export.privacyMode"
              >{{ t('export.privacyMode') }}</span
            >
            <span
              class="export-option-hint"
              data-i18n="export.privacyModeHint"
              >{{ t('export.privacyModeHint') }}</span
            >
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
          <option value="grid-2x2" data-i18n="layouts.grid2x2">
            {{ t('layouts.grid2x2') }}
          </option>
          <option
            value="grid-3x2"
            data-i18n="layouts.grid3x2"
            class="pillar-layout-option"
            style="display: none"
          >
            3×2 Grid (6 Cam)
          </option>
          <option value="layout-6-3" data-i18n="layouts.layout63">
            {{ t('layouts.layout63') }}
          </option>
          <option value="layout-4-3" data-i18n="layouts.layout43">
            {{ t('layouts.layout43') }}
          </option>
          <option value="layout-all-16-9" data-i18n="layouts.all169">
            {{ t('layouts.all169') }}
          </option>
          <option value="layout-front-left" data-i18n="layouts.frontLeft">
            {{ t('layouts.frontLeft') }}
          </option>
          <option value="layout-front-right" data-i18n="layouts.frontRight">
            {{ t('layouts.frontRight') }}
          </option>
          <option
            value="layout-front-repeaters"
            data-i18n="layouts.frontRepeaters"
          >
            {{ t('layouts.frontRepeaters') }}
          </option>
          <option
            value="layout-front-pillars"
            class="pillar-layout-option"
            style="display: none"
          >
            Front + Pillars
          </option>
          <option
            value="layout-front-left-pillar"
            class="pillar-layout-option"
            style="display: none"
          >
            Front + Left Pillar
          </option>
          <option
            value="layout-front-right-pillar"
            class="pillar-layout-option"
            style="display: none"
          >
            Front + Right Pillar
          </option>
          <option value="layout-focus" data-i18n="layouts.focus">
            {{ t('layouts.focus') }}
          </option>
        </select>
      </div>

      <div
        class="layout-control"
        id="focusCameraControl"
        :style="{ display: selectedLayout === 'layout-focus' ? '' : 'none' }"
      >
        <select
          id="focusCameraSelect"
          class="layout-select"
          title="Focus Camera"
          v-model="focusCamera"
          @change="emit('changeFocusCamera', focusCamera)"
        >
          <option value="front" data-i18n="cameras.front">
            {{ t('cameras.front') }}
          </option>
          <option value="back" data-i18n="cameras.back">
            {{ t('cameras.back') }}
          </option>
          <option value="left_repeater" data-i18n="cameras.left">
            {{ t('cameras.left') }}
          </option>
          <option value="right_repeater" data-i18n="cameras.right">
            {{ t('cameras.right') }}
          </option>
          <option
            value="left_pillar"
            data-i18n="cameras.leftPillar"
            class="pillar-option"
            style="display: none"
          >
            Left Pillar
          </option>
          <option
            value="right_pillar"
            data-i18n="cameras.rightPillar"
            class="pillar-option"
            style="display: none"
          >
            Right Pillar
          </option>
        </select>
      </div>

      <button
        id="resetLayoutBtn"
        class="control-btn"
        title="Reset camera positions to layout defaults"
        style="display: none"
        @click="emit('resetLayout')"
      >
        <RotateCcw :size="20" />
      </button>

      <div class="sync-status">
        <span id="syncStatus" class="sync-indicator"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Bookmark,
  Camera,
  ChevronDown,
  Download,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sun,
  Video,
  X,
} from 'lucide-vue-next';
import { ref } from 'vue';
import { useI18n } from '../composables/useI18n';

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
const privacyMode = ref(false);

const { t } = useI18n();

function onScreenshotClick(): void {
  isExportDropdownOpen.value = false;
  emit('captureScreenshot');
}

function onExportVideoClick(): void {
  isExportDropdownOpen.value = false;
  emit('exportVideo');
}
</script>

<style scoped>
/* ==================== CONTROLS ==================== */
.controls {
  background: var(--bg-secondary);
  padding: 0.375rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.control-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.control-btn:hover:not(:disabled) {
  background: var(--bg-elevated);
  border-color: var(--accent);
  color: var(--accent);
  /* Removed box-shadow blur — 15px blur repaint was saturating main thread
     * during rapid mouse movement and starving video decode. Border-color
     * change reads visually nearly identical and is essentially free. */
}

.control-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.control-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.control-btn.active {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
  /* Tight glow — active buttons (e.g. Play while playing) would otherwise
     * hold a 15px blur shadow indefinitely, continuously paid on every paint. */
  box-shadow: 0 0 4px var(--accent-glow);
}

.control-btn svg {
  width: 18px;
  height: 18px;
}

/* Control Groups */
.control-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.control-group .control-btn {
  border: none;
  background: transparent;
  width: 32px;
  height: 32px;
}

.control-group .control-btn:hover:not(:disabled) {
  background: var(--bg-elevated);
  box-shadow: none;
}

.control-group-playback {
  flex-shrink: 0;
}

.control-group-export {
  flex-shrink: 0;
}

.control-group-view {
  flex-shrink: 0;
}

.control-group-overlays {
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  padding-left: 0.5rem;
  margin-left: 0.25rem;
}

.overlay-toggle-btn {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px;
  padding: 0;
  border-radius: 6px;
  position: relative;
}

.overlay-toggle-btn svg {
  width: 18px;
  height: 18px;
}

.overlay-toggle-btn.active {
  background: var(--accent);
  color: #fff;
}

.overlay-toggle-btn.active:hover:not(:disabled) {
  background: var(--accent);
  filter: brightness(1.1);
}

/* Export dropdown enhancements */
.export-dropdown-divider {
  height: 1px;
  background: var(--border);
  margin: 0.5rem 0;
}

.export-option svg {
  flex-shrink: 0;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Loop button active state */
#loopBtn.active {
  color: var(--accent);
  background: var(--accent-subtle);
}

.event-nav-separator {
  width: 1px;
  height: 28px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--border) 50%,
    transparent 100%
  );
  margin: 0 0.375rem;
}

/* Export Dropdown */
.export-dropdown-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.export-dropdown-container .dropdown-toggle {
  padding: 0.375rem;
  min-width: 28px;
  margin-left: -1px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.export-dropdown-container #exportBtn {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.export-dropdown {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  min-width: 260px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  margin-bottom: 10px;
}

.export-dropdown.hidden {
  display: none;
}

.export-dropdown-header {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: 0.625rem 0.875rem 0.375rem;
  border-bottom: 1px solid var(--border);
}

.export-option {
  display: block;
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.export-option:hover {
  background: var(--accent-subtle);
  color: var(--accent);
}

/* Export format row */
.export-format-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  cursor: default;
}

.export-format-row:hover {
  background: transparent;
  color: inherit;
}

.export-format-row label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.export-format-select {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.export-format-select:hover {
  border-color: var(--accent);
}

.export-format-select:focus {
  outline: none;
  border-color: var(--accent);
}

/* Export action buttons (Screenshot, Export Video, Insurance Report) */
.export-action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: calc(100% - 0.75rem);
  margin: 0.25rem 0.375rem;
  padding: 0.6rem 0.75rem;
  background: linear-gradient(
    135deg,
    rgba(74, 158, 255, 0.08),
    rgba(74, 158, 255, 0.02)
  );
  border: none;
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.export-action-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(74, 158, 255, 0.15),
    rgba(74, 158, 255, 0.05)
  );
}

.export-action-btn svg {
  color: var(--accent);
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

/* Export Video + Format group */
.export-video-group {
  display: flex;
  align-items: stretch;
  margin: 0.25rem 0.375rem;
  width: calc(100% - 0.75rem);
  border-radius: 6px;
  overflow: hidden;
}

.export-video-group .export-action-btn {
  flex: 1;
  margin: 0;
  width: auto;
  border-radius: 0;
}

.export-video-group .export-format-select {
  background: var(--bg-tertiary);
  border: none;
  border-left: 1px solid var(--border);
  border-radius: 0;
  color: var(--text-secondary);
  padding: 0 0.625rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.export-video-group .export-format-select:hover {
  background: var(--accent-subtle);
  color: var(--accent);
}

.export-video-group .export-format-select:focus {
  outline: none;
  background: var(--accent-subtle);
}

/* Style select dropdown options for dark theme */
select,
.export-format-select,
.setting-select,
.drive-select,
.speed-select,
.layout-select,
.mobile-layout-select {
  color-scheme: dark;
  accent-color: #00d4ff;
}

select option,
.export-format-select option,
.setting-select option,
.drive-select option,
.speed-select option,
.layout-select option,
.mobile-layout-select option {
  background-color: #161a24 !important;
  color: #e8eaed !important;
  padding: 0.5rem;
}

/* Override browser's native selection highlight for checked options */
select option:checked,
select option:active,
.export-format-select option:checked,
.export-format-select option:active,
.setting-select option:checked,
.setting-select option:active {
  background: #0d4a5a !important;
  background-color: #0d4a5a !important;
  color: #00d4ff !important;
  -webkit-text-fill-color: #00d4ff !important;
  font-weight: 500;
  box-shadow: 0 0 10px 100px #0d4a5a inset !important;
}

select option:hover,
.export-format-select option:hover,
.setting-select option:hover {
  background-color: rgba(0, 212, 255, 0.2) !important;
  color: #00d4ff !important;
}

/* GIF export warning message */
.gif-warning {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.25rem 0.5rem;
  padding: 0.375rem 0.5rem;
  background: rgba(255, 184, 0, 0.15);
  border: 1px solid rgba(255, 184, 0, 0.3);
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--warning);
}

.gif-warning.hidden {
  display: none;
}

.gif-warning-icon {
  font-size: 0.85rem;
}

/* Export settings section */
.export-settings-header {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: 0.4rem 0.75rem 0.2rem;
  margin-top: 0.125rem;
}

/* Export checkbox options */
.export-checkbox-option {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: calc(100% - 0.75rem);
  margin: 0.25rem 0.375rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.export-checkbox-option:hover {
  background: var(--accent-subtle);
}

.export-checkbox-option input[type='checkbox'] {
  display: none;
}

.export-checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
}

.export-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-size: 0.8rem;
  white-space: nowrap;
}

.export-checkbox-label::before {
  content: '';
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--text-muted);
  border-radius: 3px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.export-checkbox-option input:checked + .export-checkbox-label::before {
  background: var(--accent);
  border-color: var(--accent);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
  background-size: 10px;
  background-repeat: no-repeat;
  background-position: center;
}

.export-checkbox-option:hover .export-checkbox-label::before {
  border-color: var(--accent);
}

.export-option-hint {
  font-size: 0.65rem;
  color: var(--text-muted);
  line-height: 1.2;
  white-space: nowrap;
  text-align: right;
  flex-shrink: 0;
}

/* Privacy mode checkbox option (legacy - keep for compatibility) */
.privacy-mode-option {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.625rem 0.875rem;
  cursor: pointer;
  border-bottom: none !important;
}

.privacy-mode-option input[type='checkbox'] {
  display: none;
}

.privacy-mode-option > span:first-of-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
  font-size: 0.85rem;
}

.privacy-mode-option > span:first-of-type::before {
  content: '';
  width: 16px;
  height: 16px;
  border: 2px solid var(--text-muted);
  border-radius: 3px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.privacy-mode-option input:checked + span::before {
  background: var(--accent);
  border-color: var(--accent);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
  background-size: 12px;
  background-repeat: no-repeat;
  background-position: center;
}

.privacy-mode-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-left: 24px;
}

.privacy-mode-option:hover {
  background: var(--accent-subtle);
}

.privacy-mode-option:hover > span:first-of-type::before {
  border-color: var(--accent);
}

/* Layout name on second line in export dropdown */
.export-option .layout-name-line {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.125rem;
}

/* Speed & Layout Controls */
.speed-control,
.layout-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.75rem;
  flex-shrink: 0;
}

.speed-label,
.layout-label {
  font-family: var(--font-ui);
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.speed-select,
.layout-select {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.speed-select:hover:not(:disabled),
.layout-select:hover:not(:disabled) {
  background: var(--bg-elevated);
  border-color: var(--border-accent);
}

.speed-select:focus,
.layout-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}

.speed-select:disabled,
.layout-select:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.loop-control {
  display: flex;
  align-items: center;
  margin-left: 0.75rem;
  flex-shrink: 0;
}

.loop-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.loop-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--accent);
}

.loop-label input[type='checkbox']:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.loop-label:has(input:disabled) {
  cursor: not-allowed;
  opacity: 0.4;
}

.sync-status {
  margin-left: auto;
  position: relative;
}

.sync-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--text-muted);
  cursor: help;
  transition: all 0.3s ease;
}

.sync-indicator.synced {
  background-color: var(--success);
  box-shadow: 0 0 12px var(--success-glow);
  animation: pulse-success 2s ease-in-out infinite;
}

.sync-indicator.drifted {
  background-color: var(--warning);
  box-shadow: 0 0 12px var(--warning-glow);
  animation: pulse-warning 1s ease-in-out infinite;
}

/* Watchdog recovery state — cyan/blue so it's visually distinct from the
   amber "drifted" state. Fires briefly when a micro-seek unsticks a camera
   from GPU overlay starvation. */
.sync-indicator.recovering {
  background-color: #06b6d4;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.55);
  animation: pulse-recovering 0.6s ease-in-out infinite;
}

@keyframes pulse-success {
  0%,
  100% {
    box-shadow: 0 0 8px var(--success-glow);
  }

  50% {
    box-shadow: 0 0 16px var(--success);
  }
}

@keyframes pulse-warning {
  0%,
  100% {
    box-shadow: 0 0 8px var(--warning-glow);
  }

  50% {
    box-shadow: 0 0 16px var(--warning);
  }
}

@keyframes pulse-recovering {
  0%,
  100% {
    box-shadow: 0 0 6px rgba(6, 182, 212, 0.4);
  }

  50% {
    box-shadow: 0 0 18px rgba(6, 182, 212, 0.9);
  }
}

.sync-status::before {
  content: 'Sync: ' attr(data-status);
  position: absolute;
  bottom: 100%;
  right: 0;
  background: var(--glass);
  backdrop-filter: blur(10px);
  color: var(--text-primary);
  padding: 0.5rem 0.875rem;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  margin-bottom: 0.5rem;
  border: 1px solid var(--border);
}

.sync-status:hover::before {
  opacity: 1;
}
</style>
