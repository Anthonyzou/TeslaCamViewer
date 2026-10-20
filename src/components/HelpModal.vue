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
import { useI18n } from '../composables/useI18n';
import { useModals } from '../composables/useModals';

const { isHelpOpen: isOpen, helpModal } = useModals();
const { t } = useI18n();
let mouseDownOnOverlay = false;

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

defineExpose({
  open,
  close,
  toggle,
  isOpen,
});
</script>

<style scoped>
.help-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-modal.hidden {
  display: none;
}

.help-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
}

.help-panel {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    var(--shadow-lg),
    0 0 60px rgba(0, 212, 255, 0.1);
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.help-header h2 {
  font-family: var(--font-ui);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.help-close-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-close-btn:hover {
  color: var(--accent);
  border-color: var(--border-accent);
}

.help-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
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
  margin-bottom: 1.75rem;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h3 {
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}

.help-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
}

.help-tip {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
}

.help-footer-actions {
  display: flex;
  gap: 8px;
}

.help-report-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.help-report-btn:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

.shortcut-grid {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.shortcut-row kbd {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.3rem 0.625rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  min-width: 55px;
  text-align: center;
  color: var(--accent);
  box-shadow: inset 0 -2px 0 var(--bg-void);
}

.shortcut-row span {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

@media only screen and (max-width: 768px) {
  .help-panel {
    width: 95%;
    max-height: 90vh;
  }
}
</style>
