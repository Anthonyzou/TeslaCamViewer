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
        class="hidden"
        :checked="isLooping"
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
        <StepForward :size="20" color="#4caf50" />
      </button>

      <button
        id="markOutBtn"
        class="control-btn"
        :disabled="!hasEvent"
        :title="t('controls.markOut')"
        @click="emit('markOut')"
      >
        <StepBack :size="20" color="#f44336" />
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
      </div>
    </div>

    <div
      id="exportDropdown"
      class="export-dropdown"
      :class="{ hidden: !isExportDropdownOpen }"
    >
      <div class="export-dropdown-header">
        {{ t('export.header') }}
      </div>

      <!-- Capture Screenshot -->
      <button
        class="export-option export-action-btn"
        data-action="screenshot"
        @click="onScreenshotClick"
      >
        <Camera :size="18" class="icon-mr-2" />
        <span>{{ t('controls.screenshot') }}</span>
      </button>

      <!-- Export Video with Format -->
      <div class="export-video-group">
        <button
          class="export-option export-action-btn"
          data-camera="all"
          id="exportVideoBtn"
          @click="onExportVideoClick"
        >
          <Video :size="18" class="icon-mr-2" />
          <span>{{ t('export.exportVideo') }}</span>
        </button>
      </div>
      <div class="export-video-group">
        <button
          class="export-option export-action-btn"
          data-camera="all"
          id="exportVideoBtn"
          @click="emit('clearMarks')"
        >
          <X :size="18" class="icon-mr-2" />
          <span>{{ t('controls.clearMarks') }}</span>
        </button>
      </div>

      <div class="export-dropdown-divider"></div>

      <!-- Export Settings -->
      <div class="export-settings-header">Settings</div>

      <label class="export-option export-checkbox-option">
        <input type="checkbox" id="privacyModeCheckbox" v-model="privacyMode" />
        <span class="export-checkbox-label">{{ t('export.privacyMode') }}</span>
        <span class="export-option-hint">{{
          t('export.privacyModeHint')
        }}</span>
      </label>
    </div>
    <!-- View Controls Group -->
    <div class="control-group control-group-view">
      <div class="layout-control">
        <select
          id="layoutSelect"
          class="layout-select"
          title="Layout"
          v-model="selectedLayout"
          @change="emit('changeLayout', selectedLayout)"
        >
          <option value="grid-2x2">
            {{ t('layouts.grid2x2') }}
          </option>
          <option
            value="grid-3x2"
            class="pillar-layout-option hidden"
          >
            3×2 Grid (6 Cam)
          </option>
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
          <option
            value="layout-front-pillars"
            class="pillar-layout-option hidden"
          >
            Front + Pillars
          </option>
          <option
            value="layout-front-left-pillar"
            class="pillar-layout-option hidden"
          >
            Front + Left Pillar
          </option>
          <option
            value="layout-front-right-pillar"
            class="pillar-layout-option hidden"
          >
            Front + Right Pillar
          </option>
          <option value="layout-focus">
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
          <option value="front">
            {{ t('cameras.front') }}
          </option>
          <option value="back">
            {{ t('cameras.back') }}
          </option>
          <option value="left_repeater">
            {{ t('cameras.left_repeater') }}
          </option>
          <option value="right_repeater">
            {{ t('cameras.right_repeater') }}
          </option>
          <option value="left_pillar">
            {{ t('cameras.left_pillar') }}
          </option>
          <option value="right_pillar">
            {{ t('cameras.right_pillar') }}
          </option>
        </select>
      </div>

      <button
        id="resetLayoutBtn"
        class="control-btn hidden"
        title="Reset camera positions to layout defaults"
        @click="emit('resetLayout')"
      >
        <RotateCcw :size="20" />
      </button>

      <!-- <div class="sync-status">
        <span id="syncStatus" class="sync-indicator"></span>
      </div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Camera,
  ChevronDown,
  Download,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Video,
  X,
} from 'lucide-vue-next';
import { ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';

const props = withDefaults(
  defineProps<{
    hasEvent?: boolean;
    isPlaying?: boolean;
    speed?: string;
    isLooping?: boolean;
    layout?: string;
    focusCamera?: string | null;
  }>(),
  {
    hasEvent: false,
    isPlaying: false,
    speed: '1',
    isLooping: false,
    layout: 'layout-6-3',
    focusCamera: 'front',
  }
);

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
const focusCamera = ref(props.focusCamera || 'front');
const isExportDropdownOpen = ref(false);
const privacyMode = ref(false);

watch(
  () => props.layout,
  (l) => {
    if (l) selectedLayout.value = l;
  }
);

watch(
  () => props.focusCamera,
  (c) => {
    if (c) focusCamera.value = c;
  }
);

watch(
  () => props.speed,
  (s) => {
    if (s) selectedSpeed.value = s;
  }
);

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
@reference "tailwindcss";

/* ==================== CONTROLS ==================== */
.controls {
  @apply relative flex flex-wrap items-center justify-center gap-2 bg-(--bg-secondary) px-4 py-1.5;
}

.control-btn {
  @apply flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-(--border) bg-(--bg-tertiary) text-(--text-secondary) transition-all duration-200;
}

.control-btn:hover:not(:disabled) {
  @apply border-(--accent) bg-(--bg-elevated) text-(--accent);
  /* Removed box-shadow blur — 15px blur repaint was saturating main thread
     * during rapid mouse movement and starving video decode. Border-color
     * change reads visually nearly identical and is essentially free. */
}

.control-btn:active:not(:disabled) {
  @apply scale-95;
}

.control-btn:disabled {
  @apply cursor-not-allowed opacity-25;
}

.control-btn.active {
  @apply border-(--accent) bg-(--accent-subtle) text-(--accent);
  /* Tight glow — active buttons (e.g. Play while playing) would otherwise
     * hold a 15px blur shadow indefinitely, continuously paid on every paint. */
  box-shadow: 0 0 4px var(--accent-glow);
}

.control-btn svg {
  @apply size-[18px];
}

/* Control Groups */
.control-group {
  @apply flex items-center gap-1 rounded-lg border border-(--border) bg-(--bg-tertiary) px-1.5 py-0.5;
}

.control-group .control-btn {
  @apply size-8 border-none bg-transparent;
}

.control-group .control-btn:hover:not(:disabled) {
  @apply bg-(--bg-elevated);
  box-shadow: none;
}

.control-group-playback {
  @apply shrink-0;
}

.control-group-export {
  @apply shrink-0;
}

.control-group-view {
  @apply shrink-0;
}

.control-group-overlays {
  @apply ml-1 shrink-0 border-l border-(--border) pl-2;
}

.overlay-toggle-btn {
  @apply relative min-w-8 rounded-md p-0;
  width: 32px !important;
  height: 32px !important;
}

.overlay-toggle-btn svg {
  @apply size-[18px];
}

.overlay-toggle-btn.active {
  @apply bg-(--accent) text-white;
}

.overlay-toggle-btn.active:hover:not(:disabled) {
  @apply bg-(--accent) brightness-110;
}

/* Export dropdown enhancements */
.export-dropdown-divider {
  @apply my-2 h-px bg-(--border);
}

.export-option svg {
  @apply shrink-0;
}

.export-option {
  @apply flex items-center gap-2;
}

/* Loop button active state */
#loopBtn.active {
  @apply bg-(--accent-subtle) text-(--accent);
}

