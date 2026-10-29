<template>
  <aside class="sidebar" id="sidebar" :style="sidebarStyle">
    <div
      class="sidebar-resize-handle"
      id="sidebarResizeHandle"
      :class="{ resizing: isResizing }"
      title="Drag to resize"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick="resetWidth"
    ></div>

    <div class="sidebar-header">
      <h2>
        <span>{{ t('sidebar.events') }}</span>
        <span id="eventCount" class="event-count">{{ eventCountText }}</span>
      </h2>
      <div id="eventStats" class="event-stats">{{ eventStatsText }}</div>
    </div>

    <!-- Drive Selector (multi-drive support) -->
    <div
      id="driveSelector"
      class="drive-selector"
      :class="{ hidden: !drives || drives.length === 0 }"
    >
      <div class="drive-selector-header">
        <select
          id="driveSelect"
          class="drive-select"
          v-model="selectedDrive"
          @change="emit('changeDrive', selectedDrive)"
        >
          <option value="">
            {{ t('sidebar.allDrives') }}
          </option>
          <option v-for="d in drives" :key="d.id" :value="d.id">
            {{ d.label || d.name || d.id }}
          </option>
        </select>
        <button
          id="manageDrivesBtn"
          class="drive-action-btn"
          :title="t('sidebar.manageDrives')"
          @click="emit('manageDrives')"
        >
          <Settings :size="16" />
        </button>
        <button
          id="addDriveBtn"
          class="drive-action-btn"
          :title="t('sidebar.addDrive')"
          @click="emit('addDrive')"
        >
          <Plus :size="16" />
        </button>
        <button
          id="refreshDrivesBtn"
          class="drive-action-btn"
          :title="t('sidebar.refreshDrives') || 'Refresh drives'"
          @click="emit('refreshDrives')"
        >
          <RefreshCw :size="16" />
        </button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="sidebar-tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'events' }"
        data-tab="events"
        @click="activeTab = 'events'"
      >
        {{ t('sidebar.events') }}
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'map' }"
        data-tab="map"
        @click="activeTab = 'map'"
      >
        {{ t('sidebar.map') }}
      </button>
    </div>

    <!-- Filter Panel -->
    <div id="filterPanel">
      <FilterPanel />
    </div>

    <!-- Folder Selector Button -->
    <button
      id="selectFolderBtn"
      class="select-folder-btn"
      :class="{ hidden: hasEvents }"
      @click="emit('selectFolder')"
    >
      <Folder :size="20" style="margin-right: 8px" />
      <span>{{
        t('sidebar.selectFolder')
      }}</span>
    </button>

    <!-- Backblaze B2 Button -->
    <button
      id="loadB2Btn"
      class="select-folder-btn b2-btn"
      :class="{ hidden: hasEvents }"
      style="background: #003399"
      @click="emit('loadB2')"
    >
      <Cloud :size="20" style="margin-right: 8px" />
      <span>Load from Backblaze B2</span>
    </button>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Events Tab -->
      <div
        id="eventsTab"
        class="tab-pane"
        :class="{ active: activeTab === 'events' }"
      >
        <EventList
          :events="events || []"
          :currentEvent="currentEvent"
          @selectEvent="emit('selectEvent', $event)"
        />
      </div>

      <!-- Map Tab -->
      <div
        id="mapTab"
        class="tab-pane"
        :class="{ active: activeTab === 'map' }"
      >
        <MapView
          :visible="activeTab === 'map'"
          @selectEvent="emit('selectEvent', $event)"
        />
      </div>
    </div>

    <!-- Bird's Eye View Panel -->
    <div
      id="birdsEyePanel"
      class="sidebar-panel collapsible"
      style="display: none"
    >
      <div class="sidebar-panel-header" id="birdsEyeHeader">
        <span class="panel-title">Bird's Eye View</span>
        <button class="panel-collapse-btn" aria-label="Toggle panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
        </button>
      </div>
      <div class="sidebar-panel-content" id="birdsEyeContent"></div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Cloud, Folder, Plus, RefreshCw, Settings } from 'lucide-vue-next';
import { useLocalStorage, useMediaQuery } from '@vueuse/core';
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';
import type { DriveInfo, TeslaCamEvent } from '../types';
import EventList from './EventList.vue';
import FilterPanel from './FilterPanel.vue';
import MapView from './MapView.vue';

