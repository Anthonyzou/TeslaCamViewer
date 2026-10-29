<template>
  <div v-if="isOpen" class="help-modal" @keydown.esc="close">
    <div class="help-overlay" @click="close"></div>
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
            class="help-report-btn no-underline"
            href="https://github.com/teslacamviewer/teslacamviewer.github.io/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            title="Report an issue on GitHub"
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
import { useI18n } from '../composables/useI18n';
import { useModals } from '../composables/useModals';

const { isHelpOpen: isOpen, helpModal } = useModals();
const { t } = useI18n();

function open(): void {
  helpModal.open();
}

function close(): void {
  helpModal.close();
}

function toggle(): void {
  helpModal.toggle();
}

defineExpose({
  open,
  close,
  toggle,
  isOpen,
});
</script>

<style scoped>
@reference "tailwindcss";

.help-modal {
  @apply fixed inset-0 z-2000 flex items-center justify-center;
}

.help-modal.hidden {
  display: none;
}

.help-overlay {
  @apply absolute inset-0 bg-black/80 backdrop-blur-[5px];
}

.help-panel {
  @apply relative flex max-h-[85vh] w-[90%] max-w-[600px] flex-col rounded-2xl border border-(--border) bg-(--bg-secondary);
  box-shadow:
    var(--shadow-lg),
    0 0 60px color-mix(in srgb, var(--accent) 10%, transparent);
}

.help-header {
  @apply flex items-center justify-between border-b border-(--border) px-6 py-5;
}

.help-header h2 {
  @apply m-0 font-(family-name:--font-ui) text-[1.1rem] font-semibold uppercase tracking-[0.05em];
}

.help-close-btn {
  @apply flex cursor-pointer items-center justify-center rounded-lg border border-(--border) bg-(--bg-tertiary) p-2 text-(--text-secondary) transition-all duration-200;
}

.help-close-btn:hover {
  @apply border-(--border-accent) text-(--accent);
}

.help-content {
  @apply flex-1 overflow-y-auto px-6 py-5;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.help-content::-webkit-scrollbar {
  width: 8px;
}

.help-content::-webkit-scrollbar-track {
  background: transparent;
}

.help-content::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.help-content::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.help-section {
  @apply mb-7;
}

.help-section:last-child {
  @apply mb-0;
}

.help-section h3 {
  @apply mb-4 font-(family-name:--font-ui) text-xs font-semibold tracking-[0.1em] text-(--accent) uppercase;
}

.help-footer {
  @apply flex items-center justify-between gap-3.5 border-t border-(--border) px-6 py-4;
}

.help-tip {
  @apply text-[0.8rem] text-(--text-muted) italic;
}

.help-footer-actions {
  @apply flex gap-2;
}

.help-report-btn {
  @apply rounded text-xs cursor-pointer border border-(--border) bg-(--bg-tertiary) px-3 py-1.5 text-(--text-secondary) transition-all duration-200;
}

.help-report-btn:hover {
  @apply border-(--accent) bg-(--accent-subtle) text-(--accent);
}

.shortcut-grid {
  @apply flex flex-col gap-1.5;
}

.shortcut-row {
  @apply flex items-center gap-4 py-2;
}

.shortcut-row kbd {
  @apply min-w-[55px] rounded-md border border-(--border) bg-(--bg-tertiary) px-2.5 py-[0.3rem] text-center font-(family-name:--font-mono) text-[0.8rem] text-(--accent);
  box-shadow: inset 0 -2px 0 var(--bg-void);
}

.shortcut-row span {
  @apply text-[0.85rem] text-(--text-secondary);
}

@media only screen and (max-width: 768px) {
  .help-panel {
    @apply w-[95%] max-h-[90vh];
  }
}
</style>
