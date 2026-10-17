import { ref, type Ref } from 'vue';

const STORAGE_KEY_GUIDE = 'teslacam_quickstart_seen';

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
const statisticsData: Ref<any> = ref(null);

export const statisticsModalStore = {
  get isOpen(): boolean {
    return isStatisticsOpen.value;
  },
  get data(): any {
    return statisticsData.value;
  },
  open(data?: any): void {
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

// Diagnostics Modal
const isDiagnosticsOpen: Ref<boolean> = ref(false);
const diagnosticsReport: Ref<string> = ref('');

export const diagnosticsModalStore = {
  get isOpen(): boolean {
    return isDiagnosticsOpen.value;
  },
  get report(): string {
    return diagnosticsReport.value;
  },
  open(report: string = ''): void {
    diagnosticsReport.value = report;
    isDiagnosticsOpen.value = true;
  },
  close(): void {
    isDiagnosticsOpen.value = false;
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
let promptSetupHandler: ((handle: any, existingDrive?: any) => Promise<any>) | null = null;

export const driveSetupModalStore = {
  get isOpen(): boolean {
    return isDriveSetupOpen.value;
  },
  promptSetup(handle: any, existingDrive: any = null): Promise<any> {
    if (promptSetupHandler) {
      return promptSetupHandler(handle, existingDrive);
    }
    return Promise.resolve(null);
  },
  close(): void {
    isDriveSetupOpen.value = false;
  },
  registerPromptHandler(handler: (handle: any, existingDrive?: any) => Promise<any>): void {
    promptSetupHandler = handler;
  },
  unregisterPromptHandler(): void {
    promptSetupHandler = null;
  },
};

// Quick Start Guide Modal
const isQuickStartGuideOpen: Ref<boolean> = ref(false);

export const quickStartGuideModalStore = {
  get isOpen(): boolean {
    return isQuickStartGuideOpen.value;
  },
  open(): void {
    isQuickStartGuideOpen.value = true;
  },
  close(): void {
    isQuickStartGuideOpen.value = false;
  },
  show(): void {
    this.open();
  },
  hide(): void {
    this.close();
  },
  showIfFirstRun(): void {
    try {
      if (typeof localStorage !== 'undefined' && !localStorage.getItem(STORAGE_KEY_GUIDE)) {
        this.open();
      }
    } catch {}
  },
  reset(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_GUIDE);
      }
    } catch {}
  },
};

// Command Palette Modal
const isCommandPaletteOpen: Ref<boolean> = ref(false);
const commandPaletteList: Ref<any[]> = ref([]);

export const commandPaletteModalStore = {
  get isOpen(): boolean {
    return isCommandPaletteOpen.value;
  },
  get commands(): any[] {
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
  register(cmd: any): void {
    if (!cmd?.id) return;
    const existingIndex = commandPaletteList.value.findIndex((c) => c.id === cmd.id);
    if (existingIndex >= 0) {
      commandPaletteList.value[existingIndex] = cmd;
    } else {
      commandPaletteList.value.push(cmd);
    }
  },
  registerMany(cmds: any[]): void {
    if (!Array.isArray(cmds)) return;
    for (const cmd of cmds) {
      this.register(cmd);
    }
  },
  clearCommands(): void {
    commandPaletteList.value = [];
  },
};

export const modalStore = {
  settings: settingsModalStore,
  help: helpModalStore,
  statistics: statisticsModalStore,
  diagnostics: diagnosticsModalStore,
  driveManagement: driveManagementModalStore,
  driveSetup: driveSetupModalStore,
  quickStartGuide: quickStartGuideModalStore,
  commandPalette: commandPaletteModalStore,
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

    // Diagnostics
    isDiagnosticsOpen,
    diagnosticsReport,
    diagnosticsModal: diagnosticsModalStore,

    // Drive Management
    isDriveManagementOpen,
    driveManagementModal: driveManagementModalStore,

    // Drive Setup
    isDriveSetupOpen,
    driveSetupModal: driveSetupModalStore,

    // Quick Start Guide
    isQuickStartGuideOpen,
    quickStartGuideModal: quickStartGuideModalStore,

    // Command Palette
    isCommandPaletteOpen,
    commandPaletteCommands: commandPaletteList,
    commandPaletteModal: commandPaletteModalStore,

    modalStore,
  };
}
