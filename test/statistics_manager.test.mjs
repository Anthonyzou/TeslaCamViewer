import assert from 'node:assert';
import { test } from 'node:test';
import { createJiti } from 'jiti';

const jiti = createJiti(process.cwd());
const { StatisticsManager } = jiti('./src/composables/useStatistics.ts');

test('StatisticsManager - returns null when no events', () => {
  const sm = new StatisticsManager();
  sm.setEvents([]);
  assert.strictEqual(sm.calculateStats(), null);
});

test('StatisticsManager - calculates accurate event counts, durations, and breakdowns', () => {
  const sm = new StatisticsManager();
  const mockEvents = [
    {
      name: '2026-10-18_14-30-00',
      type: 'SavedClips',
      timestamp: '2026-10-18T14:30:00Z',
      clipGroups: [{}, {}], // 2 clips = 120s
      metadata: {
        city: 'Austin',
        reason: 'user_interaction_dashcam_launcher',
      },
    },
    {
      name: '2026-10-18_15-00-00',
      type: 'SentryClips',
      timestamp: '2026-10-18T15:00:00Z',
      clipGroups: [{}], // 1 clip = 60s
      metadata: {
        city: 'Austin',
        camera: '0', // Front
        reason: 'object_detection',
      },
    },
    {
      name: '2026-10-18_22-00-00',
      type: 'SentryClips',
      timestamp: '2026-10-18T22:00:00Z', // Night (hour 22)
      clipGroups: [{}], // 1 clip = 60s
      metadata: {
        city: 'Dallas',
        camera: '1', // Rear
        reason: 'vehicle_bump',
      },
    },
    {
      name: '2026-10-19_08-00-00',
      type: 'RecentClips',
      timestamp: '2026-10-19T08:00:00Z',
      clipGroups: [{}, {}, {}], // 3 clips = 180s
      metadata: {
        city: 'Houston',
      },
    },
  ];

  sm.setEvents(mockEvents);
  const stats = sm.calculateStats();

  assert.ok(stats);
  assert.strictEqual(stats.totalEvents, 4);
  assert.strictEqual(stats.totalClips, 7);
  // Total duration: 120 + 60 + 60 + 180 = 420s = 7m
  assert.strictEqual(stats.formattedDuration, '7m');

  // Event types
  const saved = stats.eventsByType.find((t) => t.type === 'saved');
  const sentry = stats.eventsByType.find((t) => t.type === 'sentry');
  const recent = stats.eventsByType.find((t) => t.type === 'recent');

  assert.strictEqual(saved?.count, 1);
  assert.strictEqual(sentry?.count, 2);
  assert.strictEqual(recent?.count, 1);

  // Trigger reasons
  const manual = stats.triggerReasons.find((r) => r.reason === 'Manual Save');
  const object = stats.triggerReasons.find((r) => r.reason === 'Object Detected');
  const bump = stats.triggerReasons.find((r) => r.reason === 'Vehicle Bump');
  assert.strictEqual(manual?.count, 1);
  assert.strictEqual(object?.count, 1);
  assert.strictEqual(bump?.count, 1);

  // Locations
  assert.strictEqual(stats.topLocations[0].location, 'Austin');
  assert.strictEqual(stats.topLocations[0].count, 2);

  // Sentry camera distribution
  const frontCam = stats.cameraDistribution.find((c) => c.camera === 'Front');
  const rearCam = stats.cameraDistribution.find(
    (c) => c.camera === 'Rear' || c.camera === 'Back'
  );
  assert.strictEqual(frontCam?.count, 1);
  assert.strictEqual(rearCam?.count, 1);

  // Day vs Night
  // 14:30 (Day), 15:00 (Day), 22:00 (Night), 08:00 (Day) -> 3 day, 1 night
  assert.strictEqual(stats.dayVsNight.day, 3);
  assert.strictEqual(stats.dayVsNight.night, 1);
  assert.strictEqual(stats.dayVsNight.dayPercent, 75);
  assert.strictEqual(stats.dayVsNight.nightPercent, 25);

  // Storage calculation: 7 clips * 10MB = 70MB
  assert.strictEqual(stats.storage.mb, 70);
});
