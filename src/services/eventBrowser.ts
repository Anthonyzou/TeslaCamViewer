/**
 * EventBrowser - Headless event loading, thumbnail pre-resolution, and event selection service.
 * DOM rendering is declaratively managed by EventList.vue and EventCard.vue.
 */
import { syncEvents } from '../composables/useEvents';
import type { TeslaCamEvent } from '../types';

/**
 * Compute recording health for an event.
 */
export function computeRecordingHealth(event: TeslaCamEvent): {
  status: 'healthy' | 'minor' | 'warning';
  issues: string[];
  icon: string;
} {
  const issues: string[] = [];

  // Virtual/aggregate events (hour-grouped RecentClips) — no health concept
  if (!event || event.isVirtual || event.isEmpty) {
    return { status: 'healthy', issues: [], icon: '' };
  }
  if (!event.clipGroups || event.clipGroups.length === 0) {
    return { status: 'warning', issues: ['No video clips'], icon: '⚠' };
  }

  // 1. Missing cameras per clip group.
  const expectedCams = event.hasPillarCameras ? 6 : 4;
  let incompleteGroups = 0;
  const missingCamsSet = new Set<string>();
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

  // 2. Missing event.json metadata (SavedClips/SentryClips should have one)
  if (
    (event.type === 'SavedClips' || event.type === 'SentryClips') &&
    !event.metadata
  ) {
    issues.push('No event.json metadata (may be partial save)');
  }

  // 3. Very short event — likely interrupted
  if (event.type === 'SentryClips' && event.clipGroups.length < 3) {
    issues.push(
      `Only ${event.clipGroups.length} clip${event.clipGroups.length === 1 ? '' : 's'} — recording may have been interrupted`
    );
  }

  // 4. SavedClips are user-triggered and typically 11 clips
  if (event.type === 'SavedClips' && event.clipGroups.length < 2) {
    issues.push(
      `Only ${event.clipGroups.length} clip${event.clipGroups.length === 1 ? '' : 's'} — save may have failed to capture full buffer`
    );
  }

  // 5. SEI-derived issues
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
 * Get time range string from event clips (e.g., "From 7:00-7:59 AM")
 */
export function getTimeRangeFromClips(event: TeslaCamEvent): string | null {
  if (!event || !event.clipGroups || event.clipGroups.length === 0) {
    return null;
  }

  try {
    const firstClip = event.clipGroups[0];
    const lastClip = event.clipGroups[event.clipGroups.length - 1];

    if (!firstClip?.timestamp || !lastClip?.timestamp) return null;

    const firstMatch = String(firstClip.timestamp).match(
      /(\d{2})-(\d{2})-(\d{2})$/
    );
    const lastMatch = String(lastClip.timestamp).match(
      /(\d{2})-(\d{2})-(\d{2})$/
    );

    if (firstMatch && lastMatch) {
      const firstHour = parseInt(firstMatch[1], 10);
      const firstMin = parseInt(firstMatch[2], 10);
      const lastHour = parseInt(lastMatch[1], 10);
      const lastMin = parseInt(lastMatch[2], 10);

      const formatTime = (h: number, m: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
      };

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

class EventBrowser {
  private events: TeslaCamEvent[] = [];
  private selectedEvent: TeslaCamEvent | null = null;
  private thumbnailCache = new Map<string, string>();
  public isVueManaged = true;

  constructor(
    public container: HTMLElement | null = null,
    private onEventSelect: ((event: TeslaCamEvent) => void) | null = null
  ) {}

  /**
   * Compute recording health for an event.
   */
  computeRecordingHealth(event: TeslaCamEvent) {
    return computeRecordingHealth(event);
  }

  /**
   * Load and pre-resolve events and thumbnails
   */
  async loadEvents(events: TeslaCamEvent[]) {
    this.events = events;
    this.selectedEvent = null;

    // Resolve local file thumbnails concurrently so img tags can use native loading="lazy"
    await Promise.all(
      events.map(async (event) => {
        if (!event.thumbnailUrl && event.thumbnailFile) {
          event.thumbnailUrl = (await this.getThumbnail(event)) || undefined;
        }
      })
    );

    syncEvents();

    // Notify AI Search + other listeners that a new library loaded
    if (
      typeof window !== 'undefined' &&
      typeof window.dispatchEvent === 'function'
    ) {
      window.dispatchEvent(
        new CustomEvent('folder-loaded', {
          detail: { eventCount: events.length },
        })
      );
    }
  }

  /** Public alias so aiSearchUI can navigate to events by object reference. */
  loadEvent(event: TeslaCamEvent) {
    if (!event) return;
    this.selectEvent(event);
  }

  /** No-op retained for backwards compatibility */
  renderEvents() {}

  /** No-op retained for backwards compatibility */
  render() {}

  /**
   * Get or create thumbnail URL with local blob caching
   */
  async getThumbnail(event: TeslaCamEvent): Promise<string | null> {
    if (event.thumbnailUrl) {
      return event.thumbnailUrl;
    }

    if (this.thumbnailCache.has(event.name)) {
      return this.thumbnailCache.get(event.name) || null;
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
   */
  _getTimeRangeFromClips(event: TeslaCamEvent) {
    return getTimeRangeFromClips(event);
  }

  /**
   * Select an event
   */
  selectEvent(event: TeslaCamEvent) {
    this.selectedEvent = event;
    if (this.onEventSelect) {
      this.onEventSelect(event);
    }
  }

  /**
   * Clear all events and revoke thumbnail blob URLs
   */
  clear() {
    this.events = [];
    this.selectedEvent = null;

    for (const url of this.thumbnailCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.thumbnailCache.clear();
  }

  /**
   * Get currently selected event
   */
  getSelectedEvent(): TeslaCamEvent | null {
    return this.selectedEvent;
  }

  /**
   * Get all loaded events
   */
  getEvents(): TeslaCamEvent[] {
    return this.events;
  }
}

export { EventBrowser };
export default EventBrowser;
