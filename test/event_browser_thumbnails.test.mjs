import assert from 'node:assert';
import { test } from 'node:test';
import 'fake-indexeddb/auto';
import { createJiti } from 'jiti';

globalThis.localStorage = globalThis.localStorage || {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

globalThis.window = globalThis.window || {
  dispatchEvent: () => {},
};

globalThis.URL = globalThis.URL || {};
globalThis.URL.createObjectURL = () => 'blob:test/thumbnail-blob-url';
globalThis.URL.revokeObjectURL = () => {};

const jiti = createJiti(process.cwd());
const EventBrowserModule = jiti('./src/services/eventBrowser.ts');
const EventBrowser = EventBrowserModule.EventBrowser || EventBrowserModule.default;

test('EventBrowser - preserves existing thumbnailUrl (e.g. from B2) during loadEvents', async () => {
  const browser = new EventBrowser(null, () => {});

  const b2Event = {
    name: '2026-10-10_12-00-00',
    type: 'SentryClips',
    timestamp: '2026-10-10T12:00:00Z',
    clipGroups: [],
    thumbnailUrl: 'https://b2.test/thumb.png',
  };

  await browser.loadEvents([b2Event]);
  assert.strictEqual(b2Event.thumbnailUrl, 'https://b2.test/thumb.png');
});

test('EventBrowser - caches generated blob URLs in thumbnailCache', async () => {
  const browser = new EventBrowser(null, () => {});

  let createCalls = 0;
  globalThis.URL.createObjectURL = () => {
    createCalls++;
    return `blob:test/thumb-${createCalls}`;
  };

  const localEvent = {
    name: '2026-10-10_13-00-00',
    type: 'SavedClips',
    timestamp: '2026-10-10T13:00:00Z',
    clipGroups: [],
    thumbnailFile: {
      getFile: async () => ({ size: 5000 }),
    },
  };

  const url1 = await browser.getThumbnail(localEvent);
  const url2 = await browser.getThumbnail(localEvent);

  assert.strictEqual(url1, 'blob:test/thumb-1');
  assert.strictEqual(url2, 'blob:test/thumb-1');
  assert.strictEqual(createCalls, 1, 'Should return cached thumbnail without recreating blob URL');
});

test('EventBrowser - loadEvents pre-resolves local thumbnail files for native lazy loading', async () => {
  const browser = new EventBrowser(null, () => {});

  globalThis.URL.createObjectURL = () => 'blob:test/thumbnail-blob-url';

  const localEvent = {
    name: '2026-10-10_14-00-00',
    type: 'SavedClips',
    timestamp: '2026-10-10T14:00:00Z',
    clipGroups: [],
    thumbnailFile: {
      getFile: async () => ({ size: 5000 }),
    },
  };

  assert.strictEqual(localEvent.thumbnailUrl, undefined);

  await browser.loadEvents([localEvent]);

  // Successfully pre-resolved to blob URL
  assert.strictEqual(localEvent.thumbnailUrl, 'blob:test/thumbnail-blob-url');
});
