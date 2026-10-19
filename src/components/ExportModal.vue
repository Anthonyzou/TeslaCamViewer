<template>
  <div v-if="isExportOpen" class="export-modal-backdrop" @keydown.esc="onCancel">
    <div class="export-modal-overlay"></div>
    <div class="export-modal-panel">
      <!-- Active Encoding View -->
      <div v-if="!isExportComplete" class="export-modal-body">
        <div class="export-modal-title">
          {{ exportTitle }}
        </div>
        <div class="export-modal-status">
          {{ exportStatusText }}
        </div>
        <div class="export-progress-track">
          <div
            class="export-progress-fill"
            :style="{ width: `${exportProgress}%` }"
          ></div>
        </div>
        <div class="export-modal-actions">
          <button class="export-btn export-btn-cancel" @click="onCancel">
            Cancel
          </button>
        </div>
      </div>

      <!-- Complete View -->
      <div v-else class="export-modal-body export-complete">
        <div class="complete-icon">🎉</div>
        <div class="export-modal-title">Export Complete!</div>
        <div class="complete-description">
          {{ exportFilename }} has been saved directly from your GPU.
        </div>
        <div class="export-modal-actions">
          <a
            v-if="exportDownloadUrl"
            :href="exportDownloadUrl"
            :download="exportFilename"
            class="export-btn export-btn-download"
          >
            Download Again
          </a>
          <button class="export-btn export-btn-close" @click="onClose">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useModals } from '../composables/useModals';

const {
  isExportOpen,
  isExportComplete,
  exportTitle,
  exportStatusText,
  exportProgress,
  exportFilename,
  exportDownloadUrl,
  exportModal,
} = useModals();

function onCancel() {
  exportModal.cancel();
}

function onClose() {
  exportModal.close();
  if (typeof window !== 'undefined') {
    window.app?.enableControls?.();
  }
}
</script>