.event-nav-separator {
  @apply mx-1.5 h-7 w-px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--border) 50%,
    transparent 100%
  );
}

/* Export Dropdown */
.export-dropdown-container {
  @apply relative inline-flex items-center;
}

.export-dropdown-container .dropdown-toggle {
  @apply ml-[-1px] min-w-7 rounded-l-none p-1.5;
}

.export-dropdown-container #exportBtn {
  @apply rounded-r-none;
}

.export-dropdown {
  @apply absolute bottom-full left-1/2 z-1000 mb-2.5 min-w-[260px] -translate-x-1/2 overflow-hidden rounded-[10px] border border-(--glass-border) bg-(--glass) shadow-(--shadow-lg) backdrop-blur-[20px];
  -webkit-backdrop-filter: blur(20px);
}

.export-dropdown.hidden {
  @apply hidden;
}

.export-dropdown-header {
  @apply border-b border-(--border) px-3.5 pt-2.5 pb-1.5 text-[0.7rem] tracking-[0.08em] text-(--text-muted) uppercase;
}

.export-option {
  @apply block w-full cursor-pointer border-none bg-transparent px-3.5 py-2.5 text-left text-[0.85rem] text-(--text-primary) transition-all duration-150;
}

.export-option:hover {
  @apply bg-(--accent-subtle) text-(--accent);
}

