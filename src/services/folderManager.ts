/**
 * FolderManager - Manages multiple TeslaCam folders/drives
 * Supports adding, removing, and switching between multiple drives
 */
import dayjs from 'dayjs';
import { openDB, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type {
  DriveInfo,
  DriveRecord,
  TeslaCamEvent,
  TeslaCamViewerDBSchema,
} from '../types';

class FolderManager {
  public drives: DriveInfo[] = [];
  public activeDriveId: string | null = null;
  public DB_NAME = 'TeslaCamViewerDB';
  public DB_STORE = 'drives' as const;
  public DB_VERSION = 3;

  public driveColors = [
    '#4a9eff',
    '#4caf50',
    '#ff9800',
    '#e91e63',
    '#9c27b0',
    '#00bcd4',
    '#ff5722',
    '#607d8b',
  ];

  private _onDrivesChanged: ((drives: DriveInfo[]) => void) | null = null;
  private _drivesChangedListeners: ((drives: DriveInfo[]) => void)[] = [];

  get onDrivesChanged(): ((drives: DriveInfo[]) => void) | null {
    return this._onDrivesChanged;
  }

  set onDrivesChanged(fn: ((drives: DriveInfo[]) => void) | null) {
    this._onDrivesChanged = fn;
  }

  addDrivesChangedListener(
    listener: (drives: DriveInfo[]) => void
  ): () => void {
    this._drivesChangedListeners.push(listener);
    return () => {
      this._drivesChangedListeners = this._drivesChangedListeners.filter(
        (cb) => cb !== listener
      );
    };
  }

  notifyDrivesChanged(): void {
    if (typeof this._onDrivesChanged === 'function') {
      try {
        this._onDrivesChanged(this.drives);
      } catch (e) {
        console.error('Error in onDrivesChanged callback:', e);
      }
    }
    this._drivesChangedListeners.forEach((listener) => {
      try {
        listener(this.drives);
      } catch (e) {
        console.error('Error in drives changed listener:', e);
      }
    });
  }

  /**
   * Initialize IndexedDB for storing drives
   * @returns {Promise<IDBPDatabase<TeslaCamViewerDBSchema>>}
   */
  async openDB(): Promise<IDBPDatabase<TeslaCamViewerDBSchema>> {
    return openDB<TeslaCamViewerDBSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create drives store if it doesn't exist
        if (!db.objectStoreNames.contains('drives')) {
          const store = db.createObjectStore('drives', { keyPath: 'id' });
          store.createIndex('label', 'label', { unique: false });
        }

        // Keep the old folderHandles store for backward compatibility
        if (!db.objectStoreNames.contains('folderHandles')) {
          db.createObjectStore('folderHandles');
        }
      },
    });
  }

  /**
   * Load all drives from IndexedDB
   * @returns {Promise<void>}
   */
  async loadDrives(): Promise<void> {
    try {
      const db = await this.openDB();
      if (!db.objectStoreNames.contains(this.DB_STORE)) {
        console.warn(
          `Object store ${this.DB_STORE} not found in ${this.DB_NAME}`
        );
        this.drives = [];
        return;
      }
      const drives = (await db.getAll(this.DB_STORE)) as DriveInfo[];

      for (const d of drives) {
        if (!Array.isArray(d.events)) {
          d.events = [];
        }
      }

      this.drives = drives;
      this.notifyDrivesChanged();
      console.log(`Loaded ${drives.length} drives from IndexedDB`);
    } catch (e) {
      console.warn('Failed to load drives:', e);
      this.drives = [];
    }
  }

  /**
   * Save a drive to IndexedDB
   * @param {Object} drive
   * @returns {Promise<void>}
   */
  async saveDrive(drive: DriveInfo): Promise<void> {
    try {
      const db = await this.openDB();
      if (!db.objectStoreNames.contains(this.DB_STORE)) {
        console.warn(
          `Object store ${this.DB_STORE} not found in ${this.DB_NAME}`
        );
        return;
      }
      const record: DriveRecord = {
        id: drive.id,
        folderName: drive.folderName,
        label: drive.label,
        color: drive.color,
        addedAt: drive.addedAt,
        isArchive: !!drive.isArchive,
        dateFilter: drive.dateFilter || 'all',
        handle: drive.handle || null,
        isB2: !!drive.isB2,
      };
      await db.put(this.DB_STORE, record);
      console.log(`Saved drive ${drive.id} to IndexedDB`);
    } catch (e) {
      console.warn('Failed to save drive:', e);
    }
  }

  /**
   * Delete a drive from IndexedDB
   * @param {string} driveId
   * @returns {Promise<void>}
   */
  async deleteDriveFromDB(driveId: string) {
    try {
      const db = await this.openDB();
      if (!db.objectStoreNames.contains(this.DB_STORE)) {
        console.warn(
          `Object store ${this.DB_STORE} not found in ${this.DB_NAME}`
        );
        return;
      }
      await db.delete(this.DB_STORE, driveId);
      console.log(`Deleted drive ${driveId} from IndexedDB`);
    } catch (e) {
      console.warn('Failed to delete drive:', e);
    }
  }

  /**
   * Add a new drive from a folder handle
   * @param {FileSystemDirectoryHandle} handle
   * @param {Object} options - Drive options
   * @param {string} options.label - Optional custom label
   * @param {boolean} options.isArchive - If true, don't load on startup
   * @param {string} options.dateFilter - Date filter preset (e.g., 'all', 'week', 'month', '3months', '6months', 'year')
   * @returns {Promise<Object>} The created drive object
   */
  async addDrive(
    handle: FileSystemDirectoryHandle,
    options:
      | { label?: string; isArchive?: boolean; dateFilter?: string }
      | string = {}
  ): Promise<DriveInfo> {
    const opts = typeof options === 'string' ? { label: options } : options;

    // Check if this drive already exists (by comparing directory handles)
    for (const existingDrive of this.drives) {
      try {
        if (
          existingDrive.handle &&
          (await handle.isSameEntry(existingDrive.handle))
        ) {
          console.log(
            `Drive ${handle.name} already exists (same directory), returning existing`
          );
          return existingDrive;
        }
      } catch (_e) {
        // Handle comparison may fail if permission was revoked, continue checking
      }
    }

    // Assign color based on index
    const colorIndex = this.drives.length % this.driveColors.length;

    const drive: DriveInfo = {
      id: uuidv4(),
      handle: handle,
      folderName: handle.name,
      label: opts.label || this.generateLabel(handle.name),
      color: this.driveColors[colorIndex],
      addedAt: new Date().toISOString(),
      isArchive: opts.isArchive || false,
      dateFilter: opts.dateFilter || 'all',
      events: [], // Will be populated by FolderParser
    };

    this.drives.push(drive);
    await this.saveDrive(drive);

    this.notifyDrivesChanged();

    console.log(
      `Added drive: ${drive.label} (${drive.id})${drive.isArchive ? ' [ARCHIVE]' : ''}`
    );
    return drive;
  }

  /**
   * Add or update a Backblaze B2 Cloud Drive
   * @param {Array} events - Events fetched from B2
   * @param {Object} options - Custom label or color options
   * @returns {Promise<DriveInfo>} The B2 drive
   */
  async addOrUpdateB2Drive(
    events: TeslaCamEvent[] = [],
    options: { label?: string; color?: string } = {}
  ): Promise<DriveInfo> {
    let b2Drive = this.drives.find((d) => d.isB2 || d.id === 'b2');

    if (!b2Drive) {
      const colorIndex = this.drives.length % this.driveColors.length;
      b2Drive = {
        id: 'b2',
        label: options.label || 'Backblaze B2',
        folderName: 'Backblaze B2',
        color: options.color || '#003399' || this.driveColors[colorIndex],
        addedAt: new Date().toISOString(),
        isArchive: false,
        isB2: true,
        handle: null,
        dateFilter: 'all',
        events: events,
      };
      this.drives.push(b2Drive);
    } else {
      b2Drive.events = events;
      if (options.label) b2Drive.label = options.label;
      if (options.color) b2Drive.color = options.color;
    }

    await this.saveDrive(b2Drive);
    this.notifyDrivesChanged();
    return b2Drive;
  }

  /**
   * Get the registered B2 drive if any
   */
  getB2Drive(): DriveInfo | null {
    return this.drives.find((d) => d.isB2 || d.id === 'b2') || null;
  }

  /**
   * Check if a drive ID is a B2 cloud drive
   */
  isB2Drive(driveId: string): boolean {
    const drive = this.getDrive(driveId);
    return !!(drive?.isB2 || drive?.id === 'b2');
  }

  /**
   * Generate a human-readable label from folder name
   * @param {string} folderName
   * @returns {string}
   */
  generateLabel(folderName) {
    // If folder name is TeslaCam, use parent-like naming
    if (folderName === 'TeslaCam') {
      const driveNum = this.drives.length + 1;
      return `Drive ${driveNum}`;
    }

    // Try to extract meaningful name
    // Common patterns: USB drive names, date-based names, etc.
    const cleanName = folderName
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize first letter of each word
    return cleanName.replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Remove a drive by ID
   * @param {string} driveId
   * @returns {Promise<boolean>}
   */
  async removeDrive(driveId) {
    const index = this.drives.findIndex((d) => d.id === driveId);
    if (index === -1) {
      return false;
    }

    this.drives.splice(index, 1);
    await this.deleteDriveFromDB(driveId);

    // Reset active drive if it was removed
    if (this.activeDriveId === driveId) {
      this.activeDriveId = null;
    }

    this.notifyDrivesChanged();

    console.log(`Removed drive: ${driveId}`);
    return true;
  }

  /**
   * Update drive label
   * @param {string} driveId
   * @param {string} newLabel
   * @returns {Promise<boolean>}
   */
  async updateDriveLabel(driveId, newLabel) {
    const drive = this.drives.find((d) => d.id === driveId);
    if (!drive) {
      return false;
    }

    drive.label = newLabel;
    await this.saveDrive(drive);

    this.notifyDrivesChanged();

    return true;
  }

  /**
   * Update drive color
   * @param {string} driveId
   * @param {string} newColor
   * @returns {Promise<boolean>}
   */
  async updateDriveColor(driveId, newColor) {
    const drive = this.drives.find((d) => d.id === driveId);
    if (!drive) {
      return false;
    }

    drive.color = newColor;
    await this.saveDrive(drive);

    this.notifyDrivesChanged();

    return true;
  }

  /**
   * Update drive settings (archive status, date filter)
   * @param {string} driveId
   * @param {Object} settings
   * @param {boolean} settings.isArchive
   * @param {string} settings.dateFilter
   * @param {string} settings.label
   * @returns {Promise<boolean>}
   */
  async updateDriveSettings(driveId, settings) {
    const drive = this.drives.find((d) => d.id === driveId);
    if (!drive) {
      return false;
    }

    if (settings.label !== undefined) {
      drive.label = settings.label;
    }
    if (settings.isArchive !== undefined) {
      drive.isArchive = settings.isArchive;
    }
    if (settings.dateFilter !== undefined) {
      drive.dateFilter = settings.dateFilter;
    }

    await this.saveDrive(drive);

    this.notifyDrivesChanged();

    return true;
  }

  /**
   * Get human-readable date filter label
   * @param {string} filter
   * @returns {string}
   */
  getDateFilterLabel(filter) {
    const labels = {
      all: 'All events',
      week: 'Last week',
      month: 'Last month',
      '3months': 'Last 3 months',
      '6months': 'Last 6 months',
      year: 'Last year',
    };
    return labels[filter] || labels['all'];
  }

  /**
   * Get date cutoff for a filter
   * @param {string} filter
   * @returns {Date|null} Cutoff date or null for 'all'
   */
  getDateFilterThreshold(filter: string): Date | null {
    if (filter === 'all') return null;

    switch (filter) {
      case 'week':
        return dayjs().subtract(7, 'day').toDate();
      case 'month':
        return dayjs().subtract(1, 'month').toDate();
      case '3months':
        return dayjs().subtract(3, 'month').toDate();
      case '6months':
        return dayjs().subtract(6, 'month').toDate();
      case 'year':
        return dayjs().subtract(1, 'year').toDate();
      default:
        return null;
    }
  }

  getDateFilterCutoff(filter: string): Date | null {
    return this.getDateFilterThreshold(filter);
  }

  /**
   * Set the active drive for filtering
   * @param {string|null} driveId - null for all drives
   */
  setActiveDrive(driveId: string | null) {
    this.activeDriveId = driveId;

    this.notifyDrivesChanged();
  }

  switchDrive(driveId: string | null) {
    this.setActiveDrive(driveId);
  }

  /**
   * Get all drives
   * @returns {Array}
   */
  getDrives() {
    return this.drives;
  }

  /**
   * Get a specific drive by ID
   * @param {string} driveId
   * @returns {Object|null}
   */
  getDrive(driveId) {
    return this.drives.find((d) => d.id === driveId) || null;
  }

  /**
   * Get the active drive or null for all drives
   * @returns {Object|null}
   */
  getActiveDrive() {
    if (!this.activeDriveId) {
      return null;
    }
    return this.getDrive(this.activeDriveId);
  }

  /**
   * Generate a compound key for an event
   * @param {string} driveId
   * @param {string} eventName
   * @returns {string}
   */
  getCompoundKey(driveId, eventName) {
    return `${driveId}:${eventName}`;
  }

  /**
   * Parse a compound key back to driveId and eventName
   * @param {string} compoundKey
   * @returns {{driveId: string, eventName: string}|null}
   */
  parseCompoundKey(compoundKey) {
    if (!compoundKey || !compoundKey.includes(':')) {
      return null;
    }
    const colonIndex = compoundKey.indexOf(':');
    return {
      driveId: compoundKey.substring(0, colonIndex),
      eventName: compoundKey.substring(colonIndex + 1),
    };
  }

  /**
   * Request permission for all stored drives
   * @param {boolean} includeArchive - If false, skip archive drives
   * @returns {Promise<Array>} Array of drives that were successfully restored
   */
  async restoreAllDrives(includeArchive = false) {
    const restoredDrives = [];

    for (const drive of this.drives) {
      if (!drive.handle) {
        console.log(`Drive ${drive.id} has no handle, skipping`);
        continue;
      }

      // Skip archive drives unless explicitly requested
      if (drive.isArchive && !includeArchive) {
        console.log(`Drive ${drive.label} is archive, skipping auto-load`);
        continue;
      }

      try {
        const permission = await drive.handle.requestPermission({
          mode: 'read',
        });
        if (permission === 'granted') {
          restoredDrives.push(drive);
          console.log(
            `Restored access to drive: ${drive.label}${drive.isArchive ? ' [ARCHIVE]' : ''}`
          );
        } else {
          console.log(`Permission denied for drive: ${drive.label}`);
        }
      } catch (e) {
        console.warn(`Failed to restore drive ${drive.label}:`, e);
      }
    }

    return restoredDrives;
  }

  /**
   * Restore a single archive drive (for manual sync)
   * @param {string} driveId
   * @returns {Promise<Object|null>} The restored drive or null
   */
  async restoreArchiveDrive(driveId) {
    const drive = this.drives.find((d) => d.id === driveId);
    if (!drive || !drive.handle) {
      return null;
    }

    try {
      const permission = await drive.handle.requestPermission({ mode: 'read' });
      if (permission === 'granted') {
        console.log(`Restored access to archive drive: ${drive.label}`);
        return drive;
      }
    } catch (e) {
      console.warn(`Failed to restore archive drive ${drive.label}:`, e);
    }

    return null;
  }

  /**
   * Parse all drives and aggregate events
   * @param {FolderParser} parser - The folder parser instance
   * @param {Array} drivesToParse - Optional specific drives to parse (defaults to all non-archive with handles)
   * @returns {Promise<Array>} All events from all drives
   */
  async parseAllDrives(parser, drivesToParse = null) {
    const allEvents = [];
    const targetDrives =
      drivesToParse || this.drives.filter((d) => d.handle && !d.isArchive);

    for (const drive of targetDrives) {
      if (!drive.handle) {
        continue;
      }

      try {
        // Set the parser's root handle to this drive's handle
        parser.rootHandle = drive.handle;

        // Parse the folder
        let events = await parser.parseFolder();

        // Apply date filter if set
        const cutoff = this.getDateFilterCutoff(drive.dateFilter);
        if (cutoff) {
          const beforeCount = events.length;
          events = events.filter((event) => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= cutoff;
          });
          console.log(
            `Date filter (${drive.dateFilter}): ${beforeCount} → ${events.length} events`
          );
        }

        // Add driveId and compoundKey to each event
        for (const event of events) {
          event.driveId = drive.id;
          event.compoundKey = this.getCompoundKey(drive.id, event.name);
          event.driveLabel = drive.label;
          event.driveColor = drive.color;
        }

        // Store events in the drive object
        drive.events = events;

        allEvents.push(...events);
        console.log(
          `Parsed ${events.length} events from drive: ${drive.label}${drive.isArchive ? ' [ARCHIVE]' : ''}`
        );
      } catch (e) {
        console.warn(`Failed to parse drive ${drive.label}:`, e);
      }
    }

    // Sort all events by timestamp (newest first)
    allEvents.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return allEvents;
  }

  /**
   * Parse a single drive (for manual sync of archive drives)
   * @param {FolderParser} parser
   * @param {string} driveId
   * @returns {Promise<Array>} Events from the drive
   */
  async parseSingleDrive(parser, driveId) {
    const drive = this.drives.find((d) => d.id === driveId);
    if (!drive || !drive.handle) {
      return [];
    }

    return this.parseAllDrives(parser, [drive]);
  }

  /**
   * Get all events across all drives
   * @returns {Array}
   */
  getAllEvents() {
    return this.drives
      .flatMap((d) => d.events || [])
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }

  /**
   * Get events filtered by active drive
   * @returns {Array}
   */
  getFilteredEvents() {
    if (!this.activeDriveId) {
      // Return all events from all drives
      return this.drives
        .flatMap((d) => d.events || [])
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    const activeDrive = this.getDrive(this.activeDriveId);
    return activeDrive?.events || [];
  }

  /**
   * Check if multiple drives are loaded
   * @returns {boolean}
   */
  hasMultipleDrives() {
    return this.drives.length > 1;
  }

  /**
   * Get total event count across all drives
   * @returns {number}
   */
  getTotalEventCount() {
    return this.drives.reduce((sum, d) => sum + (d.events?.length || 0), 0);
  }

  /**
   * Clear all drives
   * @returns {Promise<void>}
   */
  async clearAllDrives() {
    for (const drive of [...this.drives]) {
      await this.deleteDriveFromDB(drive.id);
    }

    this.drives = [];
    this.activeDriveId = null;

    this.notifyDrivesChanged();
  }

  /**
   * Migrate from legacy single-folder storage
   * @param {FileSystemDirectoryHandle} legacyHandle
   * @returns {Promise<Object|null>} The migrated drive or null
   */
  async migrateFromLegacy(legacyHandle) {
    if (!legacyHandle) {
      return null;
    }

    console.log('Migrating legacy folder to multi-drive system...');

    // Add as first drive
    const drive = await this.addDrive(legacyHandle, 'Primary Drive');

    return drive;
  }
}

const folderManager = new FolderManager();
export { FolderManager, folderManager };
export default FolderManager;
