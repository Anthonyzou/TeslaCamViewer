/**
 * FilterPanel - Vue 3 Island Component Wrapper
 * Mounts FilterPanel.vue Single File Component into the target container.
 */

import { createApp } from 'vue';
import FilterPanelComponent from '../src/components/FilterPanel.vue';

class FilterPanel {
  constructor(containerElement, eventFilter, onFilterChange) {
    this.container = containerElement;
    this.eventFilter = eventFilter;
    this.onFilterChange = onFilterChange;

    if (!this.container) {
      console.warn('Filter panel container not found');
      return;
    }

    // Mount Vue 3 component
    this._app = createApp(FilterPanelComponent, {
      eventFilter: this.eventFilter,
      onFilterChange: this.onFilterChange,
    });
    this._instance = this._app.mount(this.container);
  }

  /**
   * Update the active filter count badge
   */
  updateFilterBadge() {
    if (this._instance?.updateBadge) {
      this._instance.updateBadge();
    }
  }

  /**
   * Get current filter state
   */
  getFilters() {
    return this.eventFilter.getFilters();
  }

  /**
   * Refresh the filter panel state from eventFilter
   */
  refresh() {
    if (this._instance?.syncFromEventFilter) {
      this._instance.syncFromEventFilter();
    }
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    if (this._instance?.clearAllFilters) {
      this._instance.clearAllFilters();
    } else {
      this.eventFilter.reset();
      if (this.onFilterChange) this.onFilterChange();
    }
  }

  /**
   * Toggle filter panel expanded/collapsed
   */
  togglePanel() {
    if (this._instance?.togglePanel) {
      this._instance.togglePanel();
    }
  }
}

if (typeof window !== 'undefined') {
  window.FilterPanel = FilterPanel;
}

export default FilterPanel;