const props = defineProps<{
  drives?: DriveInfo[];
  activeDriveId?: string;
  hasEvents: boolean;
  events?: TeslaCamEvent[];
  currentEvent?: TeslaCamEvent | null;
  eventCountText?: string;
  eventStatsText?: string;
}>();

const emit = defineEmits<{
  (e: 'changeDrive', driveId: string): void;
  (e: 'manageDrives'): void;
  (e: 'addDrive'): void;
  (e: 'refreshDrives'): void;
  (e: 'selectFolder'): void;
  (e: 'loadB2'): void;
  (e: 'selectEvent', event: TeslaCamEvent): void;
}>();

const STORAGE_KEY = 'teslacam_sidebar_width';
const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

const sidebarWidth = useLocalStorage<number>(STORAGE_KEY, DEFAULT_WIDTH);
const isResizing = ref(false);
const isMobile = useMediaQuery('(max-width: 768px)');

function resetWidth(): void {
  sidebarWidth.value = DEFAULT_WIDTH;
}

let startX = 0;
let startWidth = 0;

const sidebarStyle = computed(() => {
  if (isMobile.value) return undefined;
  return {
    width: `${sidebarWidth.value}px`,
    transition: isResizing.value ? 'none' : undefined,
  };
});

function onPointerDown(e: PointerEvent): void {
  if (isMobile.value || e.button !== 0) return;
  const target = e.currentTarget as HTMLElement | null;
  if (!target) return;

  target.setPointerCapture(e.pointerId);
  isResizing.value = true;
  startX = e.clientX;
  startWidth = sidebarWidth.value;
  document.body.classList.add('sidebar-resizing');
}

function onPointerMove(e: PointerEvent): void {
  if (!isResizing.value) return;
  const deltaX = e.clientX - startX;
  sidebarWidth.value = Math.max(
    MIN_WIDTH,
    Math.min(MAX_WIDTH, startWidth + deltaX)
  );
}

function onPointerUp(e: PointerEvent): void {
  if (!isResizing.value) return;
  const target = e.currentTarget as HTMLElement | null;
  if (target) {
    try {
      target.releasePointerCapture(e.pointerId);
    } catch (_e) {}
  }
  isResizing.value = false;
  document.body.classList.remove('sidebar-resizing');
}

const activeTab = ref<'events' | 'map'>('events');
const selectedDrive = ref(props.activeDriveId || '');

watch(
  () => props.activeDriveId,
  (newId) => {
    if (newId !== undefined) {
      selectedDrive.value = newId;
    }
  }
);

const { t } = useI18n();

onUnmounted(() => {
  document.body.classList.remove('sidebar-resizing');
});
</script>

<style scoped>
@reference "tailwindcss";

/* ==================== SELECT FOLDER BUTTON ==================== */
.select-folder-btn {
  @apply my-2 flex w-full cursor-pointer items-center justify-center rounded-lg border-none px-4 py-3.5 font-(family-name:--font-ui) text-[0.9rem] font-semibold tracking-[0.02em] text-(--bg-void) transition-all duration-250;
  background: linear-gradient(135deg, var(--accent) 0%, #0099cc 100%);
  box-shadow: 0 0 20px var(--accent-glow);
}

.select-folder-btn:hover {
  background: linear-gradient(
    135deg,
    var(--accent-hover) 0%,
    var(--accent) 100%
  );
  transform: translateY(-2px);
  box-shadow: 0 4px 30px var(--accent-glow);
}

.select-folder-btn.hidden {
  display: none;
}

/* ==================== TAB PANE ==================== */

.tab-pane {
  @apply hidden min-h-0 flex-col;
}

.tab-pane.active {
  @apply flex flex-1;
}

/* ==================== SIDEBAR ==================== */
.sidebar {
  @apply relative flex w-80 max-w-[600px] min-w-[200px] flex-col border-r border-(--border);
  background: linear-gradient(
    180deg,
    var(--bg-secondary) 0%,
    var(--bg-primary) 100%
  );
}

@media only screen and (max-width: 514px) {
  .sidebar {
    display: none !important;
    background: red;
  }
}

/* Sidebar resize handle — split across sidebar edge:
   2px inside sidebar (sits on scrollbar track's non-clickable outer edge)
   6px outside (into video grid gutter). Keeps scrollbar usable while giving
   the resize grip a reasonable hit target. */
.sidebar-resize-handle {
  @apply absolute top-0 right-[-6px] bottom-0 z-100 w-2 cursor-ew-resize bg-transparent transition-[background] duration-150;
  touch-action: none;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle.resizing {
  @apply bg-(--accent) opacity-50;
}

.sidebar-resize-handle::after {
  @apply absolute top-1/2 left-1/2 h-10 w-1 rounded-[2px] bg-(--text-muted) opacity-0 transition-opacity duration-150;
  content: '';
  transform: translate(-50%, -50%);
}

.sidebar-resize-handle:hover::after,
.sidebar-resize-handle.resizing::after {
  @apply opacity-80;
}

/* Prevent text selection while resizing */
body.sidebar-resizing {
  cursor: ew-resize !important;
  user-select: none !important;
}

body.sidebar-resizing * {
  cursor: ew-resize !important;
}

/* Accent line on sidebar edge */
.sidebar::after {
  @apply pointer-events-none absolute top-0 right-0 bottom-0 w-px opacity-20;
  content: '';
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--accent) 30%,
    var(--accent) 70%,
    transparent 100%
  );
}

