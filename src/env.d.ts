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
    settingsModalInstance?: any;
    statisticsModalInstance?: any;
    filterPanelInstance?: any;
    helpModalInstance?: any;
    quickStartGuideInstance?: any;
    commandPaletteInstance?: any;
    weatherService?: import('./utils/weatherService').WeatherService;
    FileSystemObserver?: any;
  }
}

export {};
