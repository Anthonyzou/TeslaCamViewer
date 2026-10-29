<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    id="driveManagementModal"
    @keydown.esc="close"
    @mousedown="close"
    @click="close"
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
import { drivesStore } from '../composables/useDrives';
import { eventsStore } from '../composables/useEvents';
import { folderManager } from '../composables/useFolderManager';
import { useI18n } from '../composables/useI18n';
import { driveSetupModalStore, useModals } from '../composables/useModals';
import type { DriveInfo, TeslaCamEvent } from '../types';

const { isDriveManagementOpen: isOpen, driveManagementModal } = useModals();
const { t } = useI18n();
const drivesList = ref<DriveInfo[]>([]);

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

function getEventCountText(drive: DriveInfo): string {
  if (drive.isArchive && (!drive.events || drive.events.length === 0)) {
    return t('driveManager.notLoaded');
  }
  const count = drive.events?.length || 0;
  return `${count} ${t('driveManager.events')}`;
}

function getDateFilterText(drive: DriveInfo): string {
  if (!drive.dateFilter || drive.dateFilter === 'all') return '';
  return folderManager?.getDateFilterLabel(drive.dateFilter) || '';
}

function onColorInput(drive: DriveInfo, e: Event): void {
  drive.color = (e.target as HTMLInputElement).value;
}

async function onColorChange(drive: DriveInfo, e: Event): Promise<void> {
  const newColor = (e.target as HTMLInputElement).value;
  drive.color = newColor;
  await folderManager.updateDriveColor(drive.id, newColor);
  eventsStore.allEvents.forEach((ev: TeslaCamEvent) => {
    if (ev.driveId === drive.id) {
      ev.driveColor = newColor;
    }
  });
}

async function onLabelChange(drive: DriveInfo, e: Event): Promise<void> {
  const newLabel = (e.target as HTMLInputElement).value.trim();
  if (!newLabel) return;
  drive.label = newLabel;
  await folderManager.updateDriveLabel(drive.id, newLabel);
}

async function handleSync(driveId: string): Promise<void> {
  close();
  await drivesStore.syncArchiveDrive(driveId);
}

async function handleEdit(driveId: string): Promise<void> {
  if (!folderManager) return;
  const drive = folderManager.getDrive(driveId);
  if (!drive) return;

  const oldDateFilter = drive.dateFilter;
  const oldIsArchive = drive.isArchive;

  close();
  const settings = await driveSetupModalStore.promptSetup(null, drive);
  if (settings && !settings.changeFolder) {
    await folderManager.updateDriveSettings(driveId, settings);
    const filterChanged = oldDateFilter !== settings.dateFilter;
    const archiveChanged = oldIsArchive !== settings.isArchive;

    if (archiveChanged || filterChanged) {
      await drivesStore.reloadDriveEvents(driveId, settings);
    }
  }
  open();
}

async function handleRemove(driveId: string): Promise<void> {
  if (confirm('Remove this drive? Events will no longer be shown.')) {
    await drivesStore.removeDrive(driveId);
    refreshDrives();
  }
}

async function handleAddDrive(): Promise<void> {
  close();
  await drivesStore.addNewDrive();
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

<style scoped>
@reference "tailwindcss";

/* Drive management modal */
.drive-management-modal {
  @apply max-w-[500px];
}

.drive-list {
  @apply mb-4 flex flex-col gap-3;
}

.drive-item {
  @apply flex items-center gap-3 rounded-lg border border-(--border) bg-(--bg-tertiary) p-3;
}

.drive-color-dot {
  @apply size-3 shrink-0 rounded-full;
}

.drive-color-picker {
  @apply relative shrink-0 cursor-pointer;
}

.drive-color-input {
  @apply absolute size-6 cursor-pointer opacity-0;
}

.drive-color-preview {
  @apply size-6 rounded-full border-2 border-(--border) transition-all duration-200;
}

.drive-color-picker:hover .drive-color-preview {
  @apply scale-110 border-(--accent);
}

.drive-label-input {
  @apply flex-1 rounded border border-transparent bg-(--bg-primary) px-2 py-1.5 font-(family-name:--font-ui) text-[0.85rem] text-(--text-primary);
}

.drive-label-input:hover {
  @apply border-(--border);
}

.drive-label-input:focus {
  @apply border-(--accent) outline-none;
}

.drive-event-count {
  @apply text-xs whitespace-nowrap text-(--text-muted);
  font-family: var(--font-mono);
}

.drive-remove-btn {
  @apply flex cursor-pointer items-center rounded p-1 text-(--text-muted) transition-all duration-200;
}

.drive-remove-btn:hover {
  @apply bg-[rgba(255,82,82,0.1)] text-[#ff5252];
}
</style>
