import { createJiti } from 'jiti';
import assert from 'node:assert';
import { test } from 'node:test';

const jiti = createJiti(process.cwd());
const { mapViewStore, useMapView } = jiti('./src/composables/useMapView.ts');
const { filterPanelStore, useFilterPanel } = jiti(
  './src/composables/useFilterPanel.ts'
);
const {
  settingsModalStore,
  helpModalStore,
  statisticsModalStore,
  driveManagementModalStore,
  driveSetupModalStore,
  commandPaletteModalStore,
  exportModalStore,
} = jiti('./src/composables/useModals.ts');

test('useMapView - manages map instance reactively', () => {
  const { mapView, setMapView, invalidateSize, fitBounds } = useMapView();
  assert.strictEqual(mapView.value, null);
  assert.strictEqual(mapViewStore.instance, null);

  let invalidated = false;
  let fitted = false;
  const mockMap = {
    invalidateSize: () => {
      invalidated = true;
    },
    fitBounds: () => {
      fitted = true;
    },
  };

  setMapView(mockMap);
  assert.strictEqual(mapView.value, mockMap);
  assert.strictEqual(mapViewStore.instance, mockMap);

  invalidateSize();
  assert.strictEqual(invalidated, true);

  fitBounds();
  assert.strictEqual(fitted, true);

  setMapView(null);
  assert.strictEqual(mapView.value, null);
  assert.strictEqual(mapViewStore.instance, null);
});

test('useFilterPanel - controls panel expansion and registers handlers', () => {
  const { isExpanded, togglePanel } = useFilterPanel();
  const initial = isExpanded.value;

  togglePanel();
  assert.strictEqual(isExpanded.value, !initial);
  togglePanel();
  assert.strictEqual(isExpanded.value, initial);

  let badgeUpdated = false;
  let filtersCleared = false;
  filterPanelStore.registerHandlers({
    updateBadge: () => {
      badgeUpdated = true;
    },
    clearAllFilters: () => {
      filtersCleared = true;
    },
    getFilters: () => ({ sort: 'newest' }),
  });

  filterPanelStore.updateBadge();
  assert.strictEqual(badgeUpdated, true);

  filterPanelStore.clearAllFilters();
  assert.strictEqual(filtersCleared, true);

  assert.deepStrictEqual(filterPanelStore.getFilters(), { sort: 'newest' });

  filterPanelStore.unregisterHandlers();
  // Safe invocation after unregister
  filterPanelStore.updateBadge();
});

test('modalStore.settings - manages tab and sync handler', () => {
  let synced = false;
  settingsModalStore.registerSyncHandler(() => {
    synced = true;
  });

  assert.strictEqual(settingsModalStore.isOpen, false);
  settingsModalStore.open('playback');
  assert.strictEqual(settingsModalStore.isOpen, true);
  assert.strictEqual(settingsModalStore.activeTab, 'playback');
  assert.strictEqual(synced, true);

  settingsModalStore.close();
  assert.strictEqual(settingsModalStore.isOpen, false);
  settingsModalStore.unregisterSyncHandler();
});

test('modalStore.help - controls open, close, and toggle', () => {
  helpModalStore.close();
  assert.strictEqual(helpModalStore.isOpen, false);

  helpModalStore.open();
  assert.strictEqual(helpModalStore.isOpen, true);

  helpModalStore.toggle();
  assert.strictEqual(helpModalStore.isOpen, false);

  helpModalStore.toggle();
  assert.strictEqual(helpModalStore.isOpen, true);
  helpModalStore.close();
});

test('modalStore.statistics - stores payload and manages state', () => {
  statisticsModalStore.close();
  assert.strictEqual(statisticsModalStore.isOpen, false);

  statisticsModalStore.open({ testStat: 42 });
  assert.strictEqual(statisticsModalStore.isOpen, true);
  assert.strictEqual(statisticsModalStore.data?.testStat, 42);

  statisticsModalStore.close();
  assert.strictEqual(statisticsModalStore.isOpen, false);
});

test('modalStore.driveManagement - triggers registered refresh handler', () => {
  let refreshed = false;
  driveManagementModalStore.registerRefreshHandler(() => {
    refreshed = true;
  });

  driveManagementModalStore.open();
  assert.strictEqual(driveManagementModalStore.isOpen, true);
  assert.strictEqual(refreshed, true);

  driveManagementModalStore.close();
  assert.strictEqual(driveManagementModalStore.isOpen, false);
  driveManagementModalStore.unregisterRefreshHandler();
});

test('modalStore.driveSetup - promptSetup delegates to registered handler', async () => {
  driveSetupModalStore.registerPromptHandler(async (handle) => {
    return { name: handle.name, confirmed: true };
  });

  const res = await driveSetupModalStore.promptSetup({ name: 'USB-Drive' });
  assert.deepStrictEqual(res, { name: 'USB-Drive', confirmed: true });

  driveSetupModalStore.unregisterPromptHandler();
});

test('modalStore.commandPalette - registers and clears commands', () => {
  commandPaletteModalStore.clearCommands();
  assert.strictEqual(commandPaletteModalStore.commands.length, 0);

  commandPaletteModalStore.registerMany([
    { id: 'cmd-1', title: 'Command 1' },
    { id: 'cmd-2', title: 'Command 2' },
  ]);

  assert.strictEqual(commandPaletteModalStore.commands.length, 2);
  assert.strictEqual(commandPaletteModalStore.commands[0].title, 'Command 1');

  // Updating existing command by id
  commandPaletteModalStore.register({
    id: 'cmd-1',
    title: 'Command 1 Updated',
  });
  assert.strictEqual(commandPaletteModalStore.commands.length, 2);
  assert.strictEqual(
    commandPaletteModalStore.commands[0].title,
    'Command 1 Updated'
  );

  commandPaletteModalStore.toggle();
  assert.strictEqual(commandPaletteModalStore.isOpen, true);
  commandPaletteModalStore.close();
  assert.strictEqual(commandPaletteModalStore.isOpen, false);
});

test('modalStore.export - manages export progress and completion state', () => {
  let cancelled = false;
  assert.strictEqual(exportModalStore.isOpen, false);

  exportModalStore.open('Exporting Front Camera', 'Preparing encoder...', () => {
    cancelled = true;
  });
  assert.strictEqual(exportModalStore.isOpen, true);
  assert.strictEqual(exportModalStore.isComplete, false);
  assert.strictEqual(exportModalStore.title, 'Exporting Front Camera');
  assert.strictEqual(exportModalStore.statusText, 'Preparing encoder...');
  assert.strictEqual(exportModalStore.progress, 0);

  exportModalStore.updateProgress(45, 'Encoding frame 45/100');
  assert.strictEqual(exportModalStore.progress, 45);
  assert.strictEqual(exportModalStore.statusText, 'Encoding frame 45/100');

  exportModalStore.showComplete('clip.mp4', 'blob:http://localhost/123');
  assert.strictEqual(exportModalStore.isComplete, true);
  assert.strictEqual(exportModalStore.filename, 'clip.mp4');
  assert.strictEqual(exportModalStore.downloadUrl, 'blob:http://localhost/123');
  assert.strictEqual(exportModalStore.progress, 100);

  exportModalStore.cancel();
  assert.strictEqual(cancelled, true);
  assert.strictEqual(exportModalStore.isOpen, false);
});
