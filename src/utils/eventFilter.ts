/**
 * EventFilter - Handles filtering and sorting of events
 */
import dayjs from 'dayjs';

class EventFilter {
  public filters: any;

  constructor() {
    this.filters = {
      types: {
        SavedClips: true,
        SentryClips: true,
        RecentClips: true,
      },
      dateRange: {
        start: null,
        end: null,
      },
      sortOrder: 'newest', // 'newest' or 'oldest'
    };
  }

  /**
   * Apply all active filters to events array
   * @param {Array} events
   * @returns {Array} Filtered and sorted events
   */
  applyFilters(events) {
    if (!events || events.length === 0) {
      return [];
    }

    return events
      .filter((event) => this.filterByType(event))
      .filter((event) => this.filterByDate(event))
      .sort((a, b) => this.sortEvents(a, b));
  }

  /**
   * Filter by event type
   * @param {Object} event
   * @returns {boolean}
   */
  filterByType(event) {
    return this.filters.types[event.type] === true;
  }

  /**
   * Filter by date range
   * @param {Object} event
   * @returns {boolean}
   */
  filterByDate(event: any): boolean {
    const { start, end } = this.filters.dateRange;

    // No date filter applied
    if (!start && !end) {
      return true;
    }

    const eventDate = dayjs(event.timestamp);

    // Check start date (inclusive from start of day)
    if (start && eventDate.isBefore(dayjs(start).startOf('day'))) {
      return false;
    }

    // Check end date (inclusive through end of day)
    if (end && eventDate.isAfter(dayjs(end).endOf('day'))) {
      return false;
    }

    return true;
  }

  /**
   * Sort events by timestamp
   * @param {Object} a
   * @param {Object} b
   * @returns {number}
   */
  sortEvents(a, b) {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);

    if (this.filters.sortOrder === 'newest') {
      return dateB.getTime() - dateA.getTime(); // Newest first (descending)
    } else {
      return dateA.getTime() - dateB.getTime(); // Oldest first (ascending)
    }
  }

  /**
   * Update filter values
   * @param {Object} newFilters
   */
  setFilters(newFilters) {
    if (newFilters.types !== undefined) {
      this.filters.types = { ...this.filters.types, ...newFilters.types };
    }
    if (newFilters.dateRange !== undefined) {
      this.filters.dateRange = {
        ...this.filters.dateRange,
        ...newFilters.dateRange,
      };
    }
    if (newFilters.sortOrder !== undefined) {
      this.filters.sortOrder = newFilters.sortOrder;
    }
  }

  /**
   * Reset all filters to defaults
   */
  reset() {
    this.filters = {
      types: {
        SavedClips: true,
        SentryClips: true,
        RecentClips: true,
      },
      dateRange: {
        start: null,
        end: null,
      },
      sortOrder: 'newest',
    };
  }

  /**
   * Get count of active filters (non-default)
   * @returns {number}
   */
  getActiveFilterCount() {
    let count = 0;

    // Check if any event type is disabled
    const allTypesEnabled = Object.values(this.filters.types).every(
      (v) => v === true
    );
    if (!allTypesEnabled) {
      count++;
    }

    // Check date range
    if (this.filters.dateRange.start || this.filters.dateRange.end) {
      count++;
    }

    // Check sort order (if not default 'newest')
    if (this.filters.sortOrder !== 'newest') {
      count++;
    }

    return count;
  }

  /**
   * Get current filter state
   * @returns {Object}
   */
  getFilters() {
    return { ...this.filters };
  }
}

export { EventFilter };
export default EventFilter;
