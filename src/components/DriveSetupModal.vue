<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    id="driveSetupModal"
    @keydown.esc="cancel"
    @mousedown="onOverlayMouseDown"
    @click="onOverlayClick"
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

const { isDriveSetupOpen: isOpen, driveSetupModal } = useModals();
const { t } = useI18n();
const isEdit = ref(false);
const folderName = ref('');
const label = ref('');
const dateFilter = ref('all');
const isArchive = ref(false);

let mouseDownOnOverlay = false;
let resolver: ((val: any) => void) | null = null;

function promptSetup(handle: any, existingDrive: any = null): Promise<any> {
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

function onOverlayMouseDown(e: MouseEvent): void {
  mouseDownOnOverlay = (e.target as HTMLElement).classList.contains(
    'modal-overlay'
  );
}

function onOverlayClick(e: MouseEvent): void {
  if (
    mouseDownOnOverlay &&
    (e.target as HTMLElement).classList.contains('modal-overlay')
  ) {
    cancel();
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
