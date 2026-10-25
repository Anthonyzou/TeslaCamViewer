<template>
  <div
    v-if="isExportOpen"
    class="export-modal-backdrop"
    @keydown.esc="onCancel"
  >
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
}
</script>

<style scoped>
.export-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.export-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}

.export-modal-panel {
  position: relative;
  background: #1e1e1e;
  border: 1px solid #333333;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 440px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  z-index: 10000;
  color: #ffffff;
  text-align: center;
}

.export-modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0.5rem;
}

.export-modal-status {
  font-size: 0.9rem;
  color: #a0a0a0;
  margin-bottom: 1.25rem;
  min-height: 1.2rem;
}

.export-progress-track {
  width: 100%;
  height: 8px;
  background: #2d2d2d;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.export-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 4px;
  transition: width 0.15s ease;
}

.complete-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.complete-description {
  font-size: 0.9rem;
  color: #9ca3af;
  margin-bottom: 1.5rem;
  word-break: break-all;
}

.export-modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.export-btn {
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition:
    background 0.15s ease,
    opacity 0.15s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.export-btn-cancel {
  background: #dc2626;
  color: #ffffff;
}

.export-btn-cancel:hover {
  background: #b91c1c;
}

.export-btn-download {
  background: #2563eb;
  color: #ffffff;
}

.export-btn-download:hover {
  background: #1d4ed8;
}

.export-btn-close {
  background: #374151;
  color: #ffffff;
  border: 1px solid #4b5563;
}

.export-btn-close:hover {
  background: #4b5563;
}
</style>
