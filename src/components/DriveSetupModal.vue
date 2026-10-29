<template>
  <div v-if="isOpen" class="modal-overlay" id="driveSetupModal" @keydown.esc="cancel" @mousedown="close" @click="close">
    <div class="modal drive-setup-modal" @click.stop>
      <div class="modal-header">
        <h3>
          {{ isEdit ? t('driveSetup.editTitle') : t('driveSetup.title') }}
        </h3>
        <button class="modal-close-btn" id="closeDriveSetup" :title="t('common.close')" @click="cancel">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-content">
        <div class="drive-setup-selected">
          <Folder :size="20" class="icon-mr-2" />
          <span>{{ folderName }}</span>
        </div>

        <div v-if="!isEdit" class="drive-setup-tip">
          <div class="drive-setup-tip-header">
            <Info :size="16" class="icon-mr-1-5" />
            {{ t('driveSetup.tipTitle') }}
          </div>
          <ul>
            <li>{{ t('driveSetup.tipTeslaCam') }}</li>
            <li>{{ t('driveSetup.tipSubfolder') }}</li>
            <li>{{ t('driveSetup.tipParent') }}</li>
          </ul>
        </div>

        <div class="drive-setup-form">
          <div class="drive-setup-field">
            <label for="driveLabel">{{ t('driveSetup.labelField') }}</label>
            <input type="text" id="driveLabel" v-model="label" :placeholder="t('driveSetup.labelPlaceholder')" />
          </div>

          <div class="drive-setup-field">
            <label for="dateFilter">{{
              t('driveSetup.dateFilterField')
              }}</label>
            <select id="dateFilter" v-model="dateFilter">
              <option value="all">{{ t('driveSetup.dateFilterAll') }}</option>
              <option value="week">{{ t('driveSetup.dateFilterWeek') }}</option>
              <option value="month">
                {{ t('driveSetup.dateFilterMonth') }}
              </option>
              <option value="3months">
                {{ t('driveSetup.dateFilter3Months') }}
              </option>
              <option value="6months">
                {{ t('driveSetup.dateFilter6Months') }}
              </option>
              <option value="year">{{ t('driveSetup.dateFilterYear') }}</option>
            </select>
          </div>

          <label class="drive-setup-checkbox">
            <input type="checkbox" id="isArchive" v-model="isArchive" />
            <div class="drive-setup-checkbox-content">
              <div class="drive-setup-checkbox-label">
                {{ t('driveSetup.archiveLabel') }}
              </div>
              <div class="drive-setup-checkbox-hint">
                {{ t('driveSetup.archiveHint') }}
              </div>
            </div>
          </label>
        </div>

        <div class="drive-setup-actions">
          <button v-if="!isEdit" class="btn btn-secondary" id="changeFolderBtn" @click="changeFolder">
            {{ t('driveSetup.changeFolder') }}
          </button>
          <button class="btn btn-primary" id="confirmDriveSetup" @click="confirmSetup">
            {{ isEdit ? t('driveSetup.save') : t('driveSetup.addDrive') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Folder, Info, X } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '../composables/useI18n';
import { useModals } from '../composables/useModals';
import type { DriveInfo } from '../types';

export interface DriveSetupOptions {
  label?: string;
  isArchive?: boolean;
  dateFilter?: string;
  changeFolder?: boolean;
}

const { isDriveSetupOpen: isOpen, driveSetupModal } = useModals();
const { t } = useI18n();
const isEdit = ref(false);
const folderName = ref('');
const label = ref('');
const dateFilter = ref('all');
const isArchive = ref(false);

let resolver: ((val: DriveSetupOptions | null) => void) | null = null;

function promptSetup(
  handle: FileSystemDirectoryHandle | null,
  existingDrive: DriveInfo | null = null
): Promise<DriveSetupOptions | null> {
  return new Promise((resolve) => {
    resolver = resolve;
    isEdit.value = !!existingDrive;
    folderName.value = handle?.name || existingDrive?.folderName || 'Unknown';
    label.value = existingDrive?.label || handle?.name || '';
    dateFilter.value = existingDrive?.dateFilter || 'all';
    isArchive.value = existingDrive?.isArchive || false;
    isOpen.value = true;
  });
}

function close(): void {
  isOpen.value = false;
  if (resolver) {
    resolver(null);
    resolver = null;
  }
}

function cancel(): void {
  close();
}

function changeFolder(): void {
  isOpen.value = false;
  if (resolver) {
    resolver({ changeFolder: true });
    resolver = null;
  }
}

function confirmSetup(): void {
  const chosenLabel = label.value.trim() || folderName.value || 'Drive';
  isOpen.value = false;
  if (resolver) {
    resolver({
      label: chosenLabel,
      dateFilter: dateFilter.value,
      isArchive: isArchive.value,
    });
    resolver = null;
  }
}

onMounted(() => {
  driveSetupModal.registerPromptHandler(promptSetup);
});

onUnmounted(() => {
  driveSetupModal.unregisterPromptHandler();
});

defineExpose({
  promptSetup,
  close,
  isOpen,
});
</script>

<style scoped>
@reference "tailwindcss";

/* Drive Setup Dialog */
.drive-setup-modal {
  @apply max-w-[480px];
}

.drive-setup-modal .modal-content {
  @apply p-5;
}

.drive-setup-selected {
  @apply mb-4 flex items-center gap-2 rounded-lg bg-(--bg-tertiary) p-3 font-mono text-[0.85rem] text-(--text-secondary);
}

.drive-setup-selected svg {
  @apply shrink-0 text-(--accent);
}

.drive-setup-tip {
  @apply mb-5 rounded-lg border border-(--border-accent) bg-(--accent-subtle) p-3.5;
}

.drive-setup-tip-header {
  @apply mb-2 flex items-center gap-2 text-[0.85rem] font-medium text-(--accent);
}

.drive-setup-tip ul {
  @apply m-0 pl-6 text-[0.8rem] leading-[1.6] text-(--text-secondary);
}

.drive-setup-tip li {
  @apply mb-1;
}

.drive-setup-form {
  @apply flex flex-col gap-4;
}

.drive-setup-field {
  @apply flex flex-col gap-1.5;
}

.drive-setup-field label {
  @apply text-[0.8rem] font-medium text-(--text-secondary);
}

.drive-setup-field input[type='text'],
.drive-setup-field select {
  @apply rounded-md border border-(--border) bg-(--bg-tertiary) px-3 py-2.5 font-(family-name:--font-ui) text-[0.9rem] text-(--text-primary);
}

.drive-setup-field input[type='text']:focus,
.drive-setup-field select:focus {
  @apply border-(--accent) outline-none;
}

.drive-setup-checkbox {
  @apply flex cursor-pointer items-center gap-2.5 rounded-md border border-(--border) bg-(--bg-tertiary) p-2.5 transition-all duration-200;
}

.drive-setup-checkbox:hover {
  @apply border-(--accent);
}

.drive-setup-checkbox input[type='checkbox'] {
  @apply h-[18px] w-[18px] cursor-pointer accent-(--accent);
}

.drive-setup-checkbox-content {
  @apply flex-1;
}

.drive-setup-checkbox-label {
  @apply text-[0.9rem] font-medium text-(--text-primary);
}

.drive-setup-checkbox-hint {
  @apply mt-0.5 text-xs text-(--text-muted);
}

.drive-setup-actions {
  @apply mt-2 flex gap-3;
}

.drive-setup-actions .btn {
  @apply flex-1 cursor-pointer rounded-md p-3 font-medium transition-all duration-200;
}

.drive-setup-actions .btn-secondary {
  @apply border border-(--border) bg-(--bg-tertiary) text-(--text-secondary);
}

.drive-setup-actions .btn-secondary:hover {
  @apply border-(--text-muted) text-(--text-primary);
}

.drive-setup-actions .btn-primary {
  @apply border-none bg-(--accent) text-(--bg-void);
}

.drive-setup-actions .btn-primary:hover {
  @apply bg-(--accent-hover);
}
</style>
