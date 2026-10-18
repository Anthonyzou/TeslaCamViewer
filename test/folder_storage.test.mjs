import { test } from 'node:test';
import assert from 'node:assert';
import { createJiti } from 'jiti';

/**
 * In-memory mock IDB implementation to test version upgrades and store interactions
 */
class MockIDBDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this._stores = new Map();
  }

  get objectStoreNames() {
    const list = Array.from(this._stores.keys());
    list.contains = (name) => this._stores.has(name);
    return list;
  }

  createObjectStore(name, options = {}) {
    const store = new MockIDBObjectStore(name, options);
    this._stores.set(name, store);
    return store;
  }

  transaction(storeNames, _mode) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    for (const name of names) {
      if (!this._stores.has(name)) {
        const error = new Error(
          `NotFoundError: Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.`
        );
        error.name = 'NotFoundError';
        throw error;
      }
    }

    const tx = {
      objectStore: (name) => this._stores.get(name),
      oncomplete: null,
      onerror: null,
      error: null,
    };
    queueMicrotask(() => {
      tx.oncomplete?.();
    });
    return tx;
  }
}

class MockIDBObjectStore {
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
    this.indexes = new Map();
    this.data = new Map();
  }

  createIndex(indexName, keyPath, options) {
    this.indexes.set(indexName, { keyPath, options });
  }

  put(value, key) {
    const k = key || (this.options.keyPath ? value[this.options.keyPath] : Math.random().toString());
    this.data.set(k, value);
  }

  get(key) {
    const req = { onsuccess: null, onerror: null, result: this.data.get(key) || null };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  }

  getAll() {
    const req = { onsuccess: null, onerror: null, result: Array.from(this.data.values()) };
    queueMicrotask(() => req.onsuccess?.({ target: req }));
    return req;
  }

  delete(key) {
    this.data.delete(key);
  }
}

function createMockIndexedDB() {
  const databases = new Map();

  return {
    open(name, version) {
      const req = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: null,
        error: null,
      };

      queueMicrotask(() => {
        let db = databases.get(name);
        const oldVersion = db ? db.version : 0;

        if (!db) {
          db = new MockIDBDatabase(name, version);
          databases.set(name, db);
        }

        if (version > oldVersion) {
          db.version = version;
          if (req.onupgradeneeded) {
            req.onupgradeneeded({
              target: { result: db },
              oldVersion,
              newVersion: version,
            });
          }
        }

        req.result = db;
        req.onsuccess?.({ target: req });
      });

      return req;
    },
    _get(name) {
      return databases.get(name);
    },
  };
}

const jiti = createJiti(process.cwd());
const { FolderManager } = jiti('./src/services/folderManager.ts');
const FolderParserModule = jiti('./src/services/folderParser.ts');
const FolderParser = FolderParserModule.FolderParser || FolderParserModule.default;

test('FolderManager & FolderParser - DB schema upgrade initializes both drives and folderHandles stores', async () => {
  globalThis.indexedDB = createMockIndexedDB();

  const fm = new FolderManager();
  const fp = new FolderParser();

  assert.strictEqual(fm.DB_VERSION, 3, 'FolderManager DB_VERSION should be 3');
  assert.strictEqual(fp.DB_VERSION, 3, 'FolderParser DB_VERSION should be 3');

  // 1. Simulate FolderParser opening first (e.g. tryRestoreLastFolder)
  const dbFromParser = await fp.openDB();
  assert.ok(dbFromParser.objectStoreNames.contains('drives'), 'drives store should exist when parser opens');
  assert.ok(dbFromParser.objectStoreNames.contains('folderHandles'), 'folderHandles store should exist when parser opens');

  // 2. Open DB from FolderManager
  const dbFromManager = await fm.openDB();
  assert.ok(dbFromManager.objectStoreNames.contains('drives'));
  assert.ok(dbFromManager.objectStoreNames.contains('folderHandles'));

  // 3. Save drive should succeed without NotFoundError
  const mockDrive = {
    id: 'test-drive-1',
    label: 'Test Drive',
    color: '#4a9eff',
  };

  await assert.doesNotReject(async () => {
    await fm.saveDrive(mockDrive);
  });

  // Verify drive was saved into the store
  const store = dbFromManager._stores.get('drives');
  assert.strictEqual(store.data.get('test-drive-1').color, '#4a9eff');

  // 4. Update drive color should succeed
  fm.drives = [mockDrive];
  const updated = await fm.updateDriveColor('test-drive-1', '#ff5722');
  assert.strictEqual(updated, true);
  assert.strictEqual(store.data.get('test-drive-1').color, '#ff5722');
});