.sidebar-header {
  @apply flex flex-wrap items-center gap-2 border-b border-(--border) p-4;
}

.sidebar-header h2 {
  @apply m-0 font-(family-name:--font-ui) text-[0.95rem] font-semibold tracking-[0.1em] text-(--text-secondary) uppercase;
}

/* ==================== SIDEBAR COLLAPSIBLE PANELS ==================== */
.sidebar-panel {
  @apply border-b border-(--border) bg-(--bg-secondary);
}

.sidebar-panel-header {
  @apply flex cursor-pointer items-center justify-between px-4 py-2.5 transition-[background-color] duration-150 select-none;
}

.sidebar-panel-header:hover {
  @apply bg-(--bg-tertiary);
}

.sidebar-panel-header .panel-title {
  @apply font-(family-name:--font-ui) text-[0.8rem] font-semibold tracking-[0.08em] text-(--text-secondary) uppercase;
}

.sidebar-panel-header .panel-collapse-btn {
  @apply flex cursor-pointer items-center justify-center bg-transparent p-[0.2rem] text-(--text-muted) border-none transition-[transform,color] duration-200;
}

.sidebar-panel-header .panel-collapse-btn:hover {
  @apply text-(--text-primary);
}

.sidebar-panel.collapsed .panel-collapse-btn {
  transform: rotate(-90deg);
}

.sidebar-panel-content {
  @apply overflow-hidden opacity-100 transition-[max-height,height,opacity,padding] duration-300;
}

.sidebar-panel.collapsed .sidebar-panel-content {
  max-height: 0 !important;
  height: 0 !important;
  opacity: 0;
  padding: 0 !important;
}

/* Bird's Eye View Panel */
#birdsEyeContent {
  @apply relative flex h-[200px] max-h-[200px] items-center justify-center;
}

#birdsEyeContent canvas {
  @apply size-full;
}

/* Telemetry Panel - height matches bottom controls pane (~200px) */
#telemetryContent {
  @apply flex h-[200px] max-h-[200px] flex-col p-1;
}

.sidebar .tab-content {
  @apply flex flex-1 flex-col overflow-hidden;
}

.sidebar .tab-pane {
  @apply overflow-hidden;
}

.sidebar .event-list {
  @apply h-full overflow-y-auto;
}

.event-count {
  @apply font-normal text-(--text-muted);
}

.event-stats {
  @apply w-full font-(family-name:--font-mono) text-xs tracking-[0.02em] text-(--text-muted);
}

/* Drive Selector (multi-drive support) */
.drive-selector {
  @apply border-b border-(--border) bg-(--bg-tertiary) px-4 py-2;
}

.drive-selector.hidden {
  display: none;
}

.drive-selector-header {
  @apply flex flex-wrap items-center gap-1;
  /* wrap to a second row when sidebar is narrow */
}

.drive-select {
  @apply min-w-0 flex-[1_1_120px] cursor-pointer rounded-md border border-(--border) bg-(--bg-primary) px-2 py-2 font-(family-name:--font-ui) text-[0.85rem] text-(--text-primary) transition-all duration-200;
  /* shrink-friendly: minimum 120px, grows to fill */
  /* allow it to shrink below its content width */
}

.drive-select:hover {
  @apply border-(--accent);
}

.drive-select:focus {
  @apply border-(--accent) outline-none;
  box-shadow: 0 0 0 2px var(--accent-subtle);
}

