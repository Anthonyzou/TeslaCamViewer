import assert from 'node:assert';
import { test } from 'node:test';
import { createJiti } from 'jiti';

const jiti = createJiti(process.cwd());
const {
  parseClipFilename,
  parseEventFolderName,
  parseClipTimestamp,
  groupClips,
  formatHourlyRange,
  formatGapDuration,
  detectGaps,
  formatReason,
} = jiti('./src/utils/teslaCamFormat.ts');

test('parseClipFilename - correctly extracts timestamp and camera angle', () => {
  const front = parseClipFilename('2026-10-10_08-30-00-front.mp4');
  assert.deepStrictEqual(front, {
    timestamp: '2026-10-10_08-30-00',
    camera: 'front',
  });

  const pillar = parseClipFilename('2026-10-10_08-30-00-left_pillar.mp4');
  assert.deepStrictEqual(pillar, {
    timestamp: '2026-10-10_08-30-00',
    camera: 'left_pillar',
  });

  assert.strictEqual(parseClipFilename('event.mp4'), null);
  assert.strictEqual(parseClipFilename('thumb.png'), null);
  assert.strictEqual(parseClipFilename('event.json'), null);
  assert.strictEqual(parseClipFilename('random_file.mp4'), null);
});

test('parseEventFolderName - extracts date and ISO timestamp', () => {
  const result = parseEventFolderName('2026-10-10_08-30-00');
  assert.deepStrictEqual(result, {
    datePart: '2026-10-10',
    timePart: '08-30-00',
    timestamp: '2026-10-10T08:30:00',
  });

  assert.strictEqual(parseEventFolderName('RecentClips'), null);
  assert.strictEqual(parseEventFolderName(''), null);
});

test('parseClipTimestamp - converts string to Date correctly', () => {
  const date = parseClipTimestamp('2026-10-10_08-30-00');
  assert.ok(date instanceof Date);
  assert.strictEqual(date.getFullYear(), 2026);
  assert.strictEqual(date.getMonth(), 9); // October (0-indexed)
  assert.strictEqual(date.getDate(), 10);
  assert.strictEqual(date.getHours(), 8);
  assert.strictEqual(date.getMinutes(), 30);
  assert.strictEqual(date.getSeconds(), 0);

  assert.strictEqual(parseClipTimestamp('invalid'), null);
});

test('groupClips - aggregates multi-camera files into sorted timestamp buckets', () => {
  const clips = [
    { timestamp: '2026-10-10_08-31-00', camera: 'front', file: 'f2' },
    { timestamp: '2026-10-10_08-30-00', camera: 'back', file: 'b1' },
    { timestamp: '2026-10-10_08-30-00', camera: 'front', file: 'f1' },
    { timestamp: '2026-10-10_08-31-00', camera: 'back', file: 'b2' },
  ];

  const grouped = groupClips(clips);
  assert.strictEqual(grouped.length, 2);
  assert.strictEqual(grouped[0].timestamp, '2026-10-10_08-30-00');
  assert.strictEqual(grouped[0].clips.front.file, 'f1');
  assert.strictEqual(grouped[0].clips.back.file, 'b1');
  assert.strictEqual(grouped[1].timestamp, '2026-10-10_08-31-00');
  assert.strictEqual(grouped[1].clips.front.file, 'f2');
});

test('detectGaps - identifies recording discontinuities', () => {
  const continuousClips = [
    { timestamp: '2026-10-10_08-30-00' },
    { timestamp: '2026-10-10_08-31-00' },
    { timestamp: '2026-10-10_08-32-00' },
  ];
  assert.strictEqual(detectGaps(continuousClips).length, 0);

  const gappedClips = [
    { timestamp: '2026-10-10_08-30-00' },
    { timestamp: '2026-10-10_08-35-00' }, // 4 minute missing gap
  ];
  const gaps = detectGaps(gappedClips);
  assert.strictEqual(gaps.length, 1);
  assert.strictEqual(gaps[0].duration, 240); // 300s - 60s = 240s
  assert.strictEqual(gaps[0].formattedDuration, '4m');
});

test('formatHourlyRange - formats 24h hours to 12h ranges', () => {
  assert.strictEqual(formatHourlyRange(0), '12:00-12:59 AM');
  assert.strictEqual(formatHourlyRange('09'), '9:00-9:59 AM');
  assert.strictEqual(formatHourlyRange(12), '12:00-12:59 PM');
  assert.strictEqual(formatHourlyRange('14'), '2:00-2:59 PM');
});

test('formatGapDuration - formats seconds into readable strings', () => {
  assert.strictEqual(formatGapDuration(45), '45s');
  assert.strictEqual(formatGapDuration(120), '2m');
  assert.strictEqual(formatGapDuration(135), '2m 15s');
  assert.strictEqual(formatGapDuration(3660), '1h 1m');
});

test('formatReason - converts Tesla event reasons to human-friendly strings', () => {
  assert.strictEqual(
    formatReason('user_interaction_dashcam_launcher_action_tapped'),
    'Manual Save'
  );
  assert.strictEqual(
    formatReason('sentry_aware_object_detection'),
    'Sentry: Object Detected'
  );
  assert.strictEqual(
    formatReason('sentry_aware_accel_1.85'),
    'Sentry: Vehicle Bumped (1.85g)'
  );
  assert.strictEqual(
    formatReason('custom_event_type'),
    'Custom Event Type'
  );
});
