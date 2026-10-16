<template>
  <div id="eventInfo" class="event-info">
    <div class="event-info-content">
      <span id="eventDate" class="event-date" data-i18n="player.noEventLoaded"
        >No event loaded</span
      >
      <span id="eventLocation" class="event-location"></span>
      <span id="eventReason" class="event-reason"></span>
      <span id="eventWeather" class="event-weather"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
// EventInfoBar provides the persistent DOM container populated by TeslaCamViewerApp.updateEventInfo
</script>
