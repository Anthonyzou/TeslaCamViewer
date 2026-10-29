<template>
  <div
    class="app-container"
    role="application"
    aria-label="TeslaCam Viewer Application"
  >
    <AppHeader
      @toggleSidebar="toggleSidebar"
      @openStats="openStats"
      @openHelp="openHelp"
      @openSettings="openSettings"
    />

    <div class="main-content">
      <!-- Sidebar Overlay for mobile -->
      <div id="sidebarOverlay" class="sidebar-overlay hidden"></div>

      <!-- Sidebar -->
      <AppSidebar
        :drives="drives"
        :activeDriveId="activeDriveId"
        :hasEvents="hasEvent"
        :events="filteredEvents"
        :currentEvent="currentEvent"
        :eventCountText="eventCountText"
        :eventStatsText="eventStatsText"
        @selectEvent="selectEvent"
        @changeDrive="changeDrive"
        @manageDrives="manageDrives"
        @addDrive="addDrive"
        @refreshDrives="refreshDrives"
        @selectFolder="selectFolder"
        @loadB2="loadB2"
      />

      <!-- Main Video Player Area -->
      <main class="player-area">
        <VideoGrid
          :hasEvent="hasEvent"
          :layout="layout"
          :focusCamera="focusCamera"
          :hasPillarCameras="currentEvent?.hasPillarCameras"
          :hiddenCameras="hiddenCameras"
          @toggleCameraHide="toggleCameraHide"
          @unhideCamera="unhideCamera"
          @togglePlay="togglePlay"
        />

        <EventInfoBar />

        <TimelineBar :hasEvent="hasEvent" />

        <PlaybackControls
          :hasEvent="hasEvent"
          :isPlaying="isPlaying"
          :speed="speed"
          :isLooping="isLooping"
          :layout="layout"
          :focusCamera="focusCamera"
          @togglePlay="togglePlay"
          @prevClip="prevClip"
          @nextClip="nextClip"
          @changeSpeed="changeSpeed"
          @toggleLoop="toggleLoop"
          @markIn="markIn"
          @markOut="markOut"
          @clearMarks="clearMarks"
          @exportVideo="exportVideo"
          @captureScreenshot="captureScreenshot"
          @changeLayout="changeLayout"
          @changeFocusCamera="changeFocusCamera"
          @resetLayout="resetLayout"
          @frameBack="frameBack"
          @frameForward="frameForward"
          @prevEvent="prevEvent"
          @nextEvent="nextEvent"
        />
      </main>
    </div>

    <!-- Modals -->
    <CommandPalette />
    <SettingsModal />
    <HelpModal />
    <StatisticsModal />
    <DriveManagementModal />
    <DriveSetupModal />
    <ExportModal />

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay hidden">
      <div class="loading-spinner"></div>
      <div id="loadingText" class="loading-text">
        {{ t('loading.loading') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../composables/useI18n';
import { useTeslaCam } from '../composables/useTeslaCam';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import CommandPalette from './CommandPalette.vue';
import DriveManagementModal from './DriveManagementModal.vue';
import DriveSetupModal from './DriveSetupModal.vue';
import EventInfoBar from './EventInfoBar.vue';
import ExportModal from './ExportModal.vue';
import HelpModal from './HelpModal.vue';
import PlaybackControls from './PlaybackControls.vue';
import SettingsModal from './SettingsModal.vue';
import StatisticsModal from './StatisticsModal.vue';
import TimelineBar from './TimelineBar.vue';
import VideoGrid from './VideoGrid.vue';

const { t } = useI18n();

const {
  currentEvent,
  filteredEvents,
  selectEvent,
  isPlaying,
  speed,
  isLooping,
  layout,
  focusCamera,
  drives,
  hiddenCameras,
  hasEvent,
  eventCountText,
  eventStatsText,
  togglePlay,
  prevClip,
  nextClip,
  changeSpeed,
  toggleLoop,
  markIn,
  markOut,
  clearMarks,
  exportVideo,
  captureScreenshot,
  changeLayout,
  changeFocusCamera,
  resetLayout,
  frameBack,
  frameForward,
  prevEvent,
  nextEvent,
  selectFolder,
  loadB2,
  changeDrive,
  activeDriveId,
  manageDrives,
  addDrive,
  refreshDrives,
  openStats,
  openHelp,
  openSettings,
  toggleCameraHide,
  toggleSidebar,
  unhideCamera,
} = useTeslaCam();

import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';

useKeyboardShortcuts({
  togglePlay,
  prevClip,
  nextClip,
  prevEvent,
  nextEvent,
  markIn,
  markOut,
  clearMarks,
  captureScreenshot,
  exportVideo,
  openSettings,
  openHelp,
  frameBack,
  frameForward,
  changeLayout,
  changeFocusCamera,
});
</script>

<style scoped>
@reference "tailwindcss";

.main-content {
  @apply flex flex-1 overflow-hidden;
}

.player-container {
  @apply flex min-w-0 flex-1 flex-col overflow-hidden bg-(--bg-void);
}

.loading-overlay {
  @apply fixed inset-0 z-1000 flex flex-col items-center justify-center gap-4 backdrop-blur-[8px];
  background-color: var(--c-loading-scrim);
}

.loading-overlay.hidden {
  display: none;
}

.loading-spinner {
  @apply size-12 rounded-full border-[3px] border-(--border) border-t-(--accent);
  animation: spin 1s linear infinite;
}

.loading-text {
  @apply text-[0.95rem] tracking-[0.05em] text-(--text-secondary);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ==================== PLAYER AREA ==================== */
.player-area {
  @apply relative z-1 flex min-h-0 flex-1 flex-col overflow-hidden bg-(--bg-void);
  /* Keep below sidebar (z-index: 200) on mobile */
}
</style>
