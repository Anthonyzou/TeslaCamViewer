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
  name?: string;
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

export interface DriveInfo {
  id: string;
  label?: string;
  name?: string;
  color?: string;
  handle?: any;
  events?: TeslaCamEvent[];
  [key: string]: any;
}
