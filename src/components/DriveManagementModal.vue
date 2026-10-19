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
        <button
          class="modal-close-btn"
          id="closeDriveModal"
          :title="t('common.close')"
          @click="close"
        >
          <X :size="20" />
        </button>
      </div>

      <div class="modal-content">
        <p
          v-if="drivesList.length === 0"
          style="color: var(--text-muted); text-align: center"
        >
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
            <label
              class="drive-color-picker"
              :title="t('driveManager.changeColor')"
            >
              <input
                type="color"
                class="drive-color-input"
                :value="drive.color"
                @input="onColorInput(drive, $event)"
                @change="onColorChange(drive, $event)"
              />
              <div
                class="drive-color-preview"
                :style="{ background: drive.color }"
              ></div>
            </label>

            <!-- Drive Info & Label -->
            <div style="flex: 1; min-width: 0">
              <div style="display: flex; align-items: center; gap: 0.5rem">
                <input
                  type="text"
                  class="drive-label-input"
                  :value="drive.label"
                  style="flex: 1"
                  @change="onLabelChange(drive, $event)"
                />
                <span v-if="drive.isArchive" class="drive-archive-badge">
                  {{ t('driveManager.archive') }}
                </span>
              </div>
              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  margin-top: 0.25rem;
                "
              >
                <span class="drive-event-count">{{
                  getEventCountText(drive)
                }}</span>
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
              <RefreshCw :size="14" style="margin-right: 4px" />
              {{ t('driveManager.sync') }}
            </button>

            <!-- Edit Button -->
            <button
              class="drive-edit-btn"
              :title="t('driveManager.editDrive')"
              style="
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
              "
              @click="handleEdit(drive.id)"
            >
              <Pencil :size="16" />
            </button>

            <!-- Remove Button -->
            <button
              class="drive-remove-btn"
              :title="t('driveManager.removeDrive')"
              @click="handleRemove(drive.id)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>

        <!-- Add Drive Button -->
        <button
          class="btn btn-primary"
          id="addDriveModalBtn"
          style="width: 100%; margin-top: 1rem"
          @click="handleAddDrive"
        >
          <Plus :size="16" style="margin-right: 0.5rem" />
          {{ t('driveManager.addDrive') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '../composables/useI18n';
import { useModals } from '../composables/useModals';
import { folderManager } from '../services/folderManager';

const { isDriveManagementOpen: isOpen, driveManagementModal } = useModals();
const { t } = useI18n();
const drivesList = ref<any[]>([]);
let mouseDownOnOverlay = false;

function refreshDrives(): void {
  drivesList.value = folderManager.getDrives() || [];
}

function open(): void {
  refreshDrives();
  driveManagementModal.open();
}

function close(): void {
  driveManagementModal.close();
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
  return folderManager?.getDateFilterLabel(drive.dateFilter) || '';
}

function onColorInput(drive: any, e: Event): void {
  drive.color = (e.target as HTMLInputElement).value;
}

async function onColorChange(drive: any, e: Event): Promise<void> {
  const newColor = (e.target as HTMLInputElement).value;
  drive.color = newColor;
  const app = window.app;
  await folderManager.updateDriveColor(drive.id, newColor);
  if (Array.isArray(app.allEvents)) {
    app.allEvents.forEach((ev: any) => {
      if (ev.driveId === drive.id) {
        ev.driveColor = newColor;
      }
    });
  }
}

async function onLabelChange(drive: any, e: Event): Promise<void> {
  const newLabel = (e.target as HTMLInputElement).value.trim();
  if (!newLabel) return;
  drive.label = newLabel;
  await folderManager.updateDriveLabel(drive.id, newLabel);
}

async function handleSync(driveId: string): Promise<void> {
  close();
  const app = window.app;
  if (app?.syncArchiveDrive) {
    await app.syncArchiveDrive(driveId);
  }
}

async function handleEdit(driveId: string): Promise<void> {
  const app = window.app;
  if (!folderManager) return;
  const drive = folderManager.getDrive(driveId);
  if (!drive) return;

  const oldDateFilter = drive.dateFilter;
  const oldIsArchive = drive.isArchive;

  close();
  const settings = await app.showDriveSetupDialog(null, drive);
  if (settings && !settings.changeFolder) {
    await folderManager.updateDriveSettings(driveId, settings);
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
    const app = window.app;
    if (folderManager) {
      await folderManager.removeDrive(driveId);
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
  const app = window.app;
  if (app?.addNewDrive) {
    await app.addNewDrive();
  }
}

onMounted(() => {
  driveManagementModal.registerRefreshHandler(refreshDrives);
});

onUnmounted(() => {
  driveManagementModal.unregisterRefreshHandler();
});

defineExpose({
  open,
  close,
  refreshDrives,
  isOpen,
});
</script>
