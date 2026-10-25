<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    id="driveSetupModal"
    @keydown.esc="cancel"
    @mousedown="close"
    @click="close"
  >
    <div class="modal drive-setup-modal" @click.stop>
      <div class="modal-header">
        <h3>
          {{ isEdit ? t('driveSetup.editTitle') : t('driveSetup.title') }}
        </h3>
        <button
          class="modal-close-btn"
          id="closeDriveSetup"
          :title="t('common.close')"
          @click="cancel"
        >
          <X :size="20" />
        </button>
      </div>

      <div class="modal-content">
        <div class="drive-setup-selected">
          <Folder :size="20" style="margin-right: 8px" />
          <span>{{ folderName }}</span>
        </div>

        <div v-if="!isEdit" class="drive-setup-tip">
          <div class="drive-setup-tip-header">
            <Info :size="16" style="margin-right: 6px" />
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
            <input
              type="text"
              id="driveLabel"
              v-model="label"
              :placeholder="t('driveSetup.labelPlaceholder')"
            />
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
          <button
            v-if="!isEdit"
            class="btn btn-secondary"
            id="changeFolderBtn"
            @click="changeFolder"
          >
            {{ t('driveSetup.changeFolder') }}
          </button>
          <button
            class="btn btn-primary"
            id="confirmDriveSetup"
            @click="confirmSetup"
          >
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
/* Drive Setup Dialog */
.drive-setup-modal {
  max-width: 480px;
}

.drive-setup-modal .modal-content {
  padding: 1.25rem;
}

.drive-setup-selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 8px;
  margin-bottom: 1rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.drive-setup-selected svg {
  color: var(--accent);
  flex-shrink: 0;
}

.drive-setup-tip {
  background: var(--accent-subtle);
  border: 1px solid var(--border-accent);
  border-radius: 8px;
  padding: 0.875rem;
  margin-bottom: 1.25rem;
}

.drive-setup-tip-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--accent);
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.drive-setup-tip ul {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.6;
}

.drive-setup-tip li {
  margin-bottom: 0.25rem;
}

.drive-setup-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drive-setup-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.drive-setup-field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.drive-setup-field input[type='text'],
.drive-setup-field select {
  padding: 0.625rem 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 0.9rem;
}

.drive-setup-field input[type='text']:focus,
.drive-setup-field select:focus {
  outline: none;
  border-color: var(--accent);
}

.drive-setup-checkbox {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  padding: 0.625rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}

.drive-setup-checkbox:hover {
  border-color: var(--accent);
}

.drive-setup-checkbox input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  cursor: pointer;
}

.drive-setup-checkbox-content {
  flex: 1;
}

.drive-setup-checkbox-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}

.drive-setup-checkbox-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.drive-setup-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.drive-setup-actions .btn {
  flex: 1;
  padding: 0.75rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.drive-setup-actions .btn-secondary {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

.drive-setup-actions .btn-secondary:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.drive-setup-actions .btn-primary {
  background: var(--accent);
  border: none;
  color: var(--bg-void);
}

.drive-setup-actions .btn-primary:hover {
  background: var(--accent-hover);
}
</style>
