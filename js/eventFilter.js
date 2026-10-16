/**
 * EventFilter - Handles filtering and sorting of events
 */

class EventFilter {
    constructor() {
        this.filters = {
            types: {
                SavedClips: true,
                SentryClips: true,
                RecentClips: true
            },
            dateRange: {
                start: null,
                end: null
            },
            searchQuery: '',
            sortOrder: 'newest' // 'newest' or 'oldest'
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
            .filter(event => this.filterByType(event))
            .filter(event => this.filterByDate(event))
            .filter(event => this.filterBySearch(event))
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
    filterByDate(event) {
        const { start, end } = this.filters.dateRange;

        // No date filter applied
        if (!start && !end) {
            return true;
        }

        // Parse event timestamp
        const eventDate = new Date(event.timestamp);

        // Check start date
        if (start) {
            const startDate = new Date(start);
            startDate.setHours(0, 0, 0, 0); // Start of day
            if (eventDate < startDate) {
                return false;
            }
        }

        // Check end date
        if (end) {
            const endDate = new Date(end);
            endDate.setHours(23, 59, 59, 999); // End of day
            if (eventDate > endDate) {
                return false;
            }
        }

        return true;
    }

    /**
     * Filter by search query (searches city, street, reason)
     * @param {Object} event
     * @returns {boolean}
     */
    filterBySearch(event) {
        const query = this.filters.searchQuery.toLowerCase().trim();

        // No search query
        if (!query) {
            return true;
        }

        // Search in city
        const city = event.metadata?.city || '';
        if (city.toLowerCase().includes(query)) {
            return true;
        }

        // Search in street
        const street = event.metadata?.street || '';
        if (street.toLowerCase().includes(query)) {
            return true;
        }

        // Search in reason
        const reason = event.metadata?.reason || '';
        if (reason.toLowerCase().includes(query)) {
            return true;
        }

        // Search in formatted reason
        const formattedReason = FolderParser.formatReason(event.metadata?.reason);
        if (formattedReason && formattedReason.toLowerCase().includes(query)) {
            return true;
        }

        // Search in event type
        if (event.type.toLowerCase().includes(query)) {
            return true;
        }

        return false;
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
            return dateB - dateA; // Newest first (descending)
        } else {
            return dateA - dateB; // Oldest first (ascending)
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
            this.filters.dateRange = { ...this.filters.dateRange, ...newFilters.dateRange };
        }
        if (newFilters.searchQuery !== undefined) {
            this.filters.searchQuery = newFilters.searchQuery;
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
                RecentClips: true
            },
            dateRange: {
                start: null,
                end: null
            },
            searchQuery: '',
            sortOrder: 'newest'
        };
    }

    /**
     * Get count of active filters (non-default)
     * @returns {number}
     */
    getActiveFilterCount() {
        let count = 0;

        // Check if any event type is disabled
        const allTypesEnabled = Object.values(this.filters.types).every(v => v === true);
        if (!allTypesEnabled) {
            count++;
        }

        // Check date range
        if (this.filters.dateRange.start || this.filters.dateRange.end) {
            count++;
        }

        // Check search query
        if (this.filters.searchQuery.trim().length > 0) {
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

if (typeof window !== 'undefined') {
    window.EventFilter = EventFilter;
}
