declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare global {
  interface Window {
    app?: import('./services/teslaCamApp').TeslaCamApp;
    i18n?: import('./utils/i18n').I18n;
    showDirectoryPicker: any;
    FileSystemObserver?: any;
  }
}

export {};
