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
        <span data-i18n="sidebar.events">{{ t('sidebar.events') }}</span>
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
          <option value="" data-i18n="sidebar.allDrives">
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
        data-i18n="sidebar.events"
        @click="activeTab = 'events'"
      >
        {{ t('sidebar.events') }}
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'map' }"
        data-tab="map"
        data-i18n="sidebar.map"
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
      <span data-i18n="sidebar.selectFolder">{{
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
        <MapView :visible="activeTab === 'map'" />
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
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

function getSavedWidth(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed;
    } else {
      resetWidth();
      return DEFAULT_WIDTH;
    }
  } catch (e) {
    console.warn('[SidebarResize] Failed to restore width:', e);
  }
  return DEFAULT_WIDTH;
}

const sidebarWidth = ref<number>(getSavedWidth() || 10);
const isResizing = ref(false);
const isMobile = ref(
  typeof window !== 'undefined' ? window.innerWidth <= 768 : false
);

let startX = 0;
let startWidth = 0;

const sidebarStyle = computed(() => {
  if (isMobile.value) return undefined;
  return {
    width: `${sidebarWidth.value}px`,
    transition: isResizing.value ? 'none' : undefined,
  };
});

function saveWidth(w: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, w.toString());
  } catch (e) {
    console.warn('[SidebarResize] Failed to save width:', e);
  }
}

function resetWidth(): void {
  sidebarWidth.value = DEFAULT_WIDTH;
  saveWidth(DEFAULT_WIDTH);
}

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
  saveWidth(sidebarWidth.value);
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

let mediaQuery: MediaQueryList | null = null;
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

onMounted(() => {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    mediaQuery = window.matchMedia('(max-width: 768px)');
    isMobile.value = mediaQuery.matches;
    mediaListener = (e: MediaQueryListEvent) => {
      isMobile.value = e.matches;
    };
    mediaQuery.addEventListener('change', mediaListener);
  }
});

onUnmounted(() => {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener);
  }
  document.body.classList.remove('sidebar-resizing');
});
</script>

<style scoped>
/* ==================== SIDEBAR ==================== */
.sidebar {
    width: 320px;
    min-width: 200px;
    max-width: 600px;
    background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    position: relative;
}

/* Sidebar resize handle — split across sidebar edge:
   2px inside sidebar (sits on scrollbar track's non-clickable outer edge)
   6px outside (into video grid gutter). Keeps scrollbar usable while giving
   the resize grip a reasonable hit target. */
.sidebar-resize-handle {
    position: absolute;
    top: 0;
    right: -6px;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
    touch-action: none;
    z-index: 100;
    background: transparent;
    transition: background 0.15s ease;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle.resizing {
    background: var(--accent);
    opacity: 0.5;
}

.sidebar-resize-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 4px;
    height: 40px;
    background: var(--text-muted);
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.15s ease;
}

.sidebar-resize-handle:hover::after,
.sidebar-resize-handle.resizing::after {
    opacity: 0.8;
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
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 1px;
    background: linear-gradient(180deg,
            transparent 0%,
            var(--accent) 30%,
            var(--accent) 70%,
            transparent 100%);
    opacity: 0.2;
    pointer-events: none;
}

.sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

.sidebar-header h2 {
    font-family: var(--font-ui);
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
}

/* ==================== SIDEBAR COLLAPSIBLE PANELS ==================== */
.sidebar-panel {
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
}

.sidebar-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1rem;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.15s ease;
}

.sidebar-panel-header:hover {
    background: var(--bg-tertiary);
}

.sidebar-panel-header .panel-title {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
}

.sidebar-panel-header .panel-collapse-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, color 0.15s ease;
}

.sidebar-panel-header .panel-collapse-btn:hover {
    color: var(--text-primary);
}

.sidebar-panel.collapsed .panel-collapse-btn {
    transform: rotate(-90deg);
}

.sidebar-panel-content {
    overflow: hidden;
    transition: max-height 0.3s ease, height 0.3s ease, opacity 0.2s ease, padding 0.3s ease;
    opacity: 1;
}

.sidebar-panel.collapsed .sidebar-panel-content {
    max-height: 0 !important;
    height: 0 !important;
    opacity: 0;
    padding: 0 !important;
}

/* Bird's Eye View Panel */
#birdsEyeContent {
    height: 200px;
    max-height: 200px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

#birdsEyeContent canvas {
    width: 100%;
    height: 100%;
}

/* Telemetry Panel - height matches bottom controls pane (~200px) */
#telemetryContent {
    height: 200px;
    max-height: 200px;
    display: flex;
    flex-direction: column;
    padding: 4px;
}

.sidebar .tab-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.sidebar .tab-pane {
    overflow: hidden;
}

.sidebar .event-list {
    height: 100%;
    overflow-y: auto;
}

.event-count {
    font-weight: 400;
    color: var(--text-muted);
}

.event-stats {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-muted);
    width: 100%;
    letter-spacing: 0.02em;
}

/* Drive Selector (multi-drive support) */
.drive-selector {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-tertiary);
}

.drive-selector.hidden {
    display: none;
}