/* Export format row */
.export-format-row {
  @apply flex cursor-default items-center justify-between gap-2;
}

.export-format-row:hover {
  @apply bg-transparent text-inherit;
}

.export-format-row label {
  @apply text-[0.8rem] text-(--text-secondary);
}

.export-format-select {
  @apply cursor-pointer rounded border border-(--border) bg-(--bg-tertiary) px-2 py-1 text-[0.8rem] text-(--text-primary);
}

.export-format-select:hover {
  @apply border-(--accent);
}

.export-format-select:focus {
  @apply border-(--accent) outline-none;
}

/* Export action buttons (Screenshot, Export Video, Insurance Report) */
.export-action-btn {
  @apply mx-1.5 my-1 flex w-[calc(100%-0.75rem)] cursor-pointer items-center gap-2 rounded-md border-none px-3 py-2.5 text-left font-[inherit] text-[0.8rem] text-(--text-primary) transition-all duration-150;
  background: linear-gradient(
    135deg,
    rgba(74, 158, 255, 0.08),
    rgba(74, 158, 255, 0.02)
  );
  border-left: 3px solid var(--accent);
}

.export-action-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(74, 158, 255, 0.15),
    rgba(74, 158, 255, 0.05)
  );
}

.export-action-btn svg {
  @apply size-4 shrink-0 text-(--accent);
}

/* Export Video + Format group */
.export-video-group {
  @apply mx-1.5 my-1 flex w-[calc(100%-0.75rem)] items-stretch overflow-hidden rounded-md;
}

.export-video-group .export-action-btn {
  @apply m-0 w-auto flex-1 rounded-none;
}

.export-video-group .export-format-select {
  @apply rounded-none border-none border-l border-(--border) bg-(--bg-tertiary) px-2.5 py-0 text-xs text-(--text-secondary) cursor-pointer transition-all duration-150;
}

.export-video-group .export-format-select:hover {
  @apply bg-(--accent-subtle) text-(--accent);
}

.export-video-group .export-format-select:focus {
  @apply bg-(--accent-subtle) outline-none;
}

/* Export settings section */
.export-settings-header {
  @apply mt-0.5 px-3 pt-1.5 pb-0.5 text-[0.6rem] tracking-[0.08em] text-(--text-muted) uppercase;
}

/* Export checkbox options */
.export-checkbox-option {
  @apply mx-1.5 my-1 flex w-[calc(100%-0.75rem)] cursor-pointer flex-row items-center justify-between gap-2 rounded-md px-3 py-1.5 transition-[background] duration-150;
}

.export-checkbox-option:hover {
  @apply bg-(--accent-subtle);
}

.export-checkbox-option input[type='checkbox'] {
  @apply hidden;
}

.export-checkbox-content {
  @apply flex flex-1 flex-col gap-0.5;
}

.export-checkbox-label {
  @apply flex items-center gap-2 text-[0.8rem] whitespace-nowrap text-(--text-primary);
}

.export-checkbox-label::before {
  @apply size-3.5 shrink-0 rounded-[3px] border-[1.5px] border-(--text-muted) transition-all duration-150;
  content: '';
}

.export-checkbox-option input:checked + .export-checkbox-label::before {
  @apply border-(--accent) bg-(--accent) bg-no-repeat bg-center;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
  background-size: 10px;
}

.export-checkbox-option:hover .export-checkbox-label::before {
  @apply border-(--accent);
}

.export-option-hint {
  @apply shrink-0 text-right text-[0.65rem] leading-[1.2] whitespace-nowrap text-(--text-muted);
}

/* Privacy mode checkbox option (legacy - keep for compatibility) */
.privacy-mode-option {
  @apply flex cursor-pointer flex-col gap-1 px-3.5 py-2.5;
  border-bottom: none !important;
}

