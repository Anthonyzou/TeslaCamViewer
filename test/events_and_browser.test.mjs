import assert from 'node:assert';
import { test } from 'node:test';
import 'fake-indexeddb/auto';
import { createJiti } from 'jiti';

globalThis.localStorage = globalThis.localStorage || {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const jiti = createJiti(process.cwd());
const { useEvents, setEventsState } = jiti('./src/composables/useEvents.ts');
const {
  EventBrowser,
  computeRecordingHealth,
  getTimeRangeFromClips,
} = jiti('./src/composables/useEventBrowser.ts');

test('useEvents - updates shared state and computes counts and statistics reactively', () => {
  const events = useEvents();

  // Reset/set test state
  const mockEvents = [
    {
      name: '2026-10-10_10-00-00',
      type: 'SavedClips',
      timestamp: '2026-10-10T10:00:00Z',
      clipGroups: [
        {
          timestamp: '2026-10-10_10-00-00',
          clips: {
            front: {},
            back: {},
            left_repeater: {},
            right_repeater: {},
          },
        },
      ],
      metadata: { reason: 'user_interaction_dashcam_launcher_action_tapped' },
    },
    {
      name: '2026-10-10_11-00-00',
      type: 'SentryClips',
      timestamp: '2026-10-10T11:00:00Z',
      clipGroups: [
        { timestamp: '2026-10-10_11-00-00', clips: { front: {} } },
      ],
      metadata: { reason: 'sentry_aware_object_detection' },
    },
    {
      name: '2026-10-10_12-00-00',
      type: 'RecentClips',
      timestamp: '2026-10-10T12:00:00Z',
      clipGroups: [],
      isEmpty: true,
    },
  ];

  setEventsState({
    all: mockEvents,
    filtered: mockEvents,
    current: mockEvents[0],
  });

  assert.strictEqual(events.hasEvent.value, true);
  assert.strictEqual(events.currentEvent.value?.name, '2026-10-10_10-00-00');
  assert.strictEqual(events.eventCountText.value, '(3)');
  assert.strictEqual(
    events.eventStatsText.value,
    '1 saved, 1 sentry, 1 recent (1 empty)'
  );

  // Changing current event
  setEventsState({ current: mockEvents[1] });
  assert.strictEqual(events.currentEvent.value?.name, '2026-10-10_11-00-00');

  // Empty state
  setEventsState({ all: [], filtered: [], current: null });
  assert.strictEqual(events.hasEvent.value, false);
  assert.strictEqual(events.eventCountText.value, '');
  assert.strictEqual(events.eventStatsText.value, '');
});

test('computeRecordingHealth - accurately identifies missing cameras and short clips', () => {
  // Healthy event: 4 complete cameras across all clip groups, has metadata, >=2 clips
  const healthyEvent = {
    type: 'SavedClips',
    hasPillarCameras: false,
    metadata: { reason: 'manual' },
    clipGroups: [
      {
        clips: {
          front: {},
          back: {},
          left_repeater: {},
          right_repeater: {},
        },
      },
      {
        clips: {
          front: {},
          back: {},
          left_repeater: {},
          right_repeater: {},
        },
      },
    ],
  };
  const health1 = computeRecordingHealth(healthyEvent);
  assert.strictEqual(health1.status, 'healthy');
  assert.strictEqual(health1.issues.length, 0);

  // Event missing camera: only 3 cameras in group
  const missingCamEvent = {
    type: 'SavedClips',
    hasPillarCameras: false,
    metadata: { reason: 'manual' },
    clipGroups: [
      {
        clips: { front: {}, back: {}, left_repeater: {} },
      },
      {
        clips: { front: {}, back: {}, left_repeater: {} },
      },
    ],
  };
  const health2 = computeRecordingHealth(missingCamEvent);
  assert.notStrictEqual(health2.status, 'healthy');
  assert.ok(health2.issues.some((issue) => issue.includes('missing right_repeater')));

  // Sentry event with < 3 clips (interrupted recording)
  const shortSentryEvent = {
    type: 'SentryClips',
    hasPillarCameras: false,
    metadata: { reason: 'sentry' },
    clipGroups: [
      {
        clips: {
          front: {},
          back: {},
          left_repeater: {},
          right_repeater: {},
        },
      },
    ],
  };
  const health3 = computeRecordingHealth(shortSentryEvent);
  assert.notStrictEqual(health3.status, 'healthy');
  assert.ok(health3.issues.some((issue) => issue.includes('interrupted')));
});

test('getTimeRangeFromClips - formats single hour and cross-hour ranges correctly', () => {
  const singleHourEvent = {
    clipGroups: [
      { timestamp: '2026-10-10_07-15-00' },
      { timestamp: '2026-10-10_07-45-00' },
    ],
  };
  assert.strictEqual(getTimeRangeFromClips(singleHourEvent), 'From 7:15 AM');

  const multiHourEvent = {
    clipGroups: [
      { timestamp: '2026-10-10_07-15-00' },
      { timestamp: '2026-10-10_08-30-00' },
    ],
  };
  assert.strictEqual(
    getTimeRangeFromClips(multiHourEvent),
    'From 7:15 AM - 8:30 AM'
  );

  const emptyEvent = { clipGroups: [] };
  assert.strictEqual(getTimeRangeFromClips(emptyEvent), null);
});

test('EventBrowser - isVueManaged prevents destructive render from wiping container DOM', async () => {
  let innerHTMLValue = '<div id="vue-rendered-content">Hello</div>';
  const container = {
    tagName: 'DIV',
    get innerHTML() {
      return innerHTMLValue;
    },
    set innerHTML(val) {
      innerHTMLValue = val;
    },
    querySelectorAll: () => [],
    appendChild: () => {},
  };

  const browser = new EventBrowser(container, () => {});
  browser.isVueManaged = true;

  await browser.loadEvents([
    {
      name: '2026-10-10_10-00-00',
      type: 'SavedClips',
      timestamp: '2026-10-10T10:00:00Z',
      clipGroups: [],
    },
  ]);

  // Content was not wiped because isVueManaged is true
  assert.strictEqual(innerHTMLValue, '<div id="vue-rendered-content">Hello</div>');
});
