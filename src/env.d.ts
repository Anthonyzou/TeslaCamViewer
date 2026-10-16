declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Window {
  i18n?: {
    init?: () => Promise<any>;
    t: (key: string, params?: Record<string, any>) => string;
    getLocale: () => string;
    setLocale: (locale: string) => void;
  };
  app?: any;
  FilterPanel?: any;
  CommandPalette?: any;
  SettingsManager?: any;
  StatisticsManager?: any;
  EventFilter?: any;
  FolderParser?: any;
}
