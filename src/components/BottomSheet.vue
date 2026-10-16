<template>
  <div id="bottomSheet" class="bottom-sheet collapsed">
    <div class="bottom-sheet-handle" id="bottomSheetHandle">
      <div class="bottom-sheet-handle-bar"></div>
    </div>
    <div class="bottom-sheet-header">
      <div class="bottom-sheet-mini-controls">
        <button id="bottomSheetPlayBtn" class="control-btn" title="Play/Pause" @click="emit('togglePlay')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
      <div class="bottom-sheet-mini-timeline">
        <div id="bottomSheetProgress" class="bottom-sheet-mini-progress"></div>
      </div>
    </div>
    <div class="bottom-sheet-content">
      <div class="bottom-sheet-controls">
        <button id="bsFrameBackBtn" class="control-btn" title="Previous Frame" @click="emit('frameBack')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>
        <button id="bsFrameForwardBtn" class="control-btn" title="Next Frame" @click="emit('frameForward')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
        <button id="bsPrevClipBtn" class="control-btn" title="Previous Clip" @click="emit('prevClip')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>
        <button id="bsNextClipBtn" class="control-btn" title="Next Clip" @click="emit('nextClip')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
        <button id="bsPrevEventBtn" class="control-btn" title="Previous Event" @click="emit('prevEvent')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        <button id="bsNextEventBtn" class="control-btn" title="Next Event" @click="emit('nextEvent')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </button>
        <div class="bs-more-container">
          <button id="bsMoreBtn" class="control-btn" title="More Options" @click="emit('toggleMore')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'togglePlay'): void;
  (e: 'frameBack'): void;
  (e: 'frameForward'): void;
  (e: 'prevClip'): void;
  (e: 'nextClip'): void;
  (e: 'prevEvent'): void;
  (e: 'nextEvent'): void;
  (e: 'toggleMore'): void;
}>();
</script>
