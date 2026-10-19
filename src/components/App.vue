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

    <!-- Bottom Sheet Controls (Portrait Mode) -->
    <BottomSheet
      @togglePlay="togglePlay"
      @frameBack="frameBack"
      @frameForward="frameForward"
      @prevClip="prevClip"
      @nextClip="nextClip"
      @prevEvent="prevEvent"
      @nextEvent="nextEvent"
    />

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
      <div id="loadingText" class="loading-text" data-i18n="loading.loading">
        Loading...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTeslaCam } from '../composables/useTeslaCam';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import BottomSheet from './BottomSheet.vue';
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

import { onMounted } from 'vue';
import { TeslaCamApp } from '../services/teslaCamApp';

onMounted(async () => {
  if (typeof window !== 'undefined') {
    const app = new TeslaCamApp();
    window.app = app;
    await app.tryRestoreLastFolder();
  }
});
</script>

<style scoped>
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.player-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-void);
  min-width: 0;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 12, 18, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 1000;
}

.loading-overlay.hidden {
  display: none;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 0.95rem;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
