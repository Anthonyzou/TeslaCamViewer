<template>
  <div
    v-if="isOpen"
    class="diagnostic-modal-overlay show"
    @keydown.esc="close"
    @click="onOverlayClick"
  >
    <div class="diagnostic-modal" @click.stop>
      <div class="diagnostic-modal-header">
        <h3>📋 Diagnostic Report</h3>
        <button class="diagnostic-modal-close" title="Close" @click="close">
          <X :size="18" />
        </button>
      </div>

      <div class="diagnostic-modal-body">
        <p>Copy the text below and include it in your bug report:</p>
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
import { onMounted, onUnmounted, ref } from 'vue';

const isOpen = ref(false);
const report = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

function open(reportText?: string): void {
  report.value = reportText || '';
  isOpen.value = true;
}

function close(): void {
  isOpen.value = false;
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

onMounted(() => {
  (window as any).diagnosticsModalInstance = {
    open,
    close,
  };
});

onUnmounted(() => {
  if ((window as any).diagnosticsModalInstance?.open === open) {
    delete (window as any).diagnosticsModalInstance;
  }
});

defineExpose({
  open,
  close,
  isOpen,
});
</script>
