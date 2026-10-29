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
@reference "tailwindcss";

.export-modal-backdrop {
  @apply fixed inset-0 z-[9999] flex items-center justify-center;
}

.export-modal-overlay {
  @apply absolute inset-0 bg-black/85 backdrop-blur-[4px];
}

.export-modal-panel {
  @apply relative w-[90%] max-w-[440px] rounded-xl border border-[#333333] bg-[#1e1e1e] p-8 text-center text-white z-10000;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}

.export-modal-title {
  @apply mb-2 text-xl font-bold text-white;
}

.export-modal-status {
  @apply mb-5 min-h-[1.2rem] text-[0.9rem] text-[#a0a0a0];
}

.export-progress-track {
  @apply mb-6 h-2 w-full overflow-hidden rounded bg-[#2d2d2d];
}

.export-progress-fill {
  @apply h-full rounded transition-[width] duration-150 ease-in-out;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}

.complete-icon {
  @apply mb-2 text-[2.5rem];
}

.complete-description {
  @apply mb-6 text-[0.9rem] break-all text-[#9ca3af];
}

.export-modal-actions {
  @apply flex justify-center gap-3;
}

.export-btn {
  @apply inline-flex cursor-pointer items-center justify-center rounded-md border-none px-6 py-[0.6rem] text-[0.9rem] font-semibold no-underline transition-[background,opacity] duration-150 ease-in-out;
}

.export-btn-cancel {
  @apply bg-[#dc2626] text-white;
}

.export-btn-cancel:hover {
  @apply bg-[#b91c1c];
}

.export-btn-download {
  @apply bg-[#2563eb] text-white;
}

.export-btn-download:hover {
  @apply bg-[#1d4ed8];
}

.export-btn-close {
  @apply border border-[#4b5563] bg-[#374151] text-white;
}

.export-btn-close:hover {
  @apply bg-[#4b5563];
}
</style>
