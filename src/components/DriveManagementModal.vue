<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    id="driveManagementModal"
    @keydown.esc="close"
    @mousedown="onOverlayMouseDown"
    @click="onOverlayClick"
  >
    <div class="modal drive-management-modal" @click.stop>
      <div class="modal-header">
        <h3>{{ t('driveManager.title') }}</h3>
        <button class="modal-close-btn" id="closeDriveModal" :title="t('common.close')" @click="close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>

      <div class="modal-content">
        <p v-if="drivesList.length === 0" style="color: var(--text-muted); text-align: center;">
          {{ t('driveManager.noDrives') }}
        </p>

        <div v-else class="drive-list">
          <div
            v-for="drive in drivesList"
            :key="drive.id"
            class="drive-item"
            :class="{ 'is-archive': drive.isArchive }"
            :data-drive-id="drive.id"
          >
            <!-- Color Picker -->
            <label class="drive-color-picker" :title="t('driveManager.changeColor')">
              <input
                type="color"
                class="drive-color-input"
                :value="drive.color"
                @input="onColorInput(drive, $event)"
                @change="onColorChange(drive, $event)"
              />
              <div class="drive-color-preview" :style="{ background: drive.color }"></div>
            </label>

            <!-- Drive Info & Label -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input
                  type="text"
                  class="drive-label-input"
                  :value="drive.label"
                  style="flex: 1;"
                  @change="onLabelChange(drive, $event)"
                />
                <span v-if="drive.isArchive" class="drive-archive-badge">
                  {{ t('driveManager.archive') }}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                <span class="drive-event-count">{{ getEventCountText(drive) }}</span>
                <span v-if="getDateFilterText(drive)" class="drive-date-filter">
                  • {{ getDateFilterText(drive) }}
                </span>
              </div>
            </div>

            <!-- Sync Button (for archive drives) -->
            <button
              v-if="drive.isArchive"
              class="drive-sync-btn"
              :title="t('driveManager.syncNow')"
              @click="handleSync(drive.id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
                />
              </svg>
              {{ t('driveManager.sync') }}
            </button>

            <!-- Edit Button -->
            <button
              class="drive-edit-btn"
              :title="t('driveManager.editDrive')"
              style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; border-radius: 4px;"
              @click="handleEdit(drive.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                />
              </svg>
            </button>

            <!-- Remove Button -->
            <button
              class="drive-remove-btn"
              :title="t('driveManager.removeDrive')"
              @click="handleRemove(drive.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Add Drive Button -->
        <button
          class="btn btn-primary"
          id="addDriveModalBtn"
          style="width: 100%; margin-top: 1rem;"
          @click="handleAddDrive"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem;">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          {{ t('driveManager.addDrive') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const isOpen = ref(false);
const drivesList = ref<any[]>([]);
const localeTick = ref(0);
let mouseDownOnOverlay = false;

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

function refreshDrives(): void {
  const app = (window as any).app;
  if (app?.folderManager) {
    drivesList.value = app.folderManager.getDrives() || [];
  }
}

function open(): void {
  refreshDrives();
  isOpen.value = true;
}

function close(): void {
  isOpen.value = false;
}

function onOverlayMouseDown(e: MouseEvent): void {
  mouseDownOnOverlay = (e.target as HTMLElement).classList.contains('modal-overlay');
}

function onOverlayClick(e: MouseEvent): void {
  if (mouseDownOnOverlay && (e.target as HTMLElement).classList.contains('modal-overlay')) {
    close();
  }
}

function getEventCountText(drive: any): string {
  if (drive.isArchive && (!drive.events || drive.events.length === 0)) {
    return t('driveManager.notLoaded');
  }
  const count = drive.events?.length || 0;
  return `${count} ${t('driveManager.events')}`;
}

function getDateFilterText(drive: any): string {
  if (!drive.dateFilter || drive.dateFilter === 'all') return '';
  const app = (window as any).app;
  return app?.folderManager?.getDateFilterLabel(drive.dateFilter) || '';
}

function onColorInput(drive: any, e: Event): void {
  drive.color = (e.target as HTMLInputElement).value;
}

async function onColorChange(drive: any, e: Event): Promise<void> {
  const newColor = (e.target as HTMLInputElement).value;
  drive.color = newColor;
  const app = (window as any).app;
  if (app?.folderManager) {
    await app.folderManager.updateDriveColor(drive.id, newColor);
    if (Array.isArray(app.allEvents)) {
      app.allEvents.forEach((ev: any) => {
        if (ev.driveId === drive.id) {
          ev.driveColor = newColor;
        }
      });
    }
    app.eventBrowser?.render(app.filteredEvents);
  }
}

async function onLabelChange(drive: any, e: Event): Promise<void> {
  const newLabel = (e.target as HTMLInputElement).value.trim();
  if (!newLabel) return;
  drive.label = newLabel;
  const app = (window as any).app;
  if (app?.folderManager) {
    await app.folderManager.updateDriveLabel(drive.id, newLabel);
    app.eventBrowser?.render(app.filteredEvents);
  }
}

async function handleSync(driveId: string): Promise<void> {
  close();
  const app = (window as any).app;
  if (app?.syncArchiveDrive) {
    await app.syncArchiveDrive(driveId);
  }
}

async function handleEdit(driveId: string): Promise<void> {
  const app = (window as any).app;
  if (!app?.folderManager) return;
  const drive = app.folderManager.getDrive(driveId);
  if (!drive) return;

  const oldDateFilter = drive.dateFilter;
  const oldIsArchive = drive.isArchive;

  close();
  const settings = await app.showDriveSetupDialog(null, drive);
  if (settings && !settings.changeFolder) {
    await app.folderManager.updateDriveSettings(driveId, settings);
    const filterChanged = oldDateFilter !== settings.dateFilter;
    const archiveChanged = oldIsArchive !== settings.isArchive;

    if (archiveChanged || filterChanged) {
      await app.reloadDriveEvents(driveId, settings);
    }
    open();
  } else {
    open();
  }
}

async function handleRemove(driveId: string): Promise<void> {
  if (confirm('Remove this drive? Events will no longer be shown.')) {
    const app = (window as any).app;
    if (app?.folderManager) {
      await app.folderManager.removeDrive(driveId);
      if (Array.isArray(app.allEvents)) {
        app.allEvents = app.allEvents.filter((e: any) => e.driveId !== driveId);
        app.statisticsManager?.setEvents(app.allEvents);
        app.applyFilters?.();
      }
      refreshDrives();
    }
  }
}

async function handleAddDrive(): Promise<void> {
  close();
  const app = (window as any).app;
  if (app?.addNewDrive) {
    await app.addNewDrive();
  }
}

function onLocaleChanged(): void {
  localeTick.value++;
}

onMounted(() => {
  window.addEventListener('localeChanged', onLocaleChanged);
  (window as any).driveManagementModalInstance = {
    open,
    close,
    refreshDrives,
  };
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
  if ((window as any).driveManagementModalInstance?.open === open) {
    delete (window as any).driveManagementModalInstance;
  }
});

defineExpose({
  open,
  close,
  refreshDrives,
  isOpen,
});
</script>
