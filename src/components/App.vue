<template>
  <div class="app-container" role="application" aria-label="TeslaCam Viewer Application">
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
        :eventCountText="eventCountText"
        :eventStatsText="eventStatsText"
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
          :hiddenCameras="hiddenCameras"
          @toggleCameraHide="toggleCameraHide"
          @unhideCamera="unhideCamera"
          @togglePlay="togglePlay"
        />

        <EventInfoBar />

        <TimelineBar
          :hasEvent="hasEvent"
          @zoomIn="zoomIn"
          @zoomOut="zoomOut"
          @zoomReset="zoomReset"
        />

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
          @toggleEnhance="toggleEnhance"
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
    <QuickStartGuideModal />
    <StatisticsModal />
    <DriveManagementModal />
    <DriveSetupModal />
    <DiagnosticsModal />

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="loading-overlay hidden">
      <div class="loading-spinner"></div>
      <div id="loadingText" class="loading-text" data-i18n="loading.loading">Loading...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import VideoGrid from './VideoGrid.vue';
import EventInfoBar from './EventInfoBar.vue';
import TimelineBar from './TimelineBar.vue';
import PlaybackControls from './PlaybackControls.vue';
import BottomSheet from './BottomSheet.vue';
import CommandPalette from './CommandPalette.vue';
import SettingsModal from './SettingsModal.vue';
import HelpModal from './HelpModal.vue';
import QuickStartGuideModal from './QuickStartGuideModal.vue';
import StatisticsModal from './StatisticsModal.vue';
import DriveManagementModal from './DriveManagementModal.vue';
import DriveSetupModal from './DriveSetupModal.vue';
import DiagnosticsModal from './DiagnosticsModal.vue';
import { useTeslaCam } from '../composables/useTeslaCam';

const {
  currentEvent,
  isPlaying,
  speed,
  isLooping,
  layout,
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
  toggleEnhance,
  changeLayout,
  changeFocusCamera,
  resetLayout,
  frameBack,
  frameForward,
  prevEvent,
  nextEvent,
  zoomIn,
  zoomOut,
  zoomReset,
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
    if (window.i18n) {
      await window.i18n.init();
    }
    const app = new TeslaCamApp();
    (window as any).app = app;
    await app.tryRestoreLastFolder();

    if (app.b2Client) {
      app.b2Client.getConfig().then((config: any) => {
        if (config?.isConfigured && config?.isPreloaded) {
          app.loadFromB2();
        }
      });
    }
  }
});
</script>
