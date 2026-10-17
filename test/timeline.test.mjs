import { test } from 'node:test';
import assert from 'node:assert';
import { createJiti } from 'jiti';

const jiti = createJiti(process.cwd());
const { timelineStore, useTimeline } = jiti('./src/composables/useTimeline.ts');
const { useClipMarking } = jiti('./src/composables/useClipMarking.ts');

test('timelineStore - initial state and duration setting', () => {
  timelineStore.reset();
  const timeline = useTimeline();

  assert.strictEqual(timelineStore.currentTime, 0);
  assert.strictEqual(timelineStore.duration, 0);
  assert.strictEqual(timelineStore.isDragging, false);
  assert.strictEqual(timeline.progressPercent.value, 0);

  timelineStore.setDuration(120);
  assert.strictEqual(timelineStore.duration, 120);
  assert.strictEqual(timeline.totalDuration.value, 120);
});

test('timelineStore - time updating and reactive progress calculation', () => {
  timelineStore.reset();
  const timeline = useTimeline();

  timelineStore.setDuration(200);
  timelineStore.updateTime(50);

  assert.strictEqual(timelineStore.currentTime, 50);
  assert.strictEqual(timeline.currentTime.value, 50);
  assert.strictEqual(timeline.progressPercent.value, 25);

  // Clamped at 100% max
  timelineStore.updateTime(250);
  assert.strictEqual(timeline.progressPercent.value, 100);
});

test('timelineStore - ignores updates while isDragging is active', () => {
  timelineStore.reset();
  const timeline = useTimeline();

  timelineStore.setDuration(100);
  timelineStore.updateTime(20);
  assert.strictEqual(timelineStore.currentTime, 20);

  // Simulate user dragging scrubber
  timeline.isDragging.value = true;
  assert.strictEqual(timelineStore.isDragging, true);

  timelineStore.updateTime(50);
  // Time should not have updated because dragging is active
  assert.strictEqual(timelineStore.currentTime, 20);

  // Finish dragging
  timeline.isDragging.value = false;
  assert.strictEqual(timelineStore.isDragging, false);

  timelineStore.updateTime(50);
  assert.strictEqual(timelineStore.currentTime, 50);
});

test('timelineStore - clip markers calculation', () => {
  timelineStore.reset();
  const timeline = useTimeline();

  timelineStore.setDuration(180);
  const clipGroups = [
    { clips: { front: {} } },
    { clips: { front: {} } },
    { clips: { front: {} } },
  ];
  const cachedDurations = [60, 60, 60];

  timelineStore.setClipMarkers(clipGroups, cachedDurations);

  assert.strictEqual(timeline.clipMarkers.value.length, 2);
  const firstMarker = timeline.clipMarkers.value[0];
  const secondMarker = timeline.clipMarkers.value[1];

  assert.ok(Math.abs(firstMarker - 33.333) < 0.01);
  assert.ok(Math.abs(secondMarker - 66.666) < 0.01);
});

test('timelineStore - sentry trigger marker placement', () => {
  timelineStore.reset();
  const timeline = useTimeline();

  timelineStore.setDuration(120);
  timelineStore.setSentryTriggerMarker(60);

  assert.strictEqual(timeline.sentryMarker.value, 50);

  // Clearing sentry trigger marker
  timelineStore.setSentryTriggerMarker(0);
  assert.strictEqual(timeline.sentryMarker.value, null);
});

test('useClipMarking - shares reactive state across consumers', () => {
  let mockCurrentTime = 15;
  const mockPlayer = {
    get currentTime() {
      return mockCurrentTime;
    },
  };

  const clipMarkingA = useClipMarking(() => mockPlayer);
  const clipMarkingB = useClipMarking();

  clipMarkingA.clearMarks();
  assert.strictEqual(clipMarkingB.inPoint.value, null);
  assert.strictEqual(clipMarkingB.outPoint.value, null);

  // Set IN mark from instance A
  clipMarkingA.setInPoint();
  assert.strictEqual(clipMarkingA.inPoint.value, 15);
  // Instance B reflects instance A's state
  assert.strictEqual(clipMarkingB.inPoint.value, 15);

  // Advance time and set OUT mark from instance B
  mockCurrentTime = 45;
  clipMarkingB.setOutPoint();
  assert.strictEqual(clipMarkingA.outPoint.value, 45);
  assert.strictEqual(clipMarkingB.outPoint.value, 45);

  const marks = clipMarkingA.getMarks();
  assert.deepStrictEqual(marks, { inPoint: 15, outPoint: 45 });
  assert.strictEqual(clipMarkingA.getMarkedDuration(), 30);

  // Clear marks
  clipMarkingA.clearMarks();
  assert.strictEqual(clipMarkingB.inPoint.value, null);
  assert.strictEqual(clipMarkingB.outPoint.value, null);
});