.drive-select option {
  @apply bg-(--bg-primary) p-2 text-(--text-primary);
}

.drive-action-btn {
  @apply flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-(--border) bg-(--bg-primary) p-1.5 text-(--text-muted) transition-[background,border-color,color] duration-150;
  /* don't let the icon buttons compress to nothing */
}

.drive-action-btn:hover {
  @apply border-(--accent) bg-(--accent-subtle) text-(--accent);
}

/* Drive color badge in select options */
.drive-option-badge {
  @apply mr-2 inline-block size-2 rounded-full align-middle;
}

/* Modal overlay */
.modal-overlay {
  @apply fixed inset-0 z-10000 flex items-center justify-center bg-black/70 p-4;
}

.modal {
  @apply flex max-h-[80vh] w-full flex-col overflow-hidden rounded-xl border border-(--border) bg-(--bg-secondary);
}

.modal-header {
  @apply flex items-center justify-between border-b border-(--border) px-5 py-4;
}

.modal-header h3 {
  @apply m-0 text-[1.1rem] text-(--text-primary);
}

.modal-close-btn {
  @apply flex cursor-pointer rounded bg-transparent p-1 text-(--text-muted) border-none transition-all duration-200;
}

.modal-close-btn:hover {
  @apply bg-(--bg-tertiary) text-(--text-primary);
}

.modal-content {
  @apply overflow-y-auto p-5;
}

/* Drive management modal */
.drive-management-modal {
  @apply max-w-[500px];
}

.drive-list {
  @apply mb-4 flex flex-col gap-3;
}

.drive-item {
  @apply flex items-center gap-3 rounded-lg border border-(--border) bg-(--bg-tertiary) p-3;
}

.drive-color-dot {
  @apply size-3 shrink-0 rounded-full;
}

.drive-color-picker {
  @apply relative shrink-0 cursor-pointer;
}

.drive-color-input {
  @apply absolute size-6 cursor-pointer opacity-0;
}

.drive-color-preview {
  @apply size-6 rounded-full border-2 border-(--border) transition-all duration-200;
}

.drive-color-picker:hover .drive-color-preview {
  @apply scale-110 border-(--accent);
}

.drive-label-input {
  @apply flex-1 rounded border border-transparent bg-(--bg-primary) px-2 py-1.5 font-(family-name:--font-ui) text-[0.85rem] text-(--text-primary);
}

.drive-label-input:hover {
  @apply border-(--border);
}

.drive-label-input:focus {
  @apply border-(--accent) outline-none;
}

.drive-event-count {
  @apply text-xs whitespace-nowrap text-(--text-muted);
  font-family: var(--font-mono);
}

.drive-remove-btn {
  @apply flex cursor-pointer items-center rounded border-none bg-transparent p-1 text-(--text-muted) transition-all duration-200;
}

