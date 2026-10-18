<template>
  <div v-if="isOpen" class="help-modal" @keydown.esc="close">
    <div
      class="help-overlay"
      @mousedown="onOverlayMouseDown"
      @click="onOverlayClick"
    ></div>
    <div class="help-panel">
      <div class="help-header">
        <h2>{{ t('help.title') }}</h2>
        <button
          class="help-close-btn"
          :title="t('common.close')"
          @click="close"
        >
          <X :size="24" />
        </button>
      </div>

      <div class="help-content">
        <!-- Playback Shortcuts -->
        <div class="help-section">
          <h3>{{ t('help.sections.playback') }}</h3>
          <div class="shortcut-grid">
            <div class="shortcut-row">
              <kbd>Space</kbd>
              <span>{{ t('help.shortcuts.playPause') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>Left Arrow</kbd>
              <span>Seek back 5 seconds</span>
            </div>
            <div class="shortcut-row">
              <kbd>Right Arrow</kbd>
              <span>Seek forward 5 seconds</span>
            </div>
            <div class="shortcut-row">
              <kbd>,</kbd> / <kbd>.</kbd>
              <span>Step back / forward 1 frame</span>
            </div>
            <div class="shortcut-row">
              <kbd>Shift + Left</kbd>
              <span>{{ t('help.shortcuts.previousClip') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>Shift + Right</kbd>
              <span>{{ t('help.shortcuts.nextClip') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>Home</kbd>
              <span>{{ t('help.shortcuts.goToStart') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>End</kbd>
              <span>{{ t('help.shortcuts.goToEnd') }}</span>
            </div>
          </div>
        </div>

        <!-- Navigation Shortcuts -->
        <div class="help-section">
          <h3>{{ t('help.sections.navigation') }}</h3>
          <div class="shortcut-grid">
            <div class="shortcut-row">
              <kbd>Page Up</kbd>
              <span>{{ t('help.shortcuts.previousEvent') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>Page Down</kbd>
              <span>{{ t('help.shortcuts.nextEvent') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>Up Arrow</kbd>
              <span>Previous event</span>
            </div>
            <div class="shortcut-row">
              <kbd>Down Arrow</kbd>
              <span>Next event</span>
            </div>
          </div>
        </div>

        <!-- View Shortcuts -->
        <div class="help-section">
          <h3>{{ t('help.sections.viewLayout') }}</h3>
          <div class="shortcut-grid">
            <div class="shortcut-row">
              <kbd>L</kbd>
              <span>{{ t('help.shortcuts.cycleLayouts') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>1-6</kbd>
              <span>Focus camera (1-4 main, 5-6 pillars)</span>
            </div>
            <div class="shortcut-row">
              <kbd>F</kbd>
              <span>{{ t('help.shortcuts.toggleFullscreen') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>Double-click video</kbd>
              <span>{{ t('help.shortcuts.focusCameraFullscreen') }}</span>
            </div>
          </div>
        </div>

        <!-- Marking & Export -->
        <div class="help-section">
          <h3>{{ t('help.sections.markingExport') }}</h3>
          <div class="shortcut-grid">
            <div class="shortcut-row">
              <kbd>I</kbd>
              <span>{{ t('help.shortcuts.markIn') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>O</kbd>
              <span>{{ t('help.shortcuts.markOut') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>Esc</kbd>
              <span>{{ t('help.shortcuts.clearMarks') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>S</kbd>
              <span>{{ t('help.shortcuts.takeScreenshot') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>E</kbd>
              <span>{{ t('help.shortcuts.exportVideo') }}</span>
            </div>
          </div>
        </div>

        <!-- Timeline Zoom -->
        <div class="help-section">
          <h3>{{ t('help.sections.timelineZoom') }}</h3>
          <div class="shortcut-grid">
            <div class="shortcut-row">
              <kbd>Scroll on timeline</kbd>
              <span>{{ t('help.shortcuts.zoomTimeline') }}</span>
            </div>
          </div>
        </div>

        <!-- Speed Control -->
        <div class="help-section">
          <h3>{{ t('help.sections.speedControl') }}</h3>
          <div class="shortcut-grid">
            <div class="shortcut-row">
              <kbd>+</kbd> or <kbd>=</kbd>
              <span>{{ t('help.shortcuts.increaseSpeed') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>-</kbd>
              <span>{{ t('help.shortcuts.decreaseSpeed') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>0</kbd>
              <span>{{ t('help.shortcuts.resetSpeed') }}</span>
            </div>
          </div>
        </div>

        <!-- General -->
        <div class="help-section">
          <h3>{{ t('help.sections.general') }}</h3>
          <div class="shortcut-grid">
            <div class="shortcut-row">
              <kbd>?</kbd> or <kbd>H</kbd>
              <span>{{ t('help.shortcuts.showHelp') }}</span>
            </div>
            <div class="shortcut-row">
              <kbd>Q</kbd>
              <span>Quick Settings</span>
            </div>
            <div class="shortcut-row">
              <kbd>Esc</kbd>
              <span>{{ t('help.shortcuts.closeModal') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="help-footer">
        <span class="help-tip">{{ t('help.tip') }}</span>
        <div class="help-footer-actions">
          <a
            class="help-report-btn"
            href="https://github.com/teslacamviewer/teslacamviewer.github.io/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            title="Report an issue on GitHub"
            style="text-decoration: none"
          >
            🐛 Report Bug
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';
import { useModals } from '../composables/useModals';

const { isHelpOpen: isOpen, helpModal } = useModals();
const localeTick = ref(0);
let mouseDownOnOverlay = false;

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

function open(): void {
  helpModal.open();
}

function close(): void {
  helpModal.close();
}

function toggle(): void {
  helpModal.toggle();
}

function onOverlayMouseDown(e: MouseEvent): void {
  mouseDownOnOverlay = (e.target as HTMLElement).classList.contains(
    'help-overlay'
  );
}

function onOverlayClick(e: MouseEvent): void {
  if (
    mouseDownOnOverlay &&
    (e.target as HTMLElement).classList.contains('help-overlay')
  ) {
    close();
  }
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

defineExpose({
  open,
  close,
  toggle,
  isOpen,
});
</script>
