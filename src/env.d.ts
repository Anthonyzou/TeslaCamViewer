declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare global {
  interface Window {
    app?: import('./services/teslaCamApp').TeslaCamApp;
    i18n?: import('./utils/i18n').I18n;
    _vueMapView?: any;
    _vueTimeline?: any;
    _vueClipMarking?: any;
    _vueClipMarking?: any;
    showDirectoryPicker: any;
    settingsModalInstance?: any;
    driveSetupModalInstance?: any;
    driveManagementModalInstance?: any;
    diagnosticsModalInstance?: any;
    statisticsModalInstance?: any;
    filterPanelInstance?: any;
    helpModalInstance?: any;
    quickStartGuideInstance?: any;
    commandPaletteInstance?: any;
    FileSystemObserver?: any;
  }
}

export {};
