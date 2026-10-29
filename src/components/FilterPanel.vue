<template>
  <div class="filter-panel">
    <div class="filter-header" id="filterHeader" @click="togglePanel">
      <div class="filter-header-content">
        <span>{{ t('filter.filters') }}</span>
        <span v-if="filterCount > 0" class="filter-badge" id="filterBadge">{{
          filterCount
        }}</span>
      </div>
      <ChevronDown :class="{ collapsed: !isExpanded }" :size="14" class="
        collapse-icon-svg collapse-icon-animated
      " />
    </div>

    <div class="filter-content" :class="{ expanded: isExpanded }">
      <!-- Event Type Filters -->
      <div class="filter-group">
        <label class="filter-label">{{ t('filter.eventTypes') }}</label>
        <div class="filter-checkboxes">
          <label class="filter-checkbox-label">
            <input type="checkbox" id="filterSaved" v-model="filters.types.SavedClips"
              @change="handleTypeChange('SavedClips', filters.types.SavedClips)" />
            <span class="event-type saved">{{ t('filter.saved') }}</span>
          </label>
          <label class="filter-checkbox-label">
            <input type="checkbox" id="filterSentry" v-model="filters.types.SentryClips" @change="
              handleTypeChange('SentryClips', filters.types.SentryClips)
              " />
            <span class="event-type sentry">{{ t('filter.sentry') }}</span>
          </label>
          <label class="filter-checkbox-label">
            <input type="checkbox" id="filterRecent" v-model="filters.types.RecentClips" @change="
              handleTypeChange('RecentClips', filters.types.RecentClips)
              " />
            <span class="event-type recent">{{ t('filter.recent') }}</span>
          </label>
        </div>
      </div>

      <!-- Sort Order -->
      <div class="filter-group">
        <label class="filter-label" for="sortOrder">{{
          t('filter.sortBy')
        }}</label>
        <select id="sortOrder" class="filter-select" v-model="filters.sortOrder" @change="handleSortChange">
          <option value="newest">{{ t('filter.newestFirst') }}</option>
          <option value="oldest">{{ t('filter.oldestFirst') }}</option>
        </select>
      </div>

      <!-- Date Range -->
      <div class="filter-group">
        <label class="filter-label">{{ t('filter.dateRange') }}</label>
        <div class="date-range-inputs">
          <input type="date" id="dateStart" class="date-input" placeholder="Start" v-model="filters.dateRange.start"
            @change="handleDateChange('start', filters.dateRange.start)" />
          <span class="date-separator">{{ t('filter.dateTo') }}</span>
          <input type="date" id="dateEnd" class="date-input" placeholder="End" v-model="filters.dateRange.end"
            @change="handleDateChange('end', filters.dateRange.end)" />
        </div>
        <button v-if="filters.dateRange.start || filters.dateRange.end" id="clearDates" class="
          clear-dates-btn
        " @click="clearDates">
          {{ t('filter.clearDates') }}
        </button>
      </div>

      <!-- Clear All Filters -->
      <button v-if="filterCount > 0" id="clearAllFilters" class="
        clear-all-filters-btn
      " @click="clearAllFilters">
        {{ t('filter.clearAllFilters') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { onMounted, onUnmounted, reactive } from 'vue';
import { eventsStore } from '../composables/useEvents';
import {
  filterPanelStore,
  useFilterPanel,
} from '../composables/useFilterPanel';
import { useI18n } from '../composables/useI18n';
import type { EventFilterLike, FilterTypes } from '../types';

const props = defineProps<{
  eventFilter?: EventFilterLike;
  onFilterChange?: (() => void) | null;
}>();

function getFilter(): EventFilterLike | null {
  return props.eventFilter || eventsStore.eventFilter || null;
}

const { isExpanded, filterCount } = useFilterPanel();
const { t } = useI18n();

const filters = reactive({
  types: {
    SavedClips: true,
    SentryClips: true,
    RecentClips: true,
  } as FilterTypes,
  sortOrder: 'newest',
  dateRange: {
    start: '',
    end: '',
  },
});

function updateBadge(): void {
  const ef = getFilter();
  if (ef) {
    filterCount.value = ef.getActiveFilterCount();
  }
}

function syncFromEventFilter(): void {
  const ef = getFilter();
  if (!ef) return;
  const current = ef.getFilters();
  filters.types.SavedClips = current.types?.SavedClips ?? true;
  filters.types.SentryClips = current.types?.SentryClips ?? true;
  filters.types.RecentClips = current.types?.RecentClips ?? true;
  filters.sortOrder = current.sortOrder || 'newest';
  filters.dateRange.start = current.dateRange?.start || '';
  filters.dateRange.end = current.dateRange?.end || '';
  updateBadge();
}

function togglePanel(): void {
  isExpanded.value = !isExpanded.value;
}

function notifyFilterChange(): void {
  updateBadge();
  if (props.onFilterChange) {
    props.onFilterChange();
  }
  eventsStore.applyFilters();
}

function handleTypeChange(type: string, checked: boolean): void {
  const ef = getFilter();
  if (ef) {
    ef.setFilters({
      types: { ...filters.types, [type]: checked },
    });
  }
  notifyFilterChange();
}

function handleSortChange(): void {
  const ef = getFilter();
  if (ef) {
    ef.setFilters({
      sortOrder: filters.sortOrder,
    });
  }
  notifyFilterChange();
}

function handleDateChange(type: 'start' | 'end', val: string | null): void {
  const ef = getFilter();
  if (ef) {
    ef.setFilters({
      dateRange: { ...filters.dateRange, [type]: val || null },
    });
  }
  notifyFilterChange();
}

function clearDates(): void {
  filters.dateRange.start = '';
  filters.dateRange.end = '';
  const ef = getFilter();
  if (ef) {
    ef.setFilters({
      dateRange: { start: null, end: null },
    });
  }
  notifyFilterChange();
}

function clearAllFilters(): void {
  const ef = getFilter();
  if (ef) {
    ef.reset();
  }
  syncFromEventFilter();
  notifyFilterChange();
}

onMounted(() => {
  syncFromEventFilter();
  updateBadge();
  filterPanelStore.registerHandlers({
    updateBadge,
    syncFromEventFilter,
    clearAllFilters,
    getFilters: () => getFilter()?.getFilters() || null,
  });
});

onUnmounted(() => {
  filterPanelStore.unregisterHandlers();
});

defineExpose({
  updateBadge,
  updateFilterBadge: updateBadge,
  syncFromEventFilter,
  refresh: syncFromEventFilter,
  togglePanel,
  clearAllFilters,
});
</script>

<style scoped>
@reference "tailwindcss";

/* ==================== FILTER PANEL ==================== */
.filter-panel {
  @apply bg-(--bg-primary) border-b border-(--border);
}

.filter-header {
  @apply flex cursor-pointer items-center justify-between px-4 py-3 transition-[background-color] duration-200 select-none;
}

.filter-header:hover {
  @apply bg-(--bg-tertiary);
}

.filter-header-content {
  @apply flex items-center gap-2.5 font-(family-name:--font-ui) text-[0.85rem] font-semibold tracking-wider text-(--text-secondary) uppercase;
}

.filter-badge {
  @apply inline-flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-(--accent) px-1.5 font-mono text-[0.7rem] font-semibold text-(--bg-void);
  box-shadow: 0 0 8px var(--accent-glow);
}

.collapse-icon {
  @apply text-[0.75rem] text-(--text-muted) transition-transform duration-300;
}

.filter-content {
  @apply max-h-0 overflow-hidden transition-[max-height] duration-300 ease-out;
}

.filter-content.expanded {
  @apply max-h-125 overflow-y-auto;
}

.filter-group {
  @apply border-t border-(--border) px-4 py-3.5;
}

.filter-label {
  @apply mb-2.5 block font-(family-name:--font-ui) text-[0.75rem] font-semibold tracking-wider text-(--text-muted) uppercase;
}

.filter-checkboxes {
  @apply flex flex-row gap-2 justify-center;
}

.filter-checkbox-label {
  @apply flex cursor-pointer items-center gap-2 text-[0.85rem] text-(--text-secondary) transition-colors duration-200;
}

.filter-checkbox-label:hover {
  @apply text-(--text-primary);
}

.filter-checkbox-label input[type='checkbox'] {
  @apply h-3.75 w-3.75 cursor-pointer accent-(--accent);
}

.filter-select,
.search-input,
.date-input {
  @apply w-full rounded-md border border-(--border) bg-(--bg-tertiary) p-2.5 font-(family-name:--font-ui) text-[0.85rem] text-(--text-primary) transition-all duration-200;
}

.filter-select:focus,
.search-input:focus,
.date-input:focus {
  @apply border-(--accent) outline-none;
  box-shadow: 0 0 10px var(--accent-glow);
}

.search-input::placeholder {
  @apply text-(--text-muted);
}

.date-range-inputs {
  @apply flex items-center gap-2;
}

.date-input {
  @apply flex-1 text-[0.8rem];
}

.date-separator {
  @apply text-[0.85rem] text-(--text-muted);
}

.clear-dates-btn,
.clear-all-filters-btn {
  @apply mt-2.5 cursor-pointer rounded-md border border-(--border) bg-(--bg-tertiary) px-3.5 py-2 font-(family-name:--font-ui) text-[0.8rem] text-(--text-muted) transition-all duration-200;
}

.clear-dates-btn:hover,
.clear-all-filters-btn:hover {
  @apply border-(--border-accent) bg-(--bg-elevated) text-(--text-primary);
}

.clear-all-filters-btn {
  @apply w-full font-semibold text-(--accent);
}

.collapse-icon-animated {
  @apply shrink-0;
  transition: transform 0.22s ease;
}
</style>
