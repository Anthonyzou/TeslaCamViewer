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
        :hasEvents="hasEvent"
        :eventCountText="eventCountText"
        :eventStatsText="eventStatsText"
        @changeDrive="changeDrive"
        @manageDrives="manageDrives"
        @addDrive="addDrive"
        @syncDrives="syncDrives"
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

    <!-- Drive Sync Modal container -->
    <div id="driveSyncModal" class="drive-sync-modal hidden"></div>

    <!-- Modals -->
    <CommandPalette />
    <SettingsModal />
    <HelpModal />
    <QuickStartGuideModal />
    <StatisticsModal />

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
  manageDrives,
  addDrive,
  syncDrives,
  openStats,
  openHelp,
  openSettings,
  toggleCameraHide,
  toggleSidebar,
  unhideCamera,
} = useTeslaCam();
</script>
