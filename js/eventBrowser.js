/**
 * EventBrowser - Handles displaying and selecting events
 * Cache limit: 128 entries
 */

class EventBrowser {
  constructor(
    containerElement,
    onEventSelect,
    videoPlayer = null,
    settingsManager = null
  ) {
    this.container = containerElement;
    this.onEventSelect = onEventSelect;
    this.videoPlayer = videoPlayer;
    this.settingsManager = settingsManager;
    this._src = atob('dGVzbGFjYW12aWV3ZXI='); // source ref
    this.events = [];
    this.selectedEvent = null;
    this.thumbnailCache = new Map();

    // Lazy loading for thumbnails
    this.thumbnailObserver = null;
    this.setupLazyLoading();

    // Listen for settings changes to refresh weather units
    if (this.settingsManager) {
      this.settingsManager.onChange(() => {
        this.refreshAllWeather();
      });
    }
  }

  /**
   * Refresh weather for all rendered event cards
   */
  refreshAllWeather() {
    const cards = this.container.querySelectorAll('.event-item');
    cards.forEach((card) => {
      const eventName = card.dataset.eventName;
      const event = this.events.find((e) => e.name === eventName);
      if (event) {
        this.fetchEventWeather(event, card);
      }
    });
  }

  /**
   * Setup IntersectionObserver for lazy thumbnail loading
   */
  setupLazyLoading() {
    // Only create observer if IntersectionObserver is available
    if ('IntersectionObserver' in window) {
      this.thumbnailObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const eventItem = entry.target;
              const eventName = eventItem.dataset.eventName;
              const event = this.events.find((e) => e.name === eventName);

              if (event && (event.thumbnailFile || event.thumbnailUrl)) {
                this.loadThumbnailLazy(event, eventItem);
              }

              // Stop observing once loaded
              this.thumbnailObserver.unobserve(eventItem);
            }
          });
        },
        {
          root: this.container,
          rootMargin: '100px', // Start loading 100px before entering viewport
          threshold: 0,
        }
      );
    }
  }

  /**
   * Load thumbnail lazily for an event item
   * @param {Object} event
   * @param {HTMLElement} eventItem
   */
  async loadThumbnailLazy(event, eventItem) {
    if (!event.thumbnailFile && !event.thumbnailUrl) return;

    const placeholder = eventItem.querySelector('.event-thumbnail-placeholder');
    if (!placeholder) return; // Already has thumbnail

    try {
      const thumbURL = await this.getThumbnail(event);
      if (thumbURL) {
        const img = document.createElement('img');
        img.src = thumbURL;
        img.alt = 'Event thumbnail';
        img.className = 'event-thumbnail';
        placeholder.replaceWith(img);
      }
    } catch (error) {
      console.warn(
        '[EventBrowser] Failed to load thumbnail for',
        event.name,
        error
      );
    }
  }

  /**
   * Set the video player reference (can be called after initialization)
   * @param {VideoPlayer} videoPlayer
   */
  setVideoPlayer(videoPlayer) {
    this.videoPlayer = videoPlayer;
  }

  /**
   * Compute recording health for an event. Used to surface obvious issues
   * (missing cameras, truncated clips, missing metadata) as a sidebar
   * badge so users can skip or investigate problematic events before
   * loading them.
   *
   * Status tiers:
   *   healthy  — no issues, no badge shown (clean UI)
   *   minor    — one small issue, yellow "!" badge
   *   warning  — multiple issues or severe one, orange "⚠" badge
   *
   * All checks are fast property reads — safe to call for every event row.
   *
   * @param {Object} event
   * @returns {{status: string, issues: string[], icon: string}}
   */
  computeRecordingHealth(event) {
    const issues = [];

    // Virtual/aggregate events (hour-grouped RecentClips) — no health concept
    if (event.isVirtual || event.isEmpty) {
      return { status: 'healthy', issues: [], icon: '' };
    }
    if (!event.clipGroups || event.clipGroups.length === 0) {
      return { status: 'warning', issues: ['No video clips'], icon: '⚠' };
    }

    // 1. Missing cameras per clip group. RecentClips are Tesla's rolling
    // buffer — every camera records to it continuously, so they should
    // have the same camera completeness as saved/sentry events. Any
    // missing camera here means data was lost or copied incompletely.
    {
      const expectedCams = event.hasPillarCameras ? 6 : 4;
      let incompleteGroups = 0;
      let missingCamsSet = new Set();
      const standardCams = ['front', 'back', 'left_repeater', 'right_repeater'];
      const pillarCams = ['left_pillar', 'right_pillar'];
      const expectedList = event.hasPillarCameras
        ? [...standardCams, ...pillarCams]
        : standardCams;
      for (const g of event.clipGroups) {
        const clips = g.clips || {};
        const present = Object.keys(clips).length;
        if (present < expectedCams) {
          incompleteGroups++;
          for (const c of expectedList) if (!clips[c]) missingCamsSet.add(c);
        }
      }
      if (incompleteGroups > 0) {
        const camList = Array.from(missingCamsSet).join(', ');
        issues.push(
          `${incompleteGroups} of ${event.clipGroups.length} clip groups missing ${camList}`
        );
      }
    }

    // 2. Missing event.json metadata (SavedClips/SentryClips should have one)
    if (
      (event.type === 'SavedClips' || event.type === 'SentryClips') &&
      !event.metadata
    ) {
      issues.push('No event.json metadata (may be partial save)');
    }

    // 3. Very short event — likely interrupted
    // Sentry events are normally ~10 min (10 clips). Anything <3 clips is suspect.
    if (event.type === 'SentryClips' && event.clipGroups.length < 3) {
      issues.push(
        `Only ${event.clipGroups.length} clip${event.clipGroups.length === 1 ? '' : 's'} — recording may have been interrupted`
      );
    }

    // 4. SavedClips are user-triggered and typically 11 clips (10 min leading
    // up to save). Very short ones may indicate a failed save.
    if (event.type === 'SavedClips' && event.clipGroups.length < 2) {
      issues.push(
        `Only ${event.clipGroups.length} clip${event.clipGroups.length === 1 ? '' : 's'} — save may have failed to capture full buffer`
      );
    }

    // 5. SEI-derived issues (hydrated from eventInsightsCache by
    // app._bulkHydrateInsightBadges / _hydrateInsightsFromCache).
    // Frame-count check needs SEI parsing, so it only contributes
    // once the background scanner or the live load has populated
    // event._recordingHealth — until then we silently skip it.
    const sei = event._recordingHealth;
    if (sei && sei.shortClipCount > 0) {
      issues.push(
        `${sei.shortClipCount} clip${sei.shortClipCount === 1 ? '' : 's'} with very few frames — possible dropped recording`
      );
    }

    if (issues.length === 0) {
      return { status: 'healthy', issues: [], icon: '' };
    }
    if (issues.length === 1) {
      return { status: 'minor', issues, icon: '!' };
    }
    return { status: 'warning', issues, icon: '⚠' };
  }

  /**
   * Build the launch-count chip ("🏁 ×3"). Only call when count > 0;
   * silent on quiet events keeps the card uncluttered.
   */
  _buildLaunchBadge(launchCount) {
    const span = document.createElement('span');
    span.className = 'launch-badge';
    span.title = `${launchCount} full-throttle launch${launchCount === 1 ? '' : 'es'} detected`;
    span.textContent = launchCount === 1 ? '🏁' : `🏁 ×${launchCount}`;
    return span;
  }

  /**
   * Get cached near-miss data for an event
   * @param {string} eventKey - Event identifier
   * @returns {Object|null} Near-miss data or null
   */
  getNearMissData(eventKey) {
    try {
      const cacheKey = 'teslacamviewer_nearmiss_cache';
      const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      return cache[eventKey] || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Create a clickable near-miss indicator element
   * @param {string} eventKey - Event identifier
   * @param {number} count - Number of near-misses
   * @param {number} maxScore - Maximum score
   * @returns {HTMLElement}
   */
  _createNearMissIndicator(eventKey, count, maxScore) {
    const severityClass =
      maxScore >= 7 ? 'critical' : maxScore >= 5 ? 'warning' : 'caution';
    const indicator = document.createElement('span');
    indicator.className = `nearmiss-indicator ${severityClass}`;
    indicator.textContent = `⚠ ${count}`;
    indicator.title = `Click to view ${count} near-miss incident${count > 1 ? 's' : ''} (max score: ${maxScore.toFixed(1)})`;
    indicator.dataset.eventKey = eventKey;
    indicator.dataset.incidentIndex = '0';

    // Make it clickable - cycles through incidents
    indicator.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event card click
      const key = indicator.dataset.eventKey;
      let index = parseInt(indicator.dataset.incidentIndex) || 0;

      // Navigate to the incident
      if (window.app?.navigateToNearMiss) {
        window.app.navigateToNearMiss(key, index);
      }

      // Increment index for next click (cycle through incidents)
      const data = this.getNearMissData(key);
      if (data && data.incidents && data.incidents.length > 1) {
        index = (index + 1) % data.incidents.length;
        indicator.dataset.incidentIndex = index.toString();
        indicator.title = `Click for incident ${index + 1}/${data.incidents.length} (max score: ${maxScore.toFixed(1)})`;
      }
    });

    return indicator;
  }

  /**
   * Update near-miss indicator on a specific event card
   * @param {string} eventKey - Event identifier
   * @param {number} count - Number of near-misses (score >= 5)
   * @param {number} maxScore - Maximum near-miss score
   */
  updateNearMissIndicator(eventKey, count, maxScore) {
    const eventItems = this.container.querySelectorAll('.event-item');
    for (const item of eventItems) {
      const itemKey = item.dataset.eventKey || item.dataset.eventName;
      if (itemKey !== eventKey) continue;

      const existingIndicator = item.querySelector('.nearmiss-indicator');

      if (count > 0) {
        // Always recreate to ensure click handler is attached
        if (existingIndicator) {
          existingIndicator.remove();
        }
        const header = item.querySelector('.event-item-header');
        if (header) {
          const indicator = this._createNearMissIndicator(
            eventKey,
            count,
            maxScore
          );
          header.appendChild(indicator);
        }
      } else if (existingIndicator) {
        existingIndicator.remove();
      }
      break;
    }
  }

  /**
   * Refresh near-miss indicators on all event cards from cache
   */
  refreshNearMissIndicators() {
    const eventItems = this.container.querySelectorAll('.event-item');
    for (const item of eventItems) {
      const eventKey = item.dataset.eventKey || item.dataset.eventName;
      const data = this.getNearMissData(eventKey);
      const existingIndicator = item.querySelector('.nearmiss-indicator');

      if (data && data.count > 0) {
        // Always recreate to ensure click handler is attached
        if (existingIndicator) {
          existingIndicator.remove();
        }
        const header = item.querySelector('.event-item-header');
        if (header) {
          const indicator = this._createNearMissIndicator(
            eventKey,
            data.count,
            data.maxScore
          );
          header.appendChild(indicator);
        }
      } else if (existingIndicator) {
        existingIndicator.remove();
      }
    }
  }

  /**
   * Load and display events
   * @param {Array} events
   */
  async loadEvents(events) {
    this.events = events;
    this.selectedEvent = null;
    this.render();
    // Notify AI Search + other listeners that a new library loaded
    window.dispatchEvent(
      new CustomEvent('folder-loaded', {
        detail: { eventCount: events.length },
      })
    );
  }

  /** Public alias so aiSearchUI can navigate to events by object reference. */
  loadEvent(event) {
    if (!event) return;
    const el = this.container.querySelector(
      `[data-event-name="${CSS.escape(event.name)}"]`
    );
    if (el) el.click();
  }

  /** Public alias for re-rendering the whole list (used when clearing AI search). */
  renderEvents() {
    this.render();
  }

  /**
   * Refresh the badges on a specific event's sidebar card without
   * re-rendering the whole list. Called after async computations
   * (severity score, etc.) finish.
   * @param {string} eventName
   */
  refreshEventBadges(eventName) {
    const event = (this.events || []).find((e) => e.name === eventName);
    if (!event) return;
    const item = this.container.querySelector(
      `.event-item[data-event-name="${CSS.escape(eventName)}"]`
    );
    if (!item) return;
    const header = item.querySelector('.event-item-header');
    if (!header) return;

    // Remove any existing badges we own
    header
      .querySelectorAll('.health-badge, .severity-badge, .launch-badge')
      .forEach((el) => el.remove());

    const health = this.computeRecordingHealth(event);
    const severity = event._severityScore;
    const launches = Array.isArray(event._launches) ? event._launches : null;
    const typeSpan = header.querySelector('.event-type');
    if (!typeSpan) return;

    // Insertion uses insertAdjacentElement('afterend'), which inserts
    // right after the anchor — so the last badge inserted ends up
    // CLOSEST to the type pill. Insert in reverse of desired left-to-
    // right order: launches → health → severity.
    if (launches && launches.length > 0) {
      typeSpan.insertAdjacentElement(
        'afterend',
        this._buildLaunchBadge(launches.length)
      );
    }
    if (health.status !== 'healthy') {
      const hb = document.createElement('span');
      hb.className = `health-badge health-${health.status}`;
      hb.title = 'Recording health issues:\n• ' + health.issues.join('\n• ');
      hb.textContent = health.icon;
      typeSpan.insertAdjacentElement('afterend', hb);
    }
    if (severity && severity.tier && severity.tier !== 'mild') {
      typeSpan.insertAdjacentElement(
        'afterend',
        this._buildSeverityBadge(event, severity)
      );
    }
  }

  /**
   * Build a clickable severity badge. Click opens a popover listing each
   * detected event; clicking a row selects the parent event (if needed)
   * and seeks the player to the peak time. Keeps the surrounding
   * event-item click from stealing the tap.
   */
  _buildSeverityBadge(event, severity) {
    const sb = document.createElement('span');
    sb.className = `severity-badge severity-${severity.tier} clickable`;
    sb.title = severity.detailText;
    sb.textContent = severity.label;
    sb.addEventListener('click', (e) => {
      e.stopPropagation();
      this._showSeverityPopover(event, severity, sb);
    });
    return sb;
  }

  /**
   * Show a small popover anchored to a severity badge. Lists each detected
   * event with its time, kind, and peak g; clicking a row seeks there.
   */
  _showSeverityPopover(event, severity, anchor) {
    // Close any existing popover first
    document.querySelectorAll('.severity-popover').forEach((p) => p.remove());
    const events = (severity.events || [])
      .slice()
      .sort((a, b) => a.peakTime - b.peakTime);
    if (events.length === 0) return;

    const pop = document.createElement('div');
    pop.className = 'severity-popover';

    const fmt = (sec) => {
      const mm = Math.floor(sec / 60);
      const ss = Math.round(sec % 60)
        .toString()
        .padStart(2, '0');
      return `${mm}:${ss}`;
    };
    const kindLabel = (k) =>
      k === 'brake'
        ? 'Hard brake'
        : k === 'lateral'
          ? 'Lateral jolt'
          : 'Impact';

    for (const ev of events) {
      const row = document.createElement('div');
      row.className = `severity-popover-row sev-${ev.tier}`;
      row.innerHTML = `
                <span class="sev-tier">${ev.label}</span>
                <span class="sev-kind">${kindLabel(ev.kind)}</span>
                <span class="sev-g">${ev.peakG.toFixed(2)}g</span>
                <span class="sev-time">${fmt(ev.peakTime)}</span>
            `;
      row.addEventListener('click', async (e) => {
        e.stopPropagation();
        pop.remove();
        // If user isn't already on this event, load it first
        if (this.selectedEvent?.name !== event.name) {
          await new Promise((resolve) => {
            const origCb = this.onEventSelect;
            this.onEventSelect = async (ev2) => {
              if (origCb) await origCb(ev2);
              this.onEventSelect = origCb;
              resolve();
            };
            this.selectEvent(event);
          });
        }
        // Seek once the player has the event loaded
        const vp = window.app?.videoPlayer;
        if (vp && typeof vp.seekToEventTime === 'function') {
          await vp.seekToEventTime(ev.peakTime);
        }
      });
      pop.appendChild(row);
    }

    document.body.appendChild(pop);
    const rect = anchor.getBoundingClientRect();
    pop.style.left = `${Math.min(rect.left, window.innerWidth - pop.offsetWidth - 8)}px`;
    pop.style.top = `${rect.bottom + 4}px`;

    // Dismiss on outside click / escape
    const dismiss = (e) => {
      if (!pop.contains(e.target) && e.target !== anchor) {
        pop.remove();
        document.removeEventListener('mousedown', dismiss, true);
        document.removeEventListener('keydown', onKey, true);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        pop.remove();
        document.removeEventListener('mousedown', dismiss, true);
        document.removeEventListener('keydown', onKey, true);
      }
    };
    document.addEventListener('mousedown', dismiss, true);
    document.addEventListener('keydown', onKey, true);
  }

  /**
   * Render event list (synchronous for fast initial display)
   */
  render() {
    this.container.innerHTML = '';

    if (this.events.length === 0) {
      this.container.innerHTML = `
                <div class="empty-state">
                    <p>No events found</p>
                    <p class="hint">The selected folder doesn't contain any TeslaCam events</p>
                </div>
            `;
      return;
    }

    // Update stats
    this.updateStats();

    // Create document fragment for efficient batch insertion
    const fragment = document.createDocumentFragment();

    // Render each event synchronously with placeholders
    for (const event of this.events) {
      const eventElement = this.createEventElementSync(event);
      fragment.appendChild(eventElement);

      // Observe for lazy thumbnail loading if it has a thumbnail
      if (
        this.thumbnailObserver &&
        (event.thumbnailFile || event.thumbnailUrl)
      ) {
        this.thumbnailObserver.observe(eventElement);
      }
    }

    // Single DOM insertion
    this.container.appendChild(fragment);

    // Start loading weather data in batches (non-blocking)
    this.loadWeatherBatched();
  }

  /**
   * Load weather data in small batches to avoid overwhelming the API
   */
  async loadWeatherBatched() {
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 100; // ms between batches

    for (let i = 0; i < this.events.length; i += BATCH_SIZE) {
      const batch = this.events.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      await Promise.all(
        batch.map((event) => {
          const eventItem = this.container.querySelector(
            `[data-event-name="${event.name}"]`
          );
          if (eventItem) {
            return this.fetchEventWeather(event, eventItem);
          }
          return Promise.resolve();
        })
      );

      // Small delay between batches
      if (i + BATCH_SIZE < this.events.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }
  }

  /**
   * Update event statistics display
   */
  updateStats() {
    const countElement = document.getElementById('eventCount');
    const statsElement = document.getElementById('eventStats');

    const saved = this.events.filter((e) => e.type === 'SavedClips').length;
    const sentry = this.events.filter((e) => e.type === 'SentryClips').length;
    const recent = this.events.filter((e) => e.type === 'RecentClips').length;
    const empty = this.events.filter((e) => e.isEmpty).length;

    // Update count next to "EVENTS" heading
    if (countElement) {
      countElement.textContent = `(${this.events.length})`;
    }

    // Update stats as single line below
    if (statsElement) {
      let statsText = `${saved} saved, ${sentry} sentry, ${recent} recent`;
      if (empty > 0) {
        statsText += ` (${empty} empty)`;
      }
      statsElement.textContent = statsText;
    }
  }

  /**
   * Create DOM element for an event (synchronous - uses placeholders)
   * @param {Object} event
   * @returns {HTMLElement}
   */
  createEventElementSync(event) {
    const div = document.createElement('div');
    div.className = event.isEmpty ? 'event-item event-empty' : 'event-item';
    div.dataset.eventName = event.name;
    div.dataset.eventKey = event.compoundKey || event.name;

    // Get event type class
    const typeClass = event.type.toLowerCase().replace('clips', '');

    // Format date/time
    const date = new Date(event.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Format location
    let location = '';
    if (event.metadata) {
      const city = event.metadata.city || '';
      const street = event.metadata.street || '';
      if (city && street) {
        location = `${street}, ${city}`;
      } else if (city) {
        location = city;
      } else if (street) {
        location = street;
      }
    }

    // Format reason
    const reason = event.metadata
      ? FolderParser.formatReason(event.metadata.reason)
      : '';

    // Always use placeholder - thumbnails load lazily
    const clipCount = event.clipGroups?.length || 0;
    const timeRange = this._getTimeRangeFromClips(event);
    const thumbnailHTML = `<div class="event-thumbnail-placeholder">
            <span class="placeholder-icon">🎥</span>
            <span class="placeholder-text">${clipCount} Clips</span>
            ${timeRange ? `<span class="placeholder-time">${timeRange}</span>` : ''}
        </div>`;

    // GPS coordinates
    let gpsHTML = '';
    if (event.metadata?.est_lat && event.metadata?.est_lon) {
      const lat = parseFloat(event.metadata.est_lat);
      const lon = parseFloat(event.metadata.est_lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        gpsHTML = `<div class="event-gps">GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>`;
      }
    }

    // Calculate event duration
    const durationMinutes = ((event.clipGroups.length * 60) / 60).toFixed(1);

    // Drive badge
    const driveBadgeHTML = event.driveLabel
      ? `<span class="drive-badge" style="background: ${event.driveColor || 'var(--accent)'};" title="${event.driveLabel}">${event.driveLabel}</span>`
      : '';

    // Recording Health Badge — only shown when issues detected. Silent on
    // healthy events so the UI stays clean.
    const health = this.computeRecordingHealth(event);
    const healthBadgeHTML =
      health.status !== 'healthy'
        ? `<span class="health-badge health-${health.status}" title="Recording health issues:\n• ${health.issues.join('\n• ')}">${health.icon}</span>`
        : '';

    // Intervention Severity Badge — now always built via helper so the
    // initial render has the same click handler as refreshEventBadges.
    const severity = event._severityScore;

    div.innerHTML = `
            ${thumbnailHTML}
            <div class="event-item-header">
                ${driveBadgeHTML}
                <span class="event-type ${typeClass}">${typeClass}</span>
                ${healthBadgeHTML}
                <span class="event-item-date">${dateStr}</span>
            </div>
            <div class="event-item-time">${timeStr}</div>
            ${location ? `<div class="event-item-location">${location}</div>` : ''}
            ${gpsHTML}
            ${reason ? `<div class="event-item-reason">${reason}</div>` : ''}
            <div class="event-item-weather"></div>
            <div class="event-item-clips">${event.isEmpty ? '<span class="empty-warning">⚠ No video clips</span>' : `${event.clipGroups.length} clips (~${durationMinutes} min)`}</div>
        `;

    // Handle click
    div.addEventListener('click', () => {
      if (event.isEmpty) {
        this.showEmptyEventWarning(event);
      } else {
        this.selectEvent(event, div);
      }
    });

    // Attach severity badge if already computed (with click handler)
    if (severity && severity.tier && severity.tier !== 'mild') {
      const typeSpan = div.querySelector('.event-type');
      if (typeSpan) {
        typeSpan.insertAdjacentElement(
          'afterend',
          this._buildSeverityBadge(event, severity)
        );
      }
    }

    return div;
  }

  /**
   * Create DOM element for an event (async version - kept for compatibility)
   * @param {Object} event
   * @returns {Promise<HTMLElement>}
   */
  async createEventElement(event) {
    const div = document.createElement('div');
    div.className = event.isEmpty ? 'event-item event-empty' : 'event-item';
    div.dataset.eventName = event.name;
    div.dataset.eventKey = event.compoundKey || event.name;

    // Get event type class
    const typeClass = event.type.toLowerCase().replace('clips', '');

    // Format date/time
    const date = new Date(event.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Format location
    let location = '';
    if (event.metadata) {
      const city = event.metadata.city || '';
      const street = event.metadata.street || '';
      if (city && street) {
        location = `${street}, ${city}`;
      } else if (city) {
        location = city;
      } else if (street) {
        location = street;
      }
    }

    // Format reason
    const reason = event.metadata
      ? FolderParser.formatReason(event.metadata.reason)
      : '';

    // Get thumbnail or show placeholder
    let thumbnailHTML = '';
    if (event.thumbnailFile || event.thumbnailUrl) {
      const thumbURL = await this.getThumbnail(event);
      if (thumbURL) {
        thumbnailHTML = `<img src="${thumbURL}" alt="Event thumbnail" class="event-thumbnail">`;
      }
    }
    // Show placeholder for events without thumbnails (e.g., RecentClips)
    if (!thumbnailHTML) {
      const clipCount = event.clipGroups?.length || 0;
      const timeRange = this._getTimeRangeFromClips(event);
      thumbnailHTML = `<div class="event-thumbnail-placeholder">
                <span class="placeholder-icon">🎥</span>
                <span class="placeholder-text">${clipCount} Clips</span>
                ${timeRange ? `<span class="placeholder-time">${timeRange}</span>` : ''}
            </div>`;
    }

    // GPS coordinates
    let gpsHTML = '';
    if (event.metadata?.est_lat && event.metadata?.est_lon) {
      const lat = parseFloat(event.metadata.est_lat);
      const lon = parseFloat(event.metadata.est_lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        gpsHTML = `<div class="event-gps">GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>`;
      }
    }

    // Calculate event duration (approximately 60 seconds per clip)
    const durationMinutes = ((event.clipGroups.length * 60) / 60).toFixed(1);

    // Drive badge - always show drive label when available
    const driveBadgeHTML = event.driveLabel
      ? `<span class="drive-badge" style="background: ${event.driveColor || 'var(--accent)'};" title="${event.driveLabel}">${event.driveLabel}</span>`
      : '';

    // Recording health badge
    const health = this.computeRecordingHealth(event);
    const healthBadgeHTML =
      health.status !== 'healthy'
        ? `<span class="health-badge health-${health.status}" title="Recording health issues:\n• ${health.issues.join('\n• ')}">${health.icon}</span>`
        : '';

    div.innerHTML = `
            ${thumbnailHTML}
            <div class="event-item-header">
                ${driveBadgeHTML}
                <span class="event-type ${typeClass}">${typeClass}</span>
                ${severityBadgeHTML}
                ${healthBadgeHTML}
                <span class="event-item-date">${dateStr}</span>
            </div>
            <div class="event-item-time">${timeStr}</div>
            ${location ? `<div class="event-item-location">${location}</div>` : ''}
            ${gpsHTML}
            ${reason ? `<div class="event-item-reason">${reason}</div>` : ''}
            <div class="event-item-weather"></div>
            <div class="event-item-clips">${event.isEmpty ? '<span class="empty-warning">⚠ No video clips</span>' : `${event.clipGroups.length} clips (~${durationMinutes} min)`}</div>
        `;

    // Fetch weather asynchronously (don't block card rendering)
    this.fetchEventWeather(event, div);

    // Handle click - show warning for empty events
    div.addEventListener('click', () => {
      if (event.isEmpty) {
        this.showEmptyEventWarning(event);
      } else {
        this.selectEvent(event, div);
      }
    });

    return div;
  }

  /**
   * Fetch and display weather for an event card (async, non-blocking)
   * @param {Object} event
   * @param {HTMLElement} cardElement
   */
  async fetchEventWeather(event, cardElement) {
    // Check if we have GPS and timestamp
    if (
      !event.metadata?.est_lat ||
      !event.metadata?.est_lon ||
      !event.metadata?.timestamp
    ) {
      return;
    }

    const lat = parseFloat(event.metadata.est_lat);
    const lng = parseFloat(event.metadata.est_lon);

    if (isNaN(lat) || isNaN(lng)) {
      return;
    }

    try {
      const weather = await window.weatherService?.getWeather(
        lat,
        lng,
        event.metadata.timestamp
      );

      if (weather) {
        const weatherEl = cardElement.querySelector('.event-item-weather');
        if (weatherEl) {
          // Compact format for card: icon + temp + short description
          const text = `${weather.icon} ${weather.temperature}${weather.temperatureUnit} ${weather.description}`;
          weatherEl.textContent = text;
        }
      }
    } catch (error) {
      // Silently fail - weather is supplementary
      console.debug('[EventBrowser] Weather fetch failed:', error);
    }
  }

  /**
   * Get or create thumbnail URL
   * @param {Object} event
   * @returns {Promise<string|null>}
   */
  async getThumbnail(event) {
    if (event.thumbnailUrl) {
      return event.thumbnailUrl;
    }

    if (this.thumbnailCache.has(event.name)) {
      return this.thumbnailCache.get(event.name);
    }

    if (!event.thumbnailFile) {
      return null;
    }

    try {
      const file = await event.thumbnailFile.getFile();
      const url = URL.createObjectURL(file);
      this.thumbnailCache.set(event.name, url);
      return url;
    } catch (error) {
      console.error('Error loading thumbnail:', error);
      return null;
    }
  }

  /**
   * Get time range string from event clips (e.g., "From 7:00-7:59 AM")
   * @param {Object} event
   * @returns {string|null}
   */
  _getTimeRangeFromClips(event) {
    if (!event.clipGroups || event.clipGroups.length === 0) {
      return null;
    }

    try {
      // Get first and last clip timestamps
      const firstClip = event.clipGroups[0];
      const lastClip = event.clipGroups[event.clipGroups.length - 1];

      // Parse timestamps from clip names (format: YYYY-MM-DD_HH-MM-SS)
      const firstMatch = firstClip.timestamp.match(/(\d{2})-(\d{2})-(\d{2})$/);
      const lastMatch = lastClip.timestamp.match(/(\d{2})-(\d{2})-(\d{2})$/);

      if (firstMatch && lastMatch) {
        const firstHour = parseInt(firstMatch[1]);
        const firstMin = parseInt(firstMatch[2]);
        const lastHour = parseInt(lastMatch[1]);
        const lastMin = parseInt(lastMatch[2]);

        const formatTime = (h, m) => {
          const period = h >= 12 ? 'PM' : 'AM';
          const hour12 = h % 12 || 12;
          return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
        };

        // If same hour range, simplify
        if (firstHour === lastHour) {
          return `From ${formatTime(firstHour, firstMin)}`;
        }

        return `From ${formatTime(firstHour, firstMin)} - ${formatTime(lastHour, lastMin)}`;
      }
    } catch (e) {
      console.warn('[EventBrowser] Failed to parse time range:', e);
    }

    return null;
  }

  /**
   * Select an event
   * @param {Object} event
   * @param {HTMLElement} element
   */
  selectEvent(event, element) {
    // Hide any running preview first
    // this.hidePreview();

    // If no element provided, find it
    if (!element) {
      const eventItems = this.container.querySelectorAll('.event-item');
      for (const item of eventItems) {
        if (item.dataset.eventName === event.name) {
          element = item;
          break;
        }
      }
    }

    if (!element) {
      console.warn('Could not find element for event:', event);
      return;
    }

    // Remove active class from previous selection
    const previousActive = this.container.querySelector('.event-item.active');
    if (previousActive) {
      previousActive.classList.remove('active');
    }

    // Add active class to new selection
    element.classList.add('active');

    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    this.selectedEvent = event;

    // Call callback
    if (this.onEventSelect) {
      this.onEventSelect(event);
    }
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
    this.selectedEvent = null;

    // Disconnect observer before clearing DOM
    if (this.thumbnailObserver) {
      this.thumbnailObserver.disconnect();
    }

    this.container.innerHTML = `
            <div class="empty-state">
                <p>No TeslaCam folder selected</p>
                <p class="hint">Click "Select TeslaCam Folder" to get started</p>
            </div>
        `;

    // Revoke thumbnail URLs
    for (const url of this.thumbnailCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.thumbnailCache.clear();
  }

  /**
   * Show warning when user clicks on an empty event
   * @param {Object} event
   */
  showEmptyEventWarning(event) {
    // Format date for display
    const date = new Date(event.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'empty-event-toast';
    toast.innerHTML = `
            <span class="toast-icon">⚠</span>
            <span class="toast-message">No video clips available for event on ${dateStr}</span>
        `;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Get currently selected event
   * @returns {Object|null}
   */
  getSelectedEvent() {
    return this.selectedEvent;
  }
}

if (typeof window !== 'undefined') {
  window.EventBrowser = EventBrowser;
}
