import { ref, type Ref } from 'vue';
import type { CommandItem, DriveInfo } from '../types';
import type { DriveSetupOptions } from '../components/DriveSetupModal.vue';

// Settings Modal
const isSettingsOpen: Ref<boolean> = ref(false);
const settingsActiveTab: Ref<string> = ref('general');
let settingsSyncHandler: (() => void) | null = null;

export const settingsModalStore = {
  get isOpen(): boolean {
    return isSettingsOpen.value;
  },
  get activeTab(): string {
    return settingsActiveTab.value;
  },
  open(tab: string = 'general'): void {
    settingsActiveTab.value = tab;
    isSettingsOpen.value = true;
    settingsSyncHandler?.();
  },
  close(): void {
    isSettingsOpen.value = false;
  },
  syncFromManager(): void {
    settingsSyncHandler?.();
  },
  registerSyncHandler(handler: () => void): void {
    settingsSyncHandler = handler;
  },
  unregisterSyncHandler(): void {
    settingsSyncHandler = null;
  },
};

// Help Modal
const isHelpOpen: Ref<boolean> = ref(false);

export const helpModalStore = {
  get isOpen(): boolean {
    return isHelpOpen.value;
  },
  open(): void {
    isHelpOpen.value = true;
  },
  close(): void {
    isHelpOpen.value = false;
  },
  toggle(): void {
    isHelpOpen.value = !isHelpOpen.value;
  },
  show(): void {
    this.open();
  },
  hide(): void {
    this.close();
  },
};

// Statistics Modal
const isStatisticsOpen: Ref<boolean> = ref(false);
const statisticsData: Ref<Record<string, unknown> | null> = ref(null);

export const statisticsModalStore = {
  get isOpen(): boolean {
    return isStatisticsOpen.value;
  },
  get data(): Record<string, unknown> | null {
    return statisticsData.value;
  },
  open(data?: Record<string, unknown>): void {
    if (data !== undefined) {
      statisticsData.value = data;
    }
    isStatisticsOpen.value = true;
  },
  close(): void {
    isStatisticsOpen.value = false;
  },
  show(): void {
    this.open();
  },
  hide(): void {
    this.close();
  },
};

// Drive Management Modal
const isDriveManagementOpen: Ref<boolean> = ref(false);
let driveManagementRefreshHandler: (() => void) | null = null;

export const driveManagementModalStore = {
  get isOpen(): boolean {
    return isDriveManagementOpen.value;
  },
  open(): void {
    isDriveManagementOpen.value = true;
    driveManagementRefreshHandler?.();
  },
  close(): void {
    isDriveManagementOpen.value = false;
  },
  refreshDrives(): void {
    driveManagementRefreshHandler?.();
  },
  registerRefreshHandler(handler: () => void): void {
    driveManagementRefreshHandler = handler;
  },
  unregisterRefreshHandler(): void {
    driveManagementRefreshHandler = null;
  },
};

// Drive Setup Modal
const isDriveSetupOpen: Ref<boolean> = ref(false);
let promptSetupHandler:
  | ((handle: FileSystemDirectoryHandle | null, existingDrive?: DriveInfo | null) => Promise<DriveSetupOptions | null>)
  | null = null;

export const driveSetupModalStore = {
  get isOpen(): boolean {
    return isDriveSetupOpen.value;
  },
  promptSetup(
    handle: FileSystemDirectoryHandle | null,
    existingDrive: DriveInfo | null = null
  ): Promise<DriveSetupOptions | null> {
    if (promptSetupHandler) {
      return promptSetupHandler(handle, existingDrive);
    }
    return Promise.resolve(null);
  },
  close(): void {
    isDriveSetupOpen.value = false;
  },
  registerPromptHandler(
    handler: (
      handle: FileSystemDirectoryHandle | null,
      existingDrive?: DriveInfo | null
    ) => Promise<DriveSetupOptions | null>
  ): void {
    promptSetupHandler = handler;
  },
  unregisterPromptHandler(): void {
    promptSetupHandler = null;
  },
};

// Command Palette Modal
const isCommandPaletteOpen: Ref<boolean> = ref(false);
const commandPaletteList: Ref<CommandItem[]> = ref([]);

