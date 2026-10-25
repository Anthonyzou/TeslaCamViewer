import { test } from 'node:test';
import assert from 'node:assert';
import { createJiti } from 'jiti';

const jiti = createJiti(process.cwd());
const { FolderManager, folderManager } = jiti(
  './src/composables/useFolderManager.ts'
);
const { useDrives } = jiti('./src/composables/useDrives.ts');

test('FolderManager - retains events from both local drive and B2, and switches cleanly', () => {
  const fm = new FolderManager();

  const localEvents = [
    {
      name: '2026-10-10_10-00-00',
      timestamp: '2026-10-10T10:00:00Z',
      driveId: 'drive-local',
      clips: [],
    },
    {
      name: '2026-10-10_11-00-00',
      timestamp: '2026-10-10T11:00:00Z',
      driveId: 'drive-local',
      clips: [],
    },
  ];

  const b2Events = [
    {
      name: '2026-10-11_12-00-00',
      timestamp: '2026-10-11T12:00:00Z',
      driveId: 'b2',
      clips: [],
    },
    {
      name: '2026-10-11_13-00-00',
      timestamp: '2026-10-11T13:00:00Z',
      driveId: 'b2',
      clips: [],
    },
    {
      name: '2026-10-11_14-00-00',
      timestamp: '2026-10-11T14:00:00Z',
      driveId: 'b2',
      clips: [],
    },
  ];

  // 1. Add Local Drive
  fm.drives.push({
    id: 'drive-local',
    label: 'TeslaCam USB',
    events: localEvents,
    handle: null,
  });
  fm.setActiveDrive('drive-local');

  assert.strictEqual(fm.getFilteredEvents().length, 2);
  assert.strictEqual(fm.getAllEvents().length, 2);

  // 2. Add B2 Drive (simulating loadFromB2)
  fm.drives.push({
    id: 'b2',
    label: 'Backblaze B2',
    events: b2Events,
    handle: null,
    isB2: true,
  });
  fm.setActiveDrive('b2');

  assert.strictEqual(fm.drives.length, 2);
  assert.strictEqual(fm.getFilteredEvents().length, 3);
  assert.strictEqual(fm.getAllEvents().length, 5);

  // 3. Switch back to Local Drive
  fm.switchDrive('drive-local');
  assert.strictEqual(fm.activeDriveId, 'drive-local');
  const filteredLocal = fm.getFilteredEvents();
  assert.strictEqual(filteredLocal.length, 2);
  assert.strictEqual(filteredLocal[0].driveId, 'drive-local');

  // 4. Switch back to B2 Drive
  fm.switchDrive('b2');
  assert.strictEqual(fm.activeDriveId, 'b2');
  const filteredB2 = fm.getFilteredEvents();
  assert.strictEqual(filteredB2.length, 3);
  assert.strictEqual(filteredB2[0].driveId, 'b2');

  // 5. Switch to All Drives (null / empty)
  fm.switchDrive(null);
  assert.strictEqual(fm.activeDriveId, null);
  const allEvents = fm.getFilteredEvents();
  assert.strictEqual(allEvents.length, 5);
});

test('useDrives - reacts to drive changes and communicates with folderManager', () => {
  folderManager.drives = [
    { id: 'drive-1', label: 'Local USB', events: [] },
    { id: 'b2', label: 'Backblaze B2', events: [] },
  ];
  folderManager.activeDriveId = 'drive-1';

  const { drives, activeDriveId, changeDrive, syncDrives } = useDrives();
  syncDrives();

  assert.strictEqual(drives.value.length, 2);
  assert.strictEqual(activeDriveId.value, 'drive-1');

  // Switch to B2
  changeDrive('b2');
  assert.strictEqual(activeDriveId.value, 'b2');
  assert.strictEqual(folderManager.activeDriveId, 'b2');

  // Switch to Local Drive
  changeDrive('drive-1');
  assert.strictEqual(activeDriveId.value, 'drive-1');
  assert.strictEqual(folderManager.activeDriveId, 'drive-1');

  // Switch to All Drives
  changeDrive('');
  assert.strictEqual(activeDriveId.value, '');
  assert.strictEqual(folderManager.activeDriveId, null);
});

test('FolderManager - addOrUpdateB2Drive manages B2 cloud drive natively', async () => {
  const fm = new FolderManager();
  fm.saveDrive = async () => {}; // mock persistence

  assert.strictEqual(fm.isB2Drive('b2'), false);

  const b2Events = [{ name: '2026-10-15_12-00-00', timestamp: '2026-10-15T12:00:00Z' }];
  const drive = await fm.addOrUpdateB2Drive(b2Events, { label: 'Cloud Vault' });

  assert.strictEqual(drive.id, 'b2');
  assert.strictEqual(drive.label, 'Cloud Vault');
  assert.strictEqual(drive.isB2, true);
  assert.strictEqual(fm.isB2Drive('b2'), true);
  assert.strictEqual(fm.getB2Drive()?.label, 'Cloud Vault');

  // Updating existing B2 drive
  const updatedEvents = [...b2Events, { name: '2026-10-15_13-00-00', timestamp: '2026-10-15T13:00:00Z' }];
  await fm.addOrUpdateB2Drive(updatedEvents);
  assert.strictEqual(fm.getB2Drive()?.events.length, 2);
});
