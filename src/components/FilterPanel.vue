<template>
  <div class="filter-panel">
    <div class="filter-header" id="filterHeader" @click="togglePanel">
      <div class="filter-header-content">
        <span>{{ t('filter.filters') }}</span>
        <span v-if="filterCount > 0" class="filter-badge" id="filterBadge">{{ filterCount }}</span>
      </div>
      <svg
        class="collapse-icon-svg"
        :class="{ collapsed: !isExpanded }"
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="currentColor"
        style="transition: transform 0.22s ease; flex-shrink: 0;"
      >
        <path d="M2 3.5 L5 6.5 L8 3.5 Z" />
      </svg>
    </div>

    <div class="filter-content" :class="{ expanded: isExpanded }">
      <!-- Event Type Filters -->
      <div class="filter-group">
        <label class="filter-label">{{ t('filter.eventTypes') }}</label>
        <div class="filter-checkboxes">
          <label class="filter-checkbox-label">
            <input
              type="checkbox"
              id="filterSaved"
              v-model="filters.types.SavedClips"
              @change="handleTypeChange('SavedClips', filters.types.SavedClips)"
            />
            <span class="event-type saved">{{ t('filter.saved') }}</span>
          </label>
          <label class="filter-checkbox-label">
            <input
              type="checkbox"
              id="filterSentry"
              v-model="filters.types.SentryClips"
              @change="handleTypeChange('SentryClips', filters.types.SentryClips)"
            />
            <span class="event-type sentry">{{ t('filter.sentry') }}</span>
          </label>
          <label class="filter-checkbox-label">
            <input
              type="checkbox"
              id="filterRecent"
              v-model="filters.types.RecentClips"
              @change="handleTypeChange('RecentClips', filters.types.RecentClips)"
            />
            <span class="event-type recent">{{ t('filter.recent') }}</span>
          </label>
        </div>
      </div>

      <!-- Sort Order -->
      <div class="filter-group">
        <label class="filter-label" for="sortOrder">{{ t('filter.sortBy') }}</label>
        <select
          id="sortOrder"
          class="filter-select"
          v-model="filters.sortOrder"
          @change="handleSortChange"
        >
          <option value="newest">{{ t('filter.newestFirst') }}</option>
          <option value="oldest">{{ t('filter.oldestFirst') }}</option>
        </select>
      </div>

      <!-- Search -->
      <div class="filter-group">
        <label class="filter-label" for="searchInput">{{ t('filter.search') }}</label>
        <input
          type="text"
          id="searchInput"
          class="search-input"
          :placeholder="t('filter.searchPlaceholder')"
          v-model="searchQuery"
          @input="handleSearchInput"
        />
      </div>

      <!-- Date Range -->
      <div class="filter-group">
        <label class="filter-label">{{ t('filter.dateRange') }}</label>
        <div class="date-range-inputs">
          <input
            type="date"
            id="dateStart"
            class="date-input"
            placeholder="Start"
            v-model="filters.dateRange.start"
            @change="handleDateChange('start', filters.dateRange.start)"
          />
          <span class="date-separator">{{ t('filter.dateTo') }}</span>
          <input
            type="date"
            id="dateEnd"
            class="date-input"
            placeholder="End"
            v-model="filters.dateRange.end"
            @change="handleDateChange('end', filters.dateRange.end)"
          />
        </div>
        <button
          v-if="filters.dateRange.start || filters.dateRange.end"
          id="clearDates"
          class="clear-dates-btn"
          @click="clearDates"
        >
          {{ t('filter.clearDates') }}
        </button>
      </div>

      <!-- Clear All Filters -->
      <button
        v-if="filterCount > 0"
        id="clearAllFilters"
        class="clear-all-filters-btn"
        @click="clearAllFilters"
      >
        {{ t('filter.clearAllFilters') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import type { EventFilterLike, FilterTypes } from '../types';

const props = defineProps<{
  eventFilter: EventFilterLike;
  onFilterChange?: (() => void) | null;
}>();

const isExpanded = ref(false);
const localeTick = ref(0);
const searchQuery = ref('');
const filterCount = ref(0);

// Initialize filters from eventFilter
const initialFilters = props.eventFilter ? props.eventFilter.getFilters() : null;
const filters = reactive({
  types: {
    SavedClips: initialFilters?.types?.SavedClips ?? true,
    SentryClips: initialFilters?.types?.SentryClips ?? true,
    RecentClips: initialFilters?.types?.RecentClips ?? true,
  } as FilterTypes,
  sortOrder: initialFilters?.sortOrder || 'newest',
  dateRange: {
    start: initialFilters?.dateRange?.start || '',
    end: initialFilters?.dateRange?.end || '',
  },
});

searchQuery.value = initialFilters?.searchQuery || '';

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

function updateBadge(): void {
  if (props.eventFilter) {
    filterCount.value = props.eventFilter.getActiveFilterCount();
  }
}

function syncFromEventFilter(): void {
  if (!props.eventFilter) return;
  const current = props.eventFilter.getFilters();
  filters.types.SavedClips = current.types?.SavedClips ?? true;
  filters.types.SentryClips = current.types?.SentryClips ?? true;
  filters.types.RecentClips = current.types?.RecentClips ?? true;
  filters.sortOrder = current.sortOrder || 'newest';
  filters.dateRange.start = current.dateRange?.start || '';
  filters.dateRange.end = current.dateRange?.end || '';
  searchQuery.value = current.searchQuery || '';
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
}

function handleTypeChange(type: string, checked: boolean): void {
  props.eventFilter.setFilters({
    types: { ...filters.types, [type]: checked },
  });
  notifyFilterChange();
}

function handleSortChange(): void {
  props.eventFilter.setFilters({
    sortOrder: filters.sortOrder,
  });
  notifyFilterChange();
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function handleSearchInput(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    props.eventFilter.setFilters({
      searchQuery: searchQuery.value,
    });
    notifyFilterChange();
  }, 300);
}

function handleDateChange(type: 'start' | 'end', val: string | null): void {
  props.eventFilter.setFilters({
    dateRange: { ...filters.dateRange, [type]: val || null },
  });
  notifyFilterChange();
}

function clearDates(): void {
  filters.dateRange.start = '';
  filters.dateRange.end = '';
  props.eventFilter.setFilters({
    dateRange: { start: null, end: null },
  });
  notifyFilterChange();
}

function clearAllFilters(): void {
  props.eventFilter.reset();
  syncFromEventFilter();
  notifyFilterChange();
}

function onLocaleChange(): void {
  localeTick.value++;
}

onMounted(() => {
  updateBadge();
  window.addEventListener('localeChanged', onLocaleChange);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  window.removeEventListener('localeChanged', onLocaleChange);
});

defineExpose({
  updateBadge,
  syncFromEventFilter,
  togglePanel,
  clearAllFilters,
});
</script>
