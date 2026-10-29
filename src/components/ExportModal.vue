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
          <div class="export-progress-fill" :style="{ width: `${exportProgress}%` }"></div>
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
          <a v-if="exportDownloadUrl" :href="exportDownloadUrl" :download="exportFilename"
            class="export-btn export-btn-download">
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
@reference "tailwindcss";

.export-modal-backdrop {
  @apply fixed inset-0 z-9999 flex items-center justify-center;
}

.export-modal-overlay {
  @apply absolute inset-0 bg-black/85 backdrop-blur-xs;
}

.export-modal-panel {
  @apply relative w-[90%] max-w-110 rounded-xl border border-(--c-export-border) bg-(--c-export-surface) p-8 text-center text-white z-10000;
  box-shadow: 0 16px 48px var(--c-overlay-black-60);
}

.export-modal-title {
  @apply mb-2 text-xl font-bold text-white;
}

.export-modal-status {
  @apply mb-5 min-h-[1.2rem] text-[0.9rem] text-(--c-export-text-muted);
}

.export-progress-track {
  @apply mb-6 h-2 w-full overflow-hidden rounded bg-(--c-export-track);
}

.export-progress-fill {
  @apply h-full rounded transition-[width] duration-150 ease-in-out;
  background: linear-gradient(90deg, var(--c-export-progress-start), var(--c-export-progress-end));
}

.complete-icon {
  @apply mb-2 text-[2.5rem];
}

.complete-description {
  @apply mb-6 text-[0.9rem] break-all text-(--c-export-text-soft);
}

.export-modal-actions {
  @apply flex justify-center gap-3;
}

.export-btn {
  @apply inline-flex cursor-pointer items-center justify-center rounded-md border-none px-6 py-[0.6rem] text-[0.9rem] font-semibold no-underline transition-[background_opacity] duration-150 ease-in-out;
}

.export-btn-cancel {
  @apply bg-(--c-export-cancel) text-white;
}

.export-btn-cancel:hover {
  @apply bg-(--c-export-cancel-hover);
}

.export-btn-download {
  @apply bg-(--c-export-download) text-white;
}

.export-btn-download:hover {
  @apply bg-(--c-export-download-hover);
}

.export-btn-close {
  @apply border border-(--c-export-close-border) bg-(--c-export-close) text-white;
}

.export-btn-close:hover {
  @apply bg-(--c-export-close-hover);
}
</style>