.drive-remove-btn:hover {
  @apply bg-[rgba(255,82,82,0.1)] text-[#ff5252];
}

/* Drive Setup Dialog */
.drive-setup-modal {
  @apply max-w-[480px];
}

.drive-setup-modal .modal-content {
  @apply p-5;
}

.drive-setup-selected {
  @apply mb-4 flex items-center gap-2 rounded-lg bg-(--bg-tertiary) p-3 font-(family-name:--font-mono) text-[0.85rem] text-(--text-secondary);
}

.drive-setup-selected svg {
  @apply shrink-0 text-(--accent);
}

.drive-setup-tip {
  @apply mb-5 rounded-lg border border-(--border-accent) bg-(--accent-subtle) p-3.5;
}

.drive-setup-tip-header {
  @apply mb-2 flex items-center gap-2 text-[0.85rem] font-medium text-(--accent);
}

.drive-setup-tip ul {
  @apply m-0 pl-6 text-[0.8rem] leading-[1.6] text-(--text-secondary);
}

.drive-setup-tip li {
  @apply mb-1;
}

.drive-setup-form {
  @apply flex flex-col gap-4;
}

.drive-setup-field {
  @apply flex flex-col gap-1.5;
}

.drive-setup-field label {
  @apply text-[0.8rem] font-medium text-(--text-secondary);
}

.drive-setup-field input[type='text'],
.drive-setup-field select {
  @apply rounded-md border border-(--border) bg-(--bg-tertiary) px-3 py-2.5 font-(family-name:--font-ui) text-[0.9rem] text-(--text-primary);
}

.drive-setup-field input[type='text']:focus,
.drive-setup-field select:focus {
  @apply border-(--accent) outline-none;
}

.drive-setup-checkbox {
  @apply flex cursor-pointer items-center gap-2.5 rounded-md border border-(--border) bg-(--bg-tertiary) p-2.5 transition-all duration-200;
}

.drive-setup-checkbox:hover {
  @apply border-(--accent);
}

.drive-setup-checkbox input[type='checkbox'] {
  @apply h-[18px] w-[18px] cursor-pointer accent-(--accent);
}

.drive-setup-checkbox-content {
  @apply flex-1;
}

.drive-setup-checkbox-label {
  @apply text-[0.9rem] font-medium text-(--text-primary);
}

.drive-setup-checkbox-hint {
  @apply mt-0.5 text-xs text-(--text-muted);
}

.drive-setup-actions {
  @apply mt-2 flex gap-3;
}

.drive-setup-actions .btn {
  @apply flex-1 cursor-pointer rounded-md p-3 font-medium transition-all duration-200;
}

.drive-setup-actions .btn-secondary {
  @apply border border-(--border) bg-(--bg-tertiary) text-(--text-secondary);
}

.drive-setup-actions .btn-secondary:hover {
  @apply border-(--text-muted) text-(--text-primary);
}

.drive-setup-actions .btn-primary {
  @apply border-none bg-(--accent) text-(--bg-void);
}

.drive-setup-actions .btn-primary:hover {
  @apply bg-(--accent-hover);
}

/* Archive drive badge */
.drive-archive-badge {
  @apply mx-2 rounded-[3px] bg-(--warning) px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.5px] text-(--bg-void) uppercase;
}

.drive-item.is-archive {
  @apply opacity-70;
}

.drive-item.is-archive .drive-event-count {
  @apply text-(--warning);
}

.drive-sync-btn {
  @apply flex cursor-pointer items-center gap-1 rounded bg-(--accent) px-2.5 py-1.5 text-xs font-medium text-(--bg-void) border-none transition-all duration-200;
}

.drive-sync-btn:hover {
  @apply bg-(--accent-hover);
}

.drive-date-filter {
  @apply text-[0.7rem] text-(--text-muted);
  font-family: var(--font-mono);
}

/* Sidebar Tabs */
.sidebar-tabs {
  @apply flex gap-0 border-b border-(--border) bg-(--bg-primary);
}

.tab-btn {
  @apply relative flex-1 cursor-pointer border-none bg-transparent px-4 py-3 font-(family-name:--font-ui) text-[0.85rem] font-medium tracking-[0.08em] text-(--text-muted) uppercase transition-all duration-200;
}

.tab-btn:hover {
  @apply bg-(--bg-tertiary) text-(--text-secondary);
}

.tab-btn.active {
  @apply bg-(--bg-tertiary) text-(--accent);
}

.tab-btn.active::after {
  @apply absolute bottom-0 left-1/5 right-1/5 h-0.5 rounded-[1px] bg-(--accent);
  content: '';
  box-shadow: 0 0 10px var(--accent-glow);
}

/* ==================== AI Search (sidebar) ==================== */
/* AI Search panel theming — matches sibling .filter-panel so the sidebar
 * reads as one continuous surface. The original stylesheet referenced
 * --bg-panel / --bg-elev, which don't exist in the project's token set,
 * so it fell through to its literal fallbacks (#242424 / #2f2f2f) and
 * looked wrong against the actual theme (bg-primary is #0a0c12). */
.ai-search-panel {
  @apply border-b border-(--border) bg-(--bg-primary);
}

.ai-search-header {
  @apply flex cursor-pointer items-center justify-between bg-(--bg-primary) px-3 py-2 select-none;
}

.ai-search-header:hover {
  @apply bg-(--bg-elevated);
}

.ai-search-header-content {
  @apply flex items-center gap-1.5 text-[0.82rem] font-medium text-(--text-primary);
}

.ai-search-badge {
  @apply rounded-lg bg-(--accent) px-1.5 py-px text-[0.68rem] font-medium text-white;
}

/* Container holds the BETA pill + collapse chevron together so they
 * stay right-anchored regardless of label/badge width on the left. */
.ai-search-header-right {
  @apply flex shrink-0 items-center gap-2;
}