.privacy-mode-option input[type='checkbox'] {
  @apply hidden;
}

.privacy-mode-option > span:first-of-type {
  @apply flex items-center gap-2 text-[0.85rem] text-(--text-primary);
}

.privacy-mode-option > span:first-of-type::before {
  @apply size-4 shrink-0 rounded-[3px] border-2 border-(--text-muted) transition-all duration-150;
  content: '';
}

.privacy-mode-option input:checked + span::before {
  @apply border-(--accent) bg-(--accent) bg-no-repeat bg-center;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
  background-size: 12px;
}

.privacy-mode-hint {
  @apply ml-6 text-[0.7rem] text-(--text-muted);
}

.privacy-mode-option:hover {
  @apply bg-(--accent-subtle);
}

.privacy-mode-option:hover > span:first-of-type::before {
  @apply border-(--accent);
}

/* Layout name on second line in export dropdown */
.export-option .layout-name-line {
  @apply mt-0.5 block text-xs text-(--text-secondary);
}

/* Speed & Layout Controls */
.speed-control,
.layout-control {
  @apply flex shrink-0 items-center gap-2;
}

.speed-label,
.layout-label {
  @apply font-(family-name:--font-ui) text-xs tracking-[0.05em] text-(--text-muted) uppercase;
}

.speed-select,
.layout-select {
  @apply cursor-pointer rounded-md border border-(--border) bg-(--bg-tertiary) px-3 py-2 font-(family-name:--font-mono) text-[0.8rem] text-(--text-primary) outline-none transition-all duration-200;
}

.speed-select:hover:not(:disabled),
.layout-select:hover:not(:disabled) {
  @apply border-(--border-accent) bg-(--bg-elevated);
}

.speed-select:focus,
.layout-select:focus {
  @apply border-(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}

.speed-select:disabled,
.layout-select:disabled {
  @apply cursor-not-allowed opacity-25;
}

.loop-control {
  @apply ml-3 flex shrink-0 items-center;
}

.loop-label {
  @apply flex cursor-pointer items-center gap-2 font-(family-name:--font-ui) text-xs tracking-[0.05em] text-(--text-muted) uppercase select-none;
}

.loop-label input[type='checkbox'] {
  @apply size-4 cursor-pointer accent-(--accent);
}

.loop-label input[type='checkbox']:disabled {
  @apply cursor-not-allowed opacity-25;
}

.loop-label:has(input:disabled) {
  @apply cursor-not-allowed opacity-40;
}

.sync-status {
  @apply relative ml-auto;
}

.sync-indicator {
  @apply inline-block size-2.5 cursor-help rounded-full bg-(--text-muted) transition-all duration-300;
}

.sync-indicator.synced {
  @apply bg-(--success);
  box-shadow: 0 0 12px var(--success-glow);
  animation: pulse-success 2s ease-in-out infinite;
}

.sync-indicator.drifted {
  @apply bg-(--warning);
  box-shadow: 0 0 12px var(--warning-glow);
  animation: pulse-warning 1s ease-in-out infinite;
}

/* Watchdog recovery state — cyan/blue so it's visually distinct from the
   amber "drifted" state. Fires briefly when a micro-seek unsticks a camera
   from GPU overlay starvation. */
.sync-indicator.recovering {
  @apply bg-[#06b6d4];
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
  @apply absolute right-0 bottom-full mb-2 rounded-md border border-(--border) bg-(--glass) px-3.5 py-2 font-(family-name:--font-mono) text-xs whitespace-nowrap text-(--text-primary) opacity-0 transition-opacity duration-200 pointer-events-none backdrop-blur-[10px];
  content: 'Sync: ' attr(data-status);
}

.sync-status:hover::before {
  @apply opacity-100;
}

/* GIF export warning message */
.gif-warning {
  @apply mx-2 my-1 flex items-center gap-1.5 rounded border border-[rgba(255,184,0,0.3)] bg-[rgba(255,184,0,0.15)] px-2 py-1.5 text-[0.7rem] text-(--warning);
}

.gif-warning.hidden {
  @apply hidden;
}

.gif-warning-icon {
  @apply text-[0.85rem];
}
</style>

<style>
@reference "tailwindcss";

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
</style>