export const commandPaletteModalStore = {
  get isOpen(): boolean {
    return isCommandPaletteOpen.value;
  },
  get commands(): CommandItem[] {
    return commandPaletteList.value;
  },
  open(): void {
    isCommandPaletteOpen.value = true;
  },
  close(): void {
    isCommandPaletteOpen.value = false;
  },
  toggle(): void {
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
  },
  register(cmd: CommandItem): void {
    if (!cmd?.id) return;
    const existingIndex = commandPaletteList.value.findIndex(
      (c) => c.id === cmd.id
    );
    if (existingIndex >= 0) {
      commandPaletteList.value[existingIndex] = cmd;
    } else {
      commandPaletteList.value.push(cmd);
    }
  },
  registerMany(cmds: CommandItem[]): void {
    if (!Array.isArray(cmds)) return;
    for (const cmd of cmds) {
      this.register(cmd);
    }
  },
  clearCommands(): void {
    commandPaletteList.value = [];
  },
};

// Export Modal
const isExportOpen: Ref<boolean> = ref(false);
const isExportComplete: Ref<boolean> = ref(false);
const exportTitle: Ref<string> = ref('');
const exportStatusText: Ref<string> = ref('');
const exportProgress: Ref<number> = ref(0);
const exportFilename: Ref<string> = ref('');
const exportDownloadUrl: Ref<string> = ref('');
let exportCancelHandler: (() => void) | null = null;

export const exportModalStore = {
  get isOpen(): boolean {
    return isExportOpen.value;
  },
  get isComplete(): boolean {
    return isExportComplete.value;
  },
  get title(): string {
    return exportTitle.value;
  },
  get statusText(): string {
    return exportStatusText.value;
  },
  get progress(): number {
    return exportProgress.value;
  },
  get filename(): string {
    return exportFilename.value;
  },
  get downloadUrl(): string {
    return exportDownloadUrl.value;
  },
  open(title: string, statusText = '', onCancel?: () => void): void {
    exportTitle.value = title;
    exportStatusText.value = statusText;
    exportProgress.value = 0;
    isExportComplete.value = false;
    exportFilename.value = '';
    exportDownloadUrl.value = '';
    exportCancelHandler = onCancel || null;
    isExportOpen.value = true;
  },
  updateProgress(percent: number, statusText?: string): void {
    exportProgress.value = percent;
    if (statusText !== undefined) {
      exportStatusText.value = statusText;
    }
  },
  showComplete(filename: string, downloadUrl: string): void {
    exportFilename.value = filename;
    exportDownloadUrl.value = downloadUrl;
    exportProgress.value = 100;
    isExportComplete.value = true;
  },
  cancel(): void {
    exportCancelHandler?.();
    this.close();
  },
  close(): void {
    isExportOpen.value = false;
    isExportComplete.value = false;
    exportCancelHandler = null;
  },
};

export const modalStore = {
  settings: settingsModalStore,
  help: helpModalStore,
  statistics: statisticsModalStore,
  driveManagement: driveManagementModalStore,
  driveSetup: driveSetupModalStore,
  commandPalette: commandPaletteModalStore,
  export: exportModalStore,
};

export function useModals() {
  return {
    // Settings
    isSettingsOpen,
    settingsActiveTab,
    settingsModal: settingsModalStore,

    // Help
    isHelpOpen,
    helpModal: helpModalStore,

    // Statistics
    isStatisticsOpen,
    statisticsData,
    statisticsModal: statisticsModalStore,

    // Drive Management
    isDriveManagementOpen,
    driveManagementModal: driveManagementModalStore,

    // Drive Setup
    isDriveSetupOpen,
    driveSetupModal: driveSetupModalStore,

    // Command Palette
    isCommandPaletteOpen,
    commandPaletteCommands: commandPaletteList,
    commandPaletteModal: commandPaletteModalStore,

    // Export Modal
    isExportOpen,
    isExportComplete,
    exportTitle,
    exportStatusText,
    exportProgress,
    exportFilename,
    exportDownloadUrl,
    exportModal: exportModalStore,

    modalStore,
  };
}
