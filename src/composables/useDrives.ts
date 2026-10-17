import { onMounted, onUnmounted, ref } from 'vue';
import { folderManager } from '../services/folderManager';
import type { DriveInfo } from '../types';

/**
 * useDrives - Composable for local folder selection, multi-drive support, and B2 cloud loading
 */
export function useDrives() {
  const drives = ref<DriveInfo[]>([]);
  const activeDriveId = ref<string>('');

  function syncDrives(): void {
    const currentDrives = folderManager.drives;
    if (
      Array.isArray(currentDrives) &&
      currentDrives.length !== drives.value.length
    ) {
      drives.value = [...currentDrives];
    }

    const currentActive = folderManager.activeDriveId || '';
    if (activeDriveId.value !== currentActive) {
      activeDriveId.value = currentActive;
    }
  }

  let syncTimer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    syncDrives();
    syncTimer = setInterval(syncDrives, 500);
  });

  onUnmounted(() => {
    if (syncTimer) clearInterval(syncTimer);
  });

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
