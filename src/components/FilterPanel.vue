<template>
  <div class="filter-panel">
    <div class="filter-header" id="filterHeader" @click="togglePanel">
      <div class="filter-header-content">
        <span>{{ t('filter.filters') }}</span>
        <span v-if="filterCount > 0" class="filter-badge" id="filterBadge">{{
          filterCount
        }}</span>
      </div>
      <ChevronDown
        class="collapse-icon-svg"
        :class="{ collapsed: !isExpanded }"
        :size="14"
        style="transition: transform 0.22s ease; flex-shrink: 0"
      />
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
              @change="
                handleTypeChange('SentryClips', filters.types.SentryClips)
              "
            />
            <span class="event-type sentry">{{ t('filter.sentry') }}</span>
          </label>
          <label class="filter-checkbox-label">
            <input
              type="checkbox"
              id="filterRecent"
              v-model="filters.types.RecentClips"
              @change="
                handleTypeChange('RecentClips', filters.types.RecentClips)
              "
            />
            <span class="event-type recent">{{ t('filter.recent') }}</span>
          </label>
        </div>
      </div>

      <!-- Sort Order -->
      <div class="filter-group">
        <label class="filter-label" for="sortOrder">{{
          t('filter.sortBy')
        }}</label>
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
        <label class="filter-label" for="searchInput">{{
          t('filter.search')
        }}</label>
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
import { ChevronDown } from 'lucide-vue-next';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { useFilterPanel, filterPanelStore } from '../composables/useFilterPanel';
import { useI18n } from '../composables/useI18n';
import type { EventFilterLike, FilterTypes } from '../types';

const props = defineProps<{
  eventFilter?: EventFilterLike;
  onFilterChange?: (() => void) | null;
}>();

function getFilter(): EventFilterLike | null {
  return props.eventFilter || window.app?.eventFilter || null;
}

const { isExpanded, filterCount } = useFilterPanel();
const { t } = useI18n();
const searchQuery = ref('');

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
  } else if (typeof window.app?.applyFilters === 'function') {
    window.app.applyFilters();
  }
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

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function handleSearchInput(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const ef = getFilter();
    if (ef) {
      ef.setFilters({
        searchQuery: searchQuery.value,
      });
    }
    notifyFilterChange();
  }, 300);
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
  if (debounceTimer) clearTimeout(debounceTimer);
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
/* ==================== FILTER PANEL ==================== */
.filter-panel {
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border);
}

.filter-header {
    padding: 0.75rem 1rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    transition: background-color 0.2s ease;
}

.filter-header:hover {
    background: var(--bg-tertiary);
}

.filter-header-content {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-family: var(--font-ui);
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
}

.filter-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: var(--accent);
    color: var(--bg-void);
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    box-shadow: 0 0 8px var(--accent-glow);
}

.collapse-icon {
    color: var(--text-muted);
    font-size: 0.75rem;
    transition: transform 0.3s ease;
}

.filter-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
}

.filter-content.expanded {
    max-height: 500px;
    overflow-y: auto;
}

.filter-group {
    padding: 0.875rem 1rem;
    border-top: 1px solid var(--border);
}

.filter-label {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.625rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.filter-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.filter-checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text-secondary);
    transition: color 0.2s ease;
}

.filter-checkbox-label:hover {
    color: var(--text-primary);
}

.filter-checkbox-label input[type="checkbox"] {
    cursor: pointer;
    accent-color: var(--accent);
    width: 15px;
    height: 15px;
}

.filter-select,
.search-input,
.date-input {
    width: 100%;
    padding: 0.625rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 0.85rem;
    transition: all 0.2s ease;
}

.filter-select:focus,
.search-input:focus,
.date-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 10px var(--accent-glow);
}

.search-input::placeholder {
    color: var(--text-muted);
}

.date-range-inputs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.date-input {
    flex: 1;
    font-size: 0.8rem;
}

.date-separator {
    color: var(--text-muted);
    font-size: 0.85rem;
}

.clear-dates-btn,
.clear-all-filters-btn {
    margin-top: 0.625rem;
    padding: 0.5rem 0.875rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-muted);
    font-family: var(--font-ui);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.clear-dates-btn:hover,
.clear-all-filters-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--border-accent);
}

.clear-all-filters-btn {
    width: 100%;
    color: var(--accent);
    font-weight: 600;
}
</style>
