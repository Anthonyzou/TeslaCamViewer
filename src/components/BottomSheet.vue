<template>
  <div id="bottomSheet" class="bottom-sheet collapsed">
    <div class="bottom-sheet-handle" id="bottomSheetHandle">
      <div class="bottom-sheet-handle-bar"></div>
    </div>
    <div class="bottom-sheet-header">
      <div class="bottom-sheet-mini-controls">
        <button
          id="bottomSheetPlayBtn"
          class="control-btn"
          title="Play/Pause"
          @click="emit('togglePlay')"
        >
          <Play :size="24" />
        </button>
      </div>
      <div class="bottom-sheet-mini-timeline">
        <div id="bottomSheetProgress" class="bottom-sheet-mini-progress"></div>
      </div>
    </div>
    <div class="bottom-sheet-content">
      <div class="bottom-sheet-controls">
        <button
          id="bsFrameBackBtn"
          class="control-btn"
          title="Previous Frame"
          @click="emit('frameBack')"
        >
          <ChevronLeft :size="20" />
        </button>
        <button
          id="bsFrameForwardBtn"
          class="control-btn"
          title="Next Frame"
          @click="emit('frameForward')"
        >
          <ChevronRight :size="20" />
        </button>
        <button
          id="bsPrevClipBtn"
          class="control-btn"
          title="Previous Clip"
          @click="emit('prevClip')"
        >
          <SkipBack :size="20" />
        </button>
        <button
          id="bsNextClipBtn"
          class="control-btn"
          title="Next Clip"
          @click="emit('nextClip')"
        >
          <SkipForward :size="20" />
        </button>
        <button
          id="bsPrevEventBtn"
          class="control-btn"
          title="Previous Event"
          @click="emit('prevEvent')"
        >
          <ArrowLeft :size="20" />
        </button>
        <button
          id="bsNextEventBtn"
          class="control-btn"
          title="Next Event"
          @click="emit('nextEvent')"
        >
          <ArrowRight :size="20" />
        </button>
        <div class="bs-more-container">
          <button
            id="bsMoreBtn"
            class="control-btn"
            title="More Options"
            @click="emit('toggleMore')"
          >
            <MoreHorizontal :size="20" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Play,
  SkipBack,
  SkipForward,
} from 'lucide-vue-next';

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

<style scoped>
/* ==================== SWIPE INDICATORS ==================== */
.swipe-indicator {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 60px;
    height: 60px;
    background: rgba(var(--accent-rgb, 74, 158, 255), 0.9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    z-index: 1000;
    animation: swipeIndicatorPop 0.4s ease-out forwards;
    pointer-events: none;
}

.swipe-prev {
    left: 20px;
}

.swipe-next {
    right: 20px;
}

@keyframes swipeIndicatorPop {
    0% {
        opacity: 0;
        transform: translateY(-50%) scale(0.5);
    }

    50% {
        opacity: 1;
        transform: translateY(-50%) scale(1.1);
    }

    100% {
        opacity: 0;
        transform: translateY(-50%) scale(1);
    }
}
</style>
