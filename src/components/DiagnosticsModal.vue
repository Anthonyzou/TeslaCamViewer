<template>
  <div v-if="isOpen" class="diagnostic-modal-backdrop" @keydown.esc="close">
    <div class="diagnostic-modal-overlay" @click="onOverlayClick"></div>
    <div class="diagnostic-modal-container">
      <div class="diagnostic-modal-header">
        <div class="diagnostic-modal-title">
          <span class="diagnostic-icon">🔍</span>
          <h3>Diagnostic & Bug Report</h3>
        </div>
        <button class="diagnostic-close-btn" @click="close" title="Close">
          <X :size="20" />
        </button>
      </div>

      <div class="diagnostic-modal-body">
        <p class="diagnostic-description">
          Copy this diagnostic report and paste it when submitting a GitHub
          issue to help us debug and resolve the problem quickly.
        </p>
        <textarea
          ref="textareaRef"
          readonly
          class="diagnostic-textarea"
          :value="report"
        ></textarea>
      </div>

      <div class="diagnostic-modal-footer">
        <a
          href="https://github.com/teslacamviewer/teslacamviewer.github.io/issues/new"
          target="_blank"
          class="diagnostic-btn primary"
        >
          🐛 Open GitHub Issue
        </a>
        <button class="diagnostic-btn select-all" @click="selectAll">
          Select All
        </button>
        <button class="diagnostic-btn copy-btn" @click="copyReport">
          Copy to Clipboard
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { ref } from 'vue';
import { useModals } from '../composables/useModals';

const {
  isDiagnosticsOpen: isOpen,
  diagnosticsReport: report,
  diagnosticsModal,
} = useModals();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

function open(reportText?: string): void {
  diagnosticsModal.open(reportText);
}

function close(): void {
  diagnosticsModal.close();
}

function onOverlayClick(e: MouseEvent): void {
  if (
    (e.target as HTMLElement).classList.contains('diagnostic-modal-overlay')
  ) {
    close();
  }
}

function selectAll(): void {
  if (textareaRef.value) {
    textareaRef.value.select();
    textareaRef.value.setSelectionRange(0, textareaRef.value.value.length);
  }
}

async function copyReport(): Promise<void> {
  if (!report.value) return;
  try {
    await navigator.clipboard.writeText(report.value);
    alert('📋 Diagnostic report copied to clipboard!');
  } catch {
    selectAll();
  }
}

defineExpose({
  open,
  close,
  isOpen,
});
</script>
