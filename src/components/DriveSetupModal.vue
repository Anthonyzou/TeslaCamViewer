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
        <h3>{{ isEdit ? t('driveSetup.editTitle') : t('driveSetup.title') }}</h3>
        <button class="modal-close-btn" id="closeDriveSetup" :title="t('common.close')" @click="cancel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>

      <div class="modal-content">
        <div class="drive-setup-selected">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"
            />
          </svg>
          <span>{{ folderName }}</span>
        </div>

        <div v-if="!isEdit" class="drive-setup-tip">
          <div class="drive-setup-tip-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
              />
            </svg>
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
            <label for="dateFilter">{{ t('driveSetup.dateFilterField') }}</label>
            <select id="dateFilter" v-model="dateFilter">
              <option value="all">{{ t('driveSetup.dateFilterAll') }}</option>
              <option value="week">{{ t('driveSetup.dateFilterWeek') }}</option>
              <option value="month">{{ t('driveSetup.dateFilterMonth') }}</option>
              <option value="3months">{{ t('driveSetup.dateFilter3Months') }}</option>
              <option value="6months">{{ t('driveSetup.dateFilter6Months') }}</option>
              <option value="year">{{ t('driveSetup.dateFilterYear') }}</option>
            </select>
          </div>

          <label class="drive-setup-checkbox">
            <input type="checkbox" id="isArchive" v-model="isArchive" />
            <div class="drive-setup-checkbox-content">
              <div class="drive-setup-checkbox-label">{{ t('driveSetup.archiveLabel') }}</div>
              <div class="drive-setup-checkbox-hint">{{ t('driveSetup.archiveHint') }}</div>
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
import { ref, onMounted, onUnmounted } from 'vue';

const isOpen = ref(false);
const isEdit = ref(false);
const folderName = ref('');
const label = ref('');
const dateFilter = ref('all');
const isArchive = ref(false);

const localeTick = ref(0);
let mouseDownOnOverlay = false;
let resolver: ((val: any) => void) | null = null;

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

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
  mouseDownOnOverlay = (e.target as HTMLElement).classList.contains('modal-overlay');
}

function onOverlayClick(e: MouseEvent): void {
  if (mouseDownOnOverlay && (e.target as HTMLElement).classList.contains('modal-overlay')) {
    cancel();
  }
}

function onLocaleChanged(): void {
  localeTick.value++;
}

onMounted(() => {
  window.addEventListener('localeChanged', onLocaleChanged);
  (window as any).driveSetupModalInstance = {
    promptSetup,
    close,
  };
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
  if ((window as any).driveSetupModalInstance?.promptSetup === promptSetup) {
    delete (window as any).driveSetupModalInstance;
  }
});

defineExpose({
  promptSetup,
  close,
  isOpen,
});
</script>
