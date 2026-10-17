import { ref, type Ref } from 'vue';

const isExpanded: Ref<boolean> = ref(false);
const filterCount: Ref<number> = ref(0);

type FilterHandler = () => void;
let badgeUpdateHandler: FilterHandler | null = null;
let syncHandler: FilterHandler | null = null;
let clearHandler: FilterHandler | null = null;
let getFiltersHandler: (() => any) | null = null;

export const filterPanelStore = {
  get isExpanded(): boolean {
    return isExpanded.value;
  },
  get filterCount(): number {
    return filterCount.value;
  },
  togglePanel(): void {
    isExpanded.value = !isExpanded.value;
  },
  updateBadge(): void {
    badgeUpdateHandler?.();
  },
  updateFilterBadge(): void {
    badgeUpdateHandler?.();
  },
  syncFromEventFilter(): void {
    syncHandler?.();
  },
  refresh(): void {
    syncHandler?.();
  },
  clearAllFilters(): void {
    clearHandler?.();
  },
  getFilters(): any {
    return getFiltersHandler?.() || {};
  },
  registerHandlers(handlers: {
    updateBadge?: FilterHandler;
    syncFromEventFilter?: FilterHandler;
    clearAllFilters?: FilterHandler;
    getFilters?: () => any;
  }): void {
    if (handlers.updateBadge) badgeUpdateHandler = handlers.updateBadge;
    if (handlers.syncFromEventFilter) syncHandler = handlers.syncFromEventFilter;
    if (handlers.clearAllFilters) clearHandler = handlers.clearAllFilters;
    if (handlers.getFilters) getFiltersHandler = handlers.getFilters;
  },
  unregisterHandlers(): void {
    badgeUpdateHandler = null;
    syncHandler = null;
    clearHandler = null;
    getFiltersHandler = null;
  },
};

export function useFilterPanel() {
  return {
    isExpanded,
    filterCount,
    filterPanelStore,
    togglePanel: filterPanelStore.togglePanel,
    updateBadge: filterPanelStore.updateBadge,
    updateFilterBadge: filterPanelStore.updateFilterBadge,
    syncFromEventFilter: filterPanelStore.syncFromEventFilter,
    refresh: filterPanelStore.refresh,
    clearAllFilters: filterPanelStore.clearAllFilters,
    getFilters: filterPanelStore.getFilters,
  };
}
