export interface FilterTypes {
  SavedClips: boolean;
  SentryClips: boolean;
  RecentClips: boolean;
  [key: string]: boolean;
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface FilterState {
  types: FilterTypes;
  dateRange: DateRange;
  searchQuery: string;
  sortOrder: 'newest' | 'oldest' | string;
}

export interface EventFilterLike {
  getFilters: () => FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  reset: () => void;
  getActiveFilterCount: () => number;
}

export interface CommandItem {
  id?: string;
  title: string;
  category?: string;
  keywords?: string[] | string;
  shortcut?: string;
  action: (app?: any) => void;
  enabled?: (app?: any) => boolean;
}

export interface TeslaCamEvent {
  type?: string;
  timestamp?: string | number | Date;
  metadata?: {
    city?: string;
    street?: string;
    reason?: string;
    camera?: string;
    [key: string]: any;
  };
  clipGroups?: any[];
  [key: string]: any;
}

export interface SettingsManagerLike {
  settings: Record<string, any>;
  defaults: Record<string, any>;
  get: (key: string) => any;
  set: (key: string, val: any) => void;
  saveSettings: () => void;
  resetToDefaults: () => void;
}
