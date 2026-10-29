<template>
  <aside class="sidebar" id="sidebar" :style="sidebarStyle">
    <div class="sidebar-resize-handle" id="sidebarResizeHandle" :class="{ resizing: isResizing }" title="Drag to resize"
      @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp"
      @dblclick="resetWidth"></div>

    <div class="sidebar-header">
      <h2>
        <span>{{ t('sidebar.events') }}</span>
        <span id="eventCount" class="event-count">{{ eventCountText }}</span>
      </h2>
      <div id="eventStats" class="event-stats">{{ eventStatsText }}</div>
    </div>

    <!-- Drive Selector (multi-drive support) -->
    <div id="driveSelector" class="drive-selector" :class="{ hidden: !drives || drives.length === 0 }">
      <div class="drive-selector-header">
        <select id="driveSelect" class="drive-select" v-model="selectedDrive"
          @change="emit('changeDrive', selectedDrive)">
          <option value="">
            {{ t('sidebar.allDrives') }}
          </option>
          <option v-for="d in drives" :key="d.id" :value="d.id">
            {{ d.label || d.name || d.id }}
          </option>
        </select>
        <button id="manageDrivesBtn" class="drive-action-btn" :title="t('sidebar.manageDrives')"
          @click="emit('manageDrives')">
          <Settings :size="16" />
        </button>
        <button id="addDriveBtn" class="drive-action-btn" :title="t('sidebar.addDrive')" @click="emit('addDrive')">
          <Plus :size="16" />
        </button>
        <button id="refreshDrivesBtn" class="drive-action-btn" :title="t('sidebar.refreshDrives') || 'Refresh drives'"
          @click="emit('refreshDrives')">
          <RefreshCw :size="16" />
        </button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="sidebar-tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'events' }" data-tab="events"
        @click="activeTab = 'events'">
        {{ t('sidebar.events') }}
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'map' }" data-tab="map" @click="activeTab = 'map'">
        {{ t('sidebar.map') }}
      </button>
    </div>

    <!-- Filter Panel -->
    <div id="filterPanel">
      <FilterPanel />
    </div>

    <!-- Folder Selector Button -->
    <button id="selectFolderBtn" class="select-folder-btn" :class="{ hidden: hasEvents }" @click="emit('selectFolder')">
      <Folder :size="20" class="icon-mr-2" />
      <span>{{
        t('sidebar.selectFolder')
        }}</span>
    </button>

    <!-- Backblaze B2 Button -->
    <button id="loadB2Btn" class="select-folder-btn b2-btn sync-cloud-bg" :class="{ hidden: hasEvents }"
      @click="emit('loadB2')">
      <Cloud :size="20" class="icon-mr-2" />
      <span>Load from Backblaze B2</span>
    </button>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Events Tab -->
      <div id="eventsTab" class="tab-pane" :class="{ active: activeTab === 'events' }">
        <EventList :events="events || []" :currentEvent="currentEvent" @selectEvent="emit('selectEvent', $event)" />
      </div>

      <!-- Map Tab -->
      <div id="mapTab" class="tab-pane" :class="{ active: activeTab === 'map' }">
        <MapView :visible="activeTab === 'map'" @selectEvent="emit('selectEvent', $event)" />
      </div>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { Cloud, Folder, Plus, RefreshCw, Settings } from '@lucide/vue';
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
    } catch (_e) { }
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
  background: linear-gradient(135deg, var(--accent) 0%, var(--c-brand-end) 100%);
  box-shadow: 0 0 20px var(--accent-glow);
}

.select-folder-btn:hover {
  background: linear-gradient(135deg,
      var(--accent-hover) 0%,
      var(--accent) 100%);
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
  @apply relative flex max-w-150 w-50 flex-col border-r border-(--border);
  background: linear-gradient(180deg,
      var(--bg-secondary) 0%,
      var(--bg-primary) 100%);
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
  @apply absolute top-0 -right-1.5 bottom-0 z-100 w-2 cursor-ew-resize bg-transparent transition-[background] duration-150;
  touch-action: none;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle.resizing {
  @apply bg-(--accent) opacity-50;
}

.sidebar-resize-handle::after {
  @apply absolute top-1/2 left-1/2 h-10 w-1 opacity-0 transition-opacity duration-150;
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
  background: linear-gradient(180deg,
      transparent 0%,
      var(--accent) 30%,
      var(--accent) 70%,
      transparent 100%);
}

.sidebar-header {
  @apply flex flex-wrap items-center gap-2 border-b border-(--border) p-4;
}

.sidebar-header h2 {
  @apply m-0 font-(family-name:--font-ui) text-[0.95rem] font-semibold tracking-widest text-(--text-secondary) uppercase;
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
  @apply flex cursor-pointer items-center justify-center bg-transparent p-[0.2rem] text-(--text-muted) border-none transition-[transform] duration-200;
}

.sidebar-panel-header .panel-collapse-btn:hover {
  @apply text-(--text-primary);
}

.sidebar-panel.collapsed .panel-collapse-btn {
  transform: rotate(-90deg);
}

.sidebar-panel-content {
  @apply overflow-hidden opacity-100 transition-[max-height_height_opacity_padding] duration-300;
}

.sidebar-panel.collapsed .sidebar-panel-content {
  max-height: 0 !important;
  height: 0 !important;
  opacity: 0;
  padding: 0 !important;
}



/* Telemetry Panel - height matches bottom controls pane (~200px) */
#telemetryContent {
  @apply flex h-50 max-h-50 flex-col p-1;
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
  @apply w-full font-mono text-xs tracking-[0.02em] text-(--text-muted);
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
  @apply flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-(--border) bg-(--bg-primary) p-1.5 text-(--text-muted) transition-[background_border-color_color] duration-150;
  /* don't let the icon buttons compress to nothing */
}

.drive-action-btn:hover {
  @apply border-(--accent) bg-(--accent-subtle) text-(--accent);
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

.sync-cloud-bg {
  background: var(--c-drive-cloud);
}
</style>
