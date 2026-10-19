import { getCurrentInstance, onMounted, onUnmounted, ref, type Ref } from 'vue';
import { folderManager } from '../services/folderManager';
import type { DriveInfo } from '../types';

const drives: Ref<DriveInfo[]> = ref([]);
const activeDriveId: Ref<string> = ref('');

function syncDrives(): void {
  const currentDrives = folderManager.drives;
  if (Array.isArray(currentDrives)) {
    drives.value = [...currentDrives];
  }

  const currentActive = folderManager.activeDriveId || '';
  if (activeDriveId.value !== currentActive) {
    activeDriveId.value = currentActive;
  }
}

/**
 * useDrives - Composable for local folder selection, multi-drive support, and B2 cloud loading
 */
export function useDrives() {
  syncDrives();

  if (getCurrentInstance()) {
    let unsubscribe: (() => void) | null = null;

    onMounted(() => {
      syncDrives();
      unsubscribe = folderManager.addDrivesChangedListener(() => {
        syncDrives();
      });
    });

    onUnmounted(() => {
      if (unsubscribe) unsubscribe();
    });
  }

  function selectFolder(): void {
    window.app?.selectFolder();
    syncDrives();
  }

  function loadB2(): void {
    window.app?.loadFromB2();
    syncDrives();
  }

  function changeDrive(id: string): void {
    activeDriveId.value = id;
    folderManager?.switchDrive(id || null);
    window.app?.changeDrive(id || null);
    syncDrives();
  }

  function manageDrives(): void {
    window.app?.showDriveManagementModal();
  }

  function addDrive(): void {
    window.app?.addNewDrive();
  }

  async function refreshDrives(): Promise<void> {
    await window.app?.refreshDrives();
    syncDrives();
  }

  return {
    drives,
    activeDriveId,
    selectFolder,
    loadB2,
    changeDrive,
    manageDrives,
    addDrive,
    refreshDrives,
    syncDrives,
  };
}