.drive-selector-header {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-wrap: wrap;
    /* wrap to a second row when sidebar is narrow */
}

.drive-select {
    flex: 1 1 120px;
    /* shrink-friendly: minimum 120px, grows to fill */
    min-width: 0;
    /* allow it to shrink below its content width */
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem 0.5rem;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.drive-select:hover {
    border-color: var(--accent);
}

.drive-select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-subtle);
}

.drive-select option {
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 0.5rem;
}

.drive-action-btn {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.4rem;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
    /* don't let the icon buttons compress to nothing */
}

.drive-action-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-subtle);
}

/* Drive color badge in select options */
.drive-option-badge {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 0.5rem;
    vertical-align: middle;
}

/* Modal overlay */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
}

.modal {
    background: var(--bg-secondary);
    border-radius: 12px;
    border: 1px solid var(--border);
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
}

.modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.modal-close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    display: flex;
    transition: all 0.2s ease;
}

.modal-close-btn:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
}

.modal-content {
    padding: 1.25rem;
    overflow-y: auto;
}

/* Drive management modal */
.drive-management-modal {
    max-width: 500px;
}

.drive-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.drive-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--bg-tertiary);
    border-radius: 8px;
    border: 1px solid var(--border);
}

.drive-color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.drive-color-picker {
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
}

.drive-color-input {
    position: absolute;
    width: 24px;
    height: 24px;
    opacity: 0;
    cursor: pointer;
}

.drive-color-preview {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--border);
    transition: all 0.2s ease;
}

.drive-color-picker:hover .drive-color-preview {
    border-color: var(--accent);
    transform: scale(1.1);
}

.drive-label-input {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 0.375rem 0.5rem;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 0.85rem;
}

.drive-label-input:hover {
    border-color: var(--border);
}

.drive-label-input:focus {
    outline: none;
    border-color: var(--accent);
}

.drive-event-count {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
}

.drive-remove-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
}

.drive-remove-btn:hover {
    color: #ff5252;
    background: rgba(255, 82, 82, 0.1);
}

/* Drive Setup Dialog */
.drive-setup-modal {
    max-width: 480px;
}

.drive-setup-modal .modal-content {
    padding: 1.25rem;
}

.drive-setup-selected {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--bg-tertiary);
    border-radius: 8px;
    margin-bottom: 1rem;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.drive-setup-selected svg {
    color: var(--accent);
    flex-shrink: 0;
}

.drive-setup-tip {
    background: var(--accent-subtle);
    border: 1px solid var(--border-accent);
    border-radius: 8px;
    padding: 0.875rem;
    margin-bottom: 1.25rem;
}

.drive-setup-tip-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: var(--accent);
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
}

.drive-setup-tip ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.8rem;
    line-height: 1.6;
}

.drive-setup-tip li {
    margin-bottom: 0.25rem;
}

.drive-setup-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.drive-setup-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
}

.drive-setup-field label {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-secondary);
}

.drive-setup-field input[type="text"],
.drive-setup-field select {
    padding: 0.625rem 0.75rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 0.9rem;
}

.drive-setup-field input[type="text"]:focus,
.drive-setup-field select:focus {
    outline: none;
    border-color: var(--accent);
}

.drive-setup-checkbox {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    cursor: pointer;
    padding: 0.625rem;
    background: var(--bg-tertiary);
    border-radius: 6px;
    border: 1px solid var(--border);
    transition: all 0.2s ease;
}

.drive-setup-checkbox:hover {
    border-color: var(--accent);
}

.drive-setup-checkbox input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
    cursor: pointer;
}

.drive-setup-checkbox-content {
    flex: 1;
}

.drive-setup-checkbox-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
}

.drive-setup-checkbox-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.125rem;
}

.drive-setup-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.drive-setup-actions .btn {
    flex: 1;
    padding: 0.75rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.drive-setup-actions .btn-secondary {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    color: var(--text-secondary);
}

.drive-setup-actions .btn-secondary:hover {
    border-color: var(--text-muted);
    color: var(--text-primary);
}

.drive-setup-actions .btn-primary {
    background: var(--accent);
    border: none;
    color: var(--bg-void);
}

.drive-setup-actions .btn-primary:hover {
    background: var(--accent-hover);
}

/* Archive drive badge */
.drive-archive-badge {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: var(--warning);
    color: var(--bg-void);
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
    margin-left: 0.5rem;
}

.drive-item.is-archive {
    opacity: 0.7;
}

.drive-item.is-archive .drive-event-count {
    color: var(--warning);
}

.drive-sync-btn {
    background: var(--accent);
    border: none;
    color: var(--bg-void);
    cursor: pointer;
    padding: 0.375rem 0.625rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.2s ease;
}

.drive-sync-btn:hover {
    background: var(--accent-hover);
}

.drive-date-filter {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
}

/* Sidebar Tabs */
.sidebar-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border);
    background: var(--bg-primary);
}

.tab-btn {
    flex: 1;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-family: var(--font-ui);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.tab-btn:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
}

.tab-btn.active {
    color: var(--accent);
    background: var(--bg-tertiary);
}

.tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20%;
    right: 20%;
    height: 2px;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent-glow);
    border-radius: 1px;
}

/* ==================== AI Search (sidebar) ==================== */
/* AI Search panel theming — matches sibling .filter-panel so the sidebar
 * reads as one continuous surface. The original stylesheet referenced
 * --bg-panel / --bg-elev, which don't exist in the project's token set,
 * so it fell through to its literal fallbacks (#242424 / #2f2f2f) and
 * looked wrong against the actual theme (bg-primary is #0a0c12). */
.ai-search-panel {
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border);
}

.ai-search-header {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    background: var(--bg-primary);
}

.ai-search-header:hover {
    background: var(--bg-elevated);
}

.ai-search-header-content {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-primary);
}

.ai-search-badge {
    background: var(--accent);
    color: white;
    font-size: 0.68rem;
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 500;
}

/* Container holds the BETA pill + collapse chevron together so they
 * stay right-anchored regardless of label/badge width on the left. */
.ai-search-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

/* Outlined pill — readable but quiet so it doesn't fight the rest of
 * the sidebar. Subtle pulse to nudge attention without being loud. */
.ai-search-beta-pill {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 1px 6px;
    border-radius: 8px;
    color: var(--warning);
    background: rgba(255, 184, 0, 0.08);
    border: 1px solid rgba(255, 184, 0, 0.45);
    text-transform: uppercase;
    line-height: 1.3;
    cursor: help;
}

.ai-search-collapse-icon,
.collapse-icon-svg {
    color: var(--text-muted, #888);
    transition: transform 0.22s ease;
    flex-shrink: 0;
}

.ai-search-collapse-icon.collapsed,
.collapse-icon-svg.collapsed {
    transform: rotate(-90deg);
}

.ai-search-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.22s ease;
}

.ai-search-content.expanded {
    max-height: 400px;
    padding: 8px 12px 10px;
    border-top: 1px solid var(--border, #3a3a3a);
}

.ai-search-row {
    display: flex;
    gap: 6px;
    align-items: center;
}

.ai-search-input {
    flex: 1;
    background: var(--bg-tertiary, #141414);
    color: var(--text-primary);
    border: 1px solid var(--border, #3a3a3a);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 0.85rem;
}

.ai-search-input:focus {
    outline: 1px solid var(--accent, #4a9eff);
}

.ai-search-clear {
    background: transparent;
    color: var(--text-muted, #888);
    border: 1px solid var(--border, #3a3a3a);
    width: 28px;
    height: 28px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
}

.ai-search-clear:hover {
    color: var(--text-primary);
    border-color: var(--accent, #4a9eff);
}

.ai-search-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
    max-height: 80px;
    overflow-y: auto;
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
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 0.72rem;
    cursor: pointer;
    white-space: nowrap;
}

.ai-search-chip:hover {
    color: var(--text-primary);
    border-color: var(--accent);
}

.ai-search-chip.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}

.ai-search-results-header {
    margin-top: 8px;
    padding: 6px 8px;
    background: var(--bg-tertiary, #141414);
    border-radius: 4px;
    font-size: 0.75rem;
    color: var(--text-muted, #888);
    font-family: ui-monospace, monospace;
    line-height: 1.4;
}

.event-item.ai-confident {
    border-left: 3px solid #4ade80;
}

.event-item.ai-possible {
    border-left: 3px solid #ffb800;
    opacity: 0.8;
}

.event-ai-match-label {
    font-size: 0.7rem;
    color: var(--text-muted, #888);
    font-family: ui-monospace, monospace;
    margin-top: 2px;
}

.event-ai-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 4px;
}

.event-ai-tag {
    background: var(--bg-tertiary, #141414);
    color: var(--text-muted, #888);
    font-size: 0.62rem;
    padding: 1px 6px;
    border-radius: 8px;
}

.ai-search-tier-divider {
    padding: 8px 12px;
    font-size: 0.72rem;
    font-family: ui-monospace, monospace;
    border-bottom: 1px solid var(--border, #3a3a3a);
    background: var(--bg-tertiary, #141414);
}

.ai-search-tier-confident {
    color: #4ade80;
}

.ai-search-tier-possible {
    color: #ffb800;
}

.ai-search-tier-none {
    color: #f87171;
}

/* Toast for first-run prompt — positioned TOP-right so it doesn't collide
   with the persistent indexing widget at bottom-right */
.ai-search-toast {
    position: fixed;
    top: 64px;
    right: 20px;
    background: var(--bg-elevated);
    border: 1px solid var(--accent);
    border-radius: 8px;
    padding: 14px 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    max-width: 360px;
    z-index: 10001;
    font-size: 0.88rem;
    line-height: 1.5;
}

.ai-search-toast-title {
    font-weight: 600;
    margin-bottom: 4px;
}

.ai-search-toast-actions {
    margin-top: 10px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.ai-search-toast-btn {
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.82rem;
    border: 1px solid var(--border, #3a3a3a);
    background: transparent;
    color: var(--text-primary);
}

.ai-search-toast-btn.primary {
    background: var(--accent, #4a9eff);
    color: white;
    border-color: var(--accent, #4a9eff);
}
</style>
