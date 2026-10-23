import { test } from 'node:test';
import assert from 'node:assert';
import { createJiti } from 'jiti';

// Minimal mock for Leaflet execution in Node.js test environment
if (typeof globalThis.window === 'undefined') {
  const doc = {
    documentElement: { style: {} },
    createElement: () => ({ style: {} }),
  };
  globalThis.window = {
    devicePixelRatio: 1,
    screen: {},
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    addEventListener: () => {},
    removeEventListener: () => {},
    document: doc,
    navigator: globalThis.navigator || { userAgent: 'node', onLine: true },
  };
  globalThis.document = doc;
}

const jiti = createJiti(process.cwd());
const { MapView } = jiti('./src/composables/mapEngine.ts');

test('MapView - hasValidGPS properly validates coordinates', () => {
  const container = {};
  const mapView = new MapView(container, () => {});

  assert.strictEqual(mapView.hasValidGPS(null), false);
  assert.strictEqual(mapView.hasValidGPS({}), false);
  assert.strictEqual(mapView.hasValidGPS({ metadata: {} }), false);
  assert.strictEqual(
    mapView.hasValidGPS({ metadata: { est_lat: '0', est_lon: '0' } }),
    false
  );
  assert.strictEqual(
    mapView.hasValidGPS({ metadata: { est_lat: 'NaN', est_lon: '12' } }),
    false
  );

  assert.strictEqual(
    mapView.hasValidGPS({
      metadata: { est_lat: '28.5383', est_lon: '-81.3792' },
    }),
    true
  );
});

test('MapView - getIconForType returns correct SVG colors for event types', () => {
  const container = {};
  const mapView = new MapView(container, () => {});

  const savedIcon = mapView.getIconForType('SavedClips');
  assert.ok(savedIcon.options.html.includes('#2196f3'));

  const sentryIcon = mapView.getIconForType('SentryClips');
  assert.ok(sentryIcon.options.html.includes('#f44336'));

  const recentIcon = mapView.getIconForType('RecentClips');
  assert.ok(recentIcon.options.html.includes('#757575'));
});

test('MapView - createPopupContent creates formatted popup HTML', () => {
  const container = {};
  const mapView = new MapView(container, () => {});

  const mockEvent = {
    name: '2026-10-10_12-00-00',
    type: 'SentryClips',
    timestamp: '2026-10-10T12:00:00Z',
    clipGroups: [{}, {}],
    metadata: {
      city: 'Orlando',
      street: 'Orange Ave',
      reason: 'sentry_aware_object_detection',
    },
  };

  const html = mapView.createPopupContent(mockEvent);
  assert.ok(html.includes('Orange Ave, Orlando'));
  assert.ok(html.includes('2 clips'));
  assert.ok(html.includes('sentry'));
});
