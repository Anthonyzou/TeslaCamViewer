import { ref, onMounted, onUnmounted } from 'vue';
import type { DriveInfo } from '../types';

/**
 * useDrives - Composable for local folder selection, multi-drive support, and B2 cloud loading
 */
export function useDrives() {
  const drives = ref<DriveInfo[]>([]);
  const activeDriveId = ref<string>('');

  function syncDrives(): void {
    const app = (window as any).app;
    if (!app?.folderManager) return;

    const currentDrives = app.folderManager.drives;
    if (Array.isArray(currentDrives) && currentDrives.length !== drives.value.length) {
      drives.value = [...currentDrives];
    }

    const currentActive = app.folderManager.activeDriveId || '';
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
    (window as any).app?.selectFolder();
    syncDrives();
  }

  function loadB2(): void {
    (window as any).app?.loadFromB2();
    syncDrives();
  }

  function changeDrive(id: string): void {
    activeDriveId.value = id;
    (window as any).app?.folderManager?.switchDrive(id || null);
  }

  function manageDrives(): void {
    (window as any).app?.showDriveManagementModal();
  }

  function addDrive(): void {
    (window as any).app?.addNewDrive();
  }

  async function refreshDrives(): Promise<void> {
    await (window as any).app?.refreshDrives();
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
