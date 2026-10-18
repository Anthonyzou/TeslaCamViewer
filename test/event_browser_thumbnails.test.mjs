import { test } from 'node:test';
import assert from 'node:assert';
import { createJiti } from 'jiti';

function createMockElement(tagName = 'div') {
  return {
    tagName: tagName.toUpperCase(),
    innerHTML: '',
    children: [],
    dataset: {},
    className: '',
    appendChild(child) {
      this.children.push(child);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

globalThis.localStorage = globalThis.localStorage || {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

globalThis.indexedDB = globalThis.indexedDB || {
  open: () => ({ addEventListener: () => {}, onsuccess: null, onerror: null }),
};

globalThis.document = globalThis.document || {
  createElement: (tag) => createMockElement(tag),
  createDocumentFragment: () => createMockElement('fragment'),
  getElementById: () => null,
};

globalThis.window = globalThis.window || {
  dispatchEvent: () => {},
};

const jiti = createJiti(process.cwd());
const EventBrowserModule = jiti('./src/services/eventBrowser.ts');
const EventBrowser = EventBrowserModule.EventBrowser || EventBrowserModule.default;

test('EventBrowser - renders native img with loading="lazy" when thumbnailUrl is present', () => {
  const container = createMockElement('div');
  const browser = new EventBrowser(container, () => {});

  const b2Event = {
    name: '2026-10-10_12-00-00',
    type: 'SentryClips',
    timestamp: '2026-10-10T12:00:00Z',
    clipGroups: [],
    thumbnailUrl: 'https://b2.test/thumb.png',
  };

  const element = browser.createEventElementSync(b2Event);
  assert.ok(element.innerHTML.includes('loading="lazy"'));
  assert.ok(element.innerHTML.includes('src="https://b2.test/thumb.png"'));
  assert.ok(element.innerHTML.includes('class="event-thumbnail"'));
});

test('EventBrowser - renders placeholder when no thumbnail is present', () => {
  const container = createMockElement('div');
  const browser = new EventBrowser(container, () => {});

  const emptyThumbEvent = {
    name: '2026-10-10_13-00-00',
    type: 'RecentClips',
    timestamp: '2026-10-10T13:00:00Z',
    clipGroups: [],
  };

  const element = browser.createEventElementSync(emptyThumbEvent);
  assert.ok(element.innerHTML.includes('event-thumbnail-placeholder'));
  assert.ok(element.innerHTML.includes('0 Clips'));
  assert.ok(!element.innerHTML.includes('<img loading="lazy"'));
});

test('EventBrowser - loadEvents pre-resolves local thumbnail files for native lazy loading', async () => {
  const container = createMockElement('div');
  const browser = new EventBrowser(container, () => {});

  globalThis.URL = globalThis.URL || {};
  globalThis.URL.createObjectURL = () => 'blob:test/thumbnail-blob-url';
  globalThis.URL.revokeObjectURL = () => {};

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
