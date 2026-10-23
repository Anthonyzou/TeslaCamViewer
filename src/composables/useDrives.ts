import { getCurrentInstance, onMounted, onUnmounted, ref, type Ref } from 'vue';
import { b2Client } from './useB2';
import { folderManager } from './useFolderManager';
import { folderParser } from './useFolderParser';
import { settingsStore } from './useSettings';
import type { DriveInfo, TeslaCamEvent } from '../types';
import { eventsStore } from './useEvents';
import {
  driveManagementModalStore,
  driveSetupModalStore,
} from './useModals';

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

export const drivesStore = {
  get drives(): DriveInfo[] {
    return drives.value;
  },
  get activeDriveId(): string {
    return activeDriveId.value;
  },

  async tryRestoreLastFolder(): Promise<void> {
    try {
      await folderManager.loadDrives();

      if (folderManager.drives.length === 0 && folderParser?.hasStoredHandle) {
        const hasStored = await folderParser.hasStoredHandle();
        if (hasStored) {
          const handle = await folderParser.getStoredHandle();
          if (handle) {
            await folderManager.migrateFromLegacy(handle);
          }
        }
      }

      syncDrives();

      if (!settingsStore.get('rememberLastFolder')) {
        return;
      }

      if (folderManager.drives.length === 0) {
        return;
      }

      let restoredAny = false;
      for (const drive of folderManager.drives) {
        if (drive.isArchive || !drive.handle) continue;

        try {
          let permission = 'prompt';
          permission = await drive.handle.queryPermission?.({ mode: 'read' });
          if (permission === 'granted') {
            folderParser.setDriveContext(drive.id, drive.label, drive.color);
            folderParser.rootHandle = drive.handle;
            const events = await folderParser.parseFolder();
            const cutoff = folderManager.getDateFilterCutoff(drive.dateFilter);
            drive.events = cutoff
              ? events.filter(
                  (ev: TeslaCamEvent) => new Date(ev.timestamp) >= cutoff
                )
              : events;

            for (const event of drive.events) {
              event.driveId = drive.id;
              event.compoundKey = folderManager.getCompoundKey(
                drive.id,
                event.name
              );
              event.driveLabel = drive.label;
              event.driveColor = drive.color;
            }
            restoredAny = true;
          }
        } catch (e) {
          console.warn(`[useDrives] Could not restore drive ${drive.label}:`, e);
        }
      }

      if (restoredAny) {
        const firstActive = folderManager.drives.find(
          (d: DriveInfo) => !d.isArchive && (d.events?.length ?? 0) > 0
        );
        if (firstActive) {
          folderManager.setActiveDrive(firstActive.id);
        }
        eventsStore.setAllEvents(folderManager.getAllEvents());
        syncDrives();
        if (eventsStore.filteredEvents.length > 0) {
          await eventsStore.selectEvent(eventsStore.filteredEvents[0]);
        }
      }
    } catch (e) {
      console.warn('[useDrives] Could not restore drives:', e);
    }
  },

  async selectFolder(): Promise<void> {
    if (typeof window === 'undefined' || !window.showDirectoryPicker) return;

    let handle: FileSystemDirectoryHandle | null = null;
    while (true) {
      try {
        handle = await window.showDirectoryPicker();
      } catch (error: unknown) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[useDrives] Error selecting folder:', error);
        }
        return;
      }

      const settings = await driveSetupModalStore.promptSetup(handle);
      if (!settings) return;
      if (settings.changeFolder) continue;

      try {
        const drive = await folderManager.addDrive(handle, {
          label: settings.label,
          isArchive: settings.isArchive,
          dateFilter: settings.dateFilter,
        });

        if (settings.isArchive) {
          syncDrives();
          return;
        }

        folderParser.setDriveContext(drive.id, drive.label, drive.color);
        folderParser.rootHandle = handle;
        const events = await folderParser.parseFolder();

        drive.events = events;
        folderManager.setActiveDrive(drive.id);
        eventsStore.setAllEvents(folderManager.getAllEvents());
        syncDrives();

        if (eventsStore.filteredEvents.length > 0) {
          await eventsStore.selectEvent(eventsStore.filteredEvents[0]);
        }

        if (settingsStore.get('rememberLastFolder')) {
          await folderParser.saveFolderHandle();
        }
      } catch (error) {
        console.error('[useDrives] Error parsing folder:', error);
      }
      break;
    }
  },

  async loadB2(forceRefresh: boolean = false): Promise<void> {
    try {
      const result = await b2Client.parseBucket(
        undefined,
        undefined,
        undefined,
        forceRefresh
      );
      if (!result?.events) throw new Error('No events found in B2 bucket');

      const events = result.events;
      const b2Drive = await folderManager.addOrUpdateB2Drive(events);

      folderManager.activeDriveId = b2Drive.id;
      eventsStore.setAllEvents(folderManager.getAllEvents());
      syncDrives();

      if (eventsStore.filteredEvents.length > 0) {
        await eventsStore.selectEvent(eventsStore.filteredEvents[0]);
      }
    } catch (error: any) {
      console.error('[useDrives] B2 Load Error:', error);
    }
  },

  async changeDrive(driveId: string | null): Promise<void> {
    const targetId = driveId || null;
    folderManager.setActiveDrive(targetId);
    activeDriveId.value = targetId || '';

    if (
      typeof window !== 'undefined' &&
      window.app?.changeDrive &&
      window.app.changeDrive !== drivesStore.changeDrive
    ) {
      window.app.changeDrive(targetId);
    }

    if (targetId) {
      const drive = folderManager.getDrive(targetId);
      if (
        drive &&
        drive.handle &&
        (!drive.events || drive.events.length === 0)
      ) {
        try {
          let permission = 'prompt';
          permission = await drive.handle?.queryPermission?.({ mode: 'read' });
          if (permission !== 'granted') {
            permission = await drive.handle.requestPermission?.({
              mode: 'read',
            });
          }
          if (permission === 'granted') {
            await folderManager.parseSingleDrive(folderParser, targetId);
          }
        } catch (err) {
          console.warn(`[useDrives] Failed to access drive ${drive.label}:`, err);
        }
      }
    }

    eventsStore.setAllEvents(folderManager.getAllEvents());
    syncDrives();

    if (
      eventsStore.filteredEvents.length > 0 &&
      (!eventsStore.currentEvent ||
        !eventsStore.filteredEvents.some(
          (e) => e.name === eventsStore.currentEvent?.name
        ))
    ) {
      await eventsStore.selectEvent(eventsStore.filteredEvents[0]);
    }
  },

  async addNewDrive(): Promise<void> {
    if (typeof window === 'undefined' || !window.showDirectoryPicker) return;

    let handle: FileSystemDirectoryHandle | null = null;
    while (true) {
      try {
        handle = await window.showDirectoryPicker();
      } catch (error: unknown) {
        if ((error as Error).name !== 'AbortError') {
          console.error('[useDrives] Error selecting folder:', error);
        }
        return;
      }

      const settings = await driveSetupModalStore.promptSetup(handle);
      if (!settings) return;
      if (settings.changeFolder) continue;

      try {
        const drive = await folderManager.addDrive(handle, {
          label: settings.label,
          isArchive: settings.isArchive,
          dateFilter: settings.dateFilter,
        });

        if (!settings.isArchive) {
          folderParser.setDriveContext(drive.id, drive.label, drive.color);
          folderParser.rootHandle = handle;
          const events = await folderParser.parseFolder();
          drive.events = events;
          eventsStore.setAllEvents(folderManager.getAllEvents());
        }

        syncDrives();
      } catch (e) {
        console.error('[useDrives] Error adding drive:', e);
      }
      break;
    }
  },

  async refreshDrives(): Promise<void> {
    const activeDrive = folderManager?.getActiveDrive();
    if (folderManager.isB2Drive(activeDrive?.id)) {
      await drivesStore.loadB2(true);
      return;
    }

    if (activeDrive?.handle) {
      try {
        folderParser.setDriveContext(
          activeDrive.id,
          activeDrive.label,
          activeDrive.color
        );
        folderParser.rootHandle = activeDrive.handle;
        const events = await folderParser.parseFolder();
        activeDrive.events = events;
        eventsStore.setAllEvents(folderManager.getAllEvents());
        syncDrives();
      } catch (err: any) {
        console.error('[useDrives] Error refreshing drive:', err);
      }
      return;
    }

    const config = await b2Client.getConfig();
    if (config?.isConfigured) {
      await drivesStore.loadB2(true);
    }
  },

  async syncArchiveDrive(driveId: string): Promise<void> {
    const drive = folderManager.getDrive(driveId);
    if (!drive || !drive.handle) return;

    try {
      folderParser.setDriveContext(drive.id, drive.label, drive.color);
      folderParser.rootHandle = drive.handle;
      const events = await folderParser.parseFolder();
      drive.events = events;
      eventsStore.setAllEvents(folderManager.getAllEvents());
      syncDrives();
    } catch (e) {
      console.error('[useDrives] Error syncing archive drive:', e);
    }
  },

  async reloadDriveEvents(driveId: string, settings: any): Promise<void> {
    const drive = folderManager.getDrive(driveId);
    if (!drive) return;

    try {
      if (drive.handle && !settings.isArchive) {
        folderParser.setDriveContext(drive.id, drive.label, drive.color);
        folderParser.rootHandle = drive.handle;
        const events = await folderParser.parseFolder();
        drive.events = events;
        eventsStore.setAllEvents(folderManager.getAllEvents());
      }
      syncDrives();
    } catch (e) {
      console.error('[useDrives] Error reloading drive:', e);
    }
  },

  async removeDrive(driveId: string): Promise<void> {
    await folderManager.removeDrive(driveId);
    eventsStore.setAllEvents(folderManager.getAllEvents());
    syncDrives();
  },

  manageDrives(): void {
    driveManagementModalStore.open();
  },
};

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

  return {
    drives,
    activeDriveId,
    selectFolder: drivesStore.selectFolder,
    loadB2: drivesStore.loadB2,
    changeDrive: drivesStore.changeDrive,
    manageDrives: drivesStore.manageDrives,
    addDrive: drivesStore.addNewDrive,
    refreshDrives: drivesStore.refreshDrives,
    syncArchiveDrive: drivesStore.syncArchiveDrive,
    reloadDriveEvents: drivesStore.reloadDriveEvents,
    removeDrive: drivesStore.removeDrive,
    tryRestoreLastFolder: drivesStore.tryRestoreLastFolder,
    syncDrives,
  };
}

export default useDrives;