test('FolderManager - upgrading existing DB from v2 without drives store creates drives store', async () => {
  const mockIDB = createMockIndexedDB();
  globalThis.indexedDB = mockIDB;

  // Pre-create v2 database with only folderHandles (simulating existing user's state)
  const legacyDB = new MockIDBDatabase('TeslaCamViewerDB', 2);
  legacyDB.createObjectStore('folderHandles');
  mockIDB._get = () => legacyDB;
  // Put into mock map
  const openReq = mockIDB.open('TeslaCamViewerDB', 2);
  await new Promise((resolve) => {
    openReq.onsuccess = resolve;
  });

  assert.strictEqual(legacyDB.objectStoreNames.contains('drives'), false, 'Legacy DB should not have drives store');

  // Now FolderManager opens with version 3
  const fm = new FolderManager();
  const upgradedDB = await fm.openDB();

  assert.strictEqual(upgradedDB.version, 3, 'DB should be upgraded to version 3');
  assert.ok(upgradedDB.objectStoreNames.contains('drives'), 'Upgraded DB must contain drives store');
  assert.ok(upgradedDB.objectStoreNames.contains('folderHandles'), 'Upgraded DB must retain folderHandles store');

  // Save drive must succeed
  await assert.doesNotReject(async () => {
    await fm.saveDrive({ id: 'legacy-migrated', label: 'Migrated' });
  });
});

test('FolderManager - drives persist across page refresh and load with custom colors and labels', async () => {
  globalThis.indexedDB = createMockIndexedDB();

  // Session 1: User adds 2 drives and customizes their colors and labels
  const session1FM = new FolderManager();
  const drive1 = {
    id: 'usb-drive-alpha',
    folderName: 'TeslaCam_USB1',
    label: 'Primary Dashcam',
    color: '#00bcd4',
    addedAt: '2026-10-17T12:00:00Z',
    isArchive: false,
    dateFilter: 'week',
    events: [{ name: 'event-1' }],
  };

  const drive2 = {
    id: 'ssd-drive-beta',
    folderName: 'TeslaCam_SSD',
    label: 'Archive SSD',
    color: '#ff5722',
    addedAt: '2026-10-17T12:05:00Z',
    isArchive: true,
    dateFilter: 'all',
    events: [{ name: 'event-2' }],
  };

  session1FM.drives = [drive1, drive2];
  await session1FM.saveDrive(drive1);
  await session1FM.saveDrive(drive2);

  // Update color of drive 1
  await session1FM.updateDriveColor('usb-drive-alpha', '#e91e63');

  // Session 2: User refreshes page (brand new instance of FolderManager with empty state)
  const session2FM = new FolderManager();
  assert.strictEqual(session2FM.drives.length, 0, 'New instance starts with empty drives');

  let drivesChangedCalled = false;
  session2FM.onDrivesChanged = (drives) => {
    drivesChangedCalled = true;
    assert.strictEqual(drives.length, 2);
  };

  await session2FM.loadDrives();

  assert.strictEqual(drivesChangedCalled, true, 'onDrivesChanged should be triggered on loadDrives');
  assert.strictEqual(session2FM.drives.length, 2, 'Loaded drives count should be 2');

  const loadedDrive1 = session2FM.getDrive('usb-drive-alpha');
  assert.ok(loadedDrive1, 'Drive 1 should be loaded');
  assert.strictEqual(loadedDrive1.label, 'Primary Dashcam');
  assert.strictEqual(loadedDrive1.color, '#e91e63', 'Custom color should persist');
  assert.strictEqual(loadedDrive1.dateFilter, 'week');
  assert.deepStrictEqual(loadedDrive1.events, [], 'Events should be initialized as empty array in memory');

  const loadedDrive2 = session2FM.getDrive('ssd-drive-beta');
  assert.ok(loadedDrive2, 'Drive 2 should be loaded');
  assert.strictEqual(loadedDrive2.label, 'Archive SSD');
  assert.strictEqual(loadedDrive2.color, '#ff5722');
  assert.strictEqual(loadedDrive2.isArchive, true);
});
