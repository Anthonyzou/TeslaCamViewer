<template>
  <aside class="sidebar" id="sidebar" :style="sidebarStyle">
    <div
      class="sidebar-resize-handle"
      id="sidebarResizeHandle"
      :class="{ resizing: isResizing }"
      title="Drag to resize"
      @mousedown="onMouseDown"
      @touchstart="onTouchStart"
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
            {{ d.name }}
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
        <div id="eventList" class="event-list">
          <div
            class="empty-state"
            id="emptyState"
            :class="{ hidden: hasEvents }"
          >
            <p data-i18n="sidebar.emptyState">{{ t('sidebar.emptyState') }}</p>
            <p class="hint" data-i18n="sidebar.emptyStateHint">
              {{ t('sidebar.emptyStateHint') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Map Tab -->
      <div
        id="mapTab"
        class="tab-pane"
        :class="{ active: activeTab === 'map' }"
      >
        <div id="map"></div>
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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Settings, Plus, RefreshCw, Folder, Cloud } from 'lucide-vue-next';
import type { DriveInfo } from '../types';
import FilterPanel from './FilterPanel.vue';

defineProps<{
  drives?: DriveInfo[];
  hasEvents: boolean;
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
  window.dispatchEvent(new Event('resize'));
  setTimeout(() => {
    (window as any).app?.mapView?.map?.invalidateSize();
  }, 100);
}

function startResize(clientX: number): void {
  if (isMobile.value) return;
  isResizing.value = true;
  startX = clientX;
  startWidth = sidebarWidth.value;

  document.body.classList.add('sidebar-resizing');

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
}

function doResize(clientX: number): void {
  const deltaX = clientX - startX;
  const newWidth = Math.max(
    MIN_WIDTH,
    Math.min(MAX_WIDTH, startWidth + deltaX)
  );
  sidebarWidth.value = newWidth;
}

function endResize(): void {
  if (!isResizing.value) return;
  isResizing.value = false;
  document.body.classList.remove('sidebar-resizing');

  saveWidth(sidebarWidth.value);
  window.dispatchEvent(new Event('resize'));
  setTimeout(() => {
    (window as any).app?.mapView?.map?.invalidateSize();
  }, 100);

  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
}

function onMouseDown(e: MouseEvent): void {
  e.preventDefault();
  startResize(e.clientX);
}

function onMouseMove(e: MouseEvent): void {
  if (isResizing.value) {
    doResize(e.clientX);
  }
}

function onMouseUp(): void {
  endResize();
}

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length === 1) {
    e.preventDefault();
    startResize(e.touches[0].clientX);
  }
}

function onTouchMove(e: TouchEvent): void {
  if (isResizing.value && e.touches.length === 1) {
    e.preventDefault();
    doResize(e.touches[0].clientX);
  }
}

function onTouchEnd(): void {
  endResize();
}

function onWindowResize(): void {
  isMobile.value = window.innerWidth <= 768;
}

const activeTab = ref<'events' | 'map'>('events');
const selectedDrive = ref('');

const localeTick = ref(0);

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

function onLocaleChanged(): void {
  localeTick.value++;
}

onMounted(() => {
  window.addEventListener('localeChanged', onLocaleChanged);
  window.addEventListener('resize', onWindowResize);

  // Expose global for backward compatibility with any other callers
  (window as any).sidebarResize = {
    getWidth: () => sidebarWidth.value,
    setWidth: (w: number) => {
      sidebarWidth.value = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w));
      saveWidth(sidebarWidth.value);
      window.dispatchEvent(new Event('resize'));
      setTimeout(() => {
        (window as any).app?.mapView?.map?.invalidateSize();
      }, 100);
    },
    resetWidth,
  };
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
  document.body.classList.remove('sidebar-resizing');
});
</script>
