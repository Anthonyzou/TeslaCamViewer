<template>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-resize-handle" id="sidebarResizeHandle" title="Drag to resize"></div>

    <div class="sidebar-header">
      <h2>
        <span data-i18n="sidebar.events">{{ t('sidebar.events') }}</span>
        <span id="eventCount" class="event-count">{{ eventCountText }}</span>
      </h2>
      <div id="eventStats" class="event-stats">{{ eventStatsText }}</div>
    </div>

    <!-- Drive Selector (multi-drive support) -->
    <div id="driveSelector" class="drive-selector" :class="{ hidden: !drives || drives.length === 0 }">
      <div class="drive-selector-header">
        <select
          id="driveSelect"
          class="drive-select"
          v-model="selectedDrive"
          @change="emit('changeDrive', selectedDrive)"
        >
          <option value="" data-i18n="sidebar.allDrives">{{ t('sidebar.allDrives') }}</option>
          <option v-for="d in drives" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <button
          id="manageDrivesBtn"
          class="drive-action-btn"
          :title="t('sidebar.manageDrives')"
          @click="emit('manageDrives')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
        </button>
        <button
          id="addDriveBtn"
          class="drive-action-btn"
          :title="t('sidebar.addDrive')"
          @click="emit('addDrive')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
        <button
          id="syncDrivesBtn"
          class="drive-action-btn"
          :title="t('sidebar.syncDrives')"
          @click="emit('syncDrives')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
            />
          </svg>
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

    <!-- Filter Panel Mount Container (Single mount managed by FilterPanel) -->
    <div id="filterPanel"></div>

    <!-- Folder Selector Button -->
    <button id="selectFolderBtn" class="select-folder-btn" @click="emit('selectFolder')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
        <path
          d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"
        />
      </svg>
      <span data-i18n="sidebar.selectFolder">{{ t('sidebar.selectFolder') }}</span>
    </button>

    <!-- Backblaze B2 Button -->
    <button id="loadB2Btn" class="select-folder-btn b2-btn" style="background: #003399;" @click="emit('loadB2')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
        <path
          d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"
        />
      </svg>
      <span>Load from Backblaze B2</span>
    </button>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Events Tab -->
      <div id="eventsTab" class="tab-pane" :class="{ active: activeTab === 'events' }">
        <div id="eventList" class="event-list">
          <div class="empty-state" id="emptyState" :class="{ hidden: hasEvents }">
            <p data-i18n="sidebar.emptyState">{{ t('sidebar.emptyState') }}</p>
            <p class="hint" data-i18n="sidebar.emptyStateHint">{{ t('sidebar.emptyStateHint') }}</p>
          </div>
        </div>
      </div>

      <!-- Map Tab -->
      <div id="mapTab" class="tab-pane" :class="{ active: activeTab === 'map' }">
        <div id="map"></div>
      </div>
    </div>

    <!-- Bird's Eye View Panel -->
    <div id="birdsEyePanel" class="sidebar-panel collapsible" style="display: none;">
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
import { ref, onMounted, onUnmounted } from 'vue';
import type { DriveInfo } from '../types';

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
  (e: 'syncDrives'): void;
  (e: 'selectFolder'): void;
  (e: 'loadB2'): void;
}>();

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
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
});
</script>