/* Outlined pill — readable but quiet so it doesn't fight the rest of
 * the sidebar. Subtle pulse to nudge attention without being loud. */
.ai-search-beta-pill {
  @apply cursor-help rounded-lg border border-[rgba(255,184,0,0.45)] bg-[rgba(255,184,0,0.08)] px-1.5 py-px text-[0.6rem] font-bold tracking-[0.08em] text-(--warning) uppercase leading-[1.3];
}

.ai-search-collapse-icon,
.collapse-icon-svg {
  @apply shrink-0 text-(--text-muted) transition-transform duration-[220ms] ease-in-out;
}

.ai-search-collapse-icon.collapsed,
.collapse-icon-svg.collapsed {
  transform: rotate(-90deg);
}

.ai-search-content {
  @apply max-h-0 overflow-hidden transition-[max-height] duration-[220ms] ease-in-out;
}

.ai-search-content.expanded {
  @apply max-h-[400px] border-t border-(--border) px-3 pt-2 pb-2.5;
}

.ai-search-row {
  @apply flex items-center gap-1.5;
}

.ai-search-input {
  @apply flex-1 rounded border border-(--border) bg-(--bg-tertiary) px-2.5 py-1.5 text-[0.85rem] text-(--text-primary);
}

.ai-search-input:focus {
  @apply outline outline-1 outline-(--accent);
}

.ai-search-clear {
  @apply h-7 w-7 cursor-pointer rounded border border-(--border) bg-transparent text-[1.1rem] leading-none text-(--text-muted);
}

.ai-search-clear:hover {
  @apply border-(--accent) text-(--text-primary);
}

.ai-search-chips {
  @apply mt-2 flex max-h-20 flex-wrap gap-1 overflow-y-auto;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.ai-search-chips::-webkit-scrollbar {
  width: 6px;
}

.ai-search-chips::-webkit-scrollbar-track {
  background: transparent;
}

.ai-search-chips::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.ai-search-chips::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

.ai-search-chip {
  @apply cursor-pointer rounded-xl border border-(--border) bg-(--bg-elevated) px-2 py-[3px] text-[0.72rem] whitespace-nowrap text-(--text-muted);
}

.ai-search-chip:hover {
  @apply border-(--accent) text-(--text-primary);
}

.ai-search-chip.active {
  @apply border-(--accent) bg-(--accent) text-white;
}

.ai-search-results-header {
  @apply mt-2 rounded bg-(--bg-tertiary) px-2 py-1.5 text-[0.75rem] leading-[1.4] text-(--text-muted);
  font-family: ui-monospace, monospace;
}

.event-item.ai-confident {
  @apply border-l-[3px] border-l-[#4ade80];
}

.event-item.ai-possible {
  @apply border-l-[3px] border-l-[#ffb800] opacity-80;
}

.event-ai-match-label {
  @apply mt-0.5 text-[0.7rem] text-(--text-muted);
  font-family: ui-monospace, monospace;
}

.event-ai-tags {
  @apply mt-1 flex flex-wrap gap-[3px];
}

.event-ai-tag {
  @apply rounded-lg bg-(--bg-tertiary) px-1.5 py-px text-[0.62rem] text-(--text-muted);
}

.ai-search-tier-divider {
  @apply border-b border-(--border) bg-(--bg-tertiary) px-3 py-2 text-[0.72rem];
  font-family: ui-monospace, monospace;
}

.ai-search-tier-confident {
  @apply text-[#4ade80];
}

.ai-search-tier-possible {
  @apply text-[#ffb800];
}

.ai-search-tier-none {
  @apply text-[#f87171];
}

/* Toast for first-run prompt — positioned TOP-right so it doesn't collide
   with the persistent indexing widget at bottom-right */
.ai-search-toast {
  @apply fixed top-16 right-5 z-10001 max-w-[360px] rounded-lg border border-(--accent) bg-(--bg-elevated) px-4 py-3.5 text-[0.88rem] leading-normal;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.ai-search-toast-title {
  @apply mb-1 font-semibold;
}

.ai-search-toast-actions {
  @apply mt-2.5 flex justify-end gap-2;
}

.ai-search-toast-btn {
  @apply cursor-pointer rounded border border-(--border) bg-transparent px-3 py-1 text-[0.82rem] text-(--text-primary);
}

.ai-search-toast-btn.primary {
  @apply border-(--accent) bg-(--accent) text-white;
}
</style>
