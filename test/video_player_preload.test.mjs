import { test } from 'node:test';
import assert from 'node:assert';
import { createJiti } from 'jiti';

const jiti = createJiti(process.cwd());
const { VideoPlayer } = jiti('./src/services/videoPlayer.ts');

function createMockVideoElement() {
  let _src = '';
  return {
    preload: 'auto',
    get src() {
      return _src;
    },
    set src(val) {
      _src = val;
      if (this.onloadedmetadata) {
        setTimeout(() => this.onloadedmetadata(), 0);
      }
    },
    load: () => {},
    getAttribute(name) {
      if (name === 'src') return _src;
      return null;
    },
    pause: () => {},
    play: async () => {},
    style: { visibility: 'hidden', opacity: '0', display: 'block' },
    onloadedmetadata: null,
    onerror: null,
  };
}

test('VideoPlayer - preloads next clip immediately upon loading a clip with preload auto', async () => {
  const player = new VideoPlayer();

  const mockEvent = {
    name: 'event-1',
    clipGroups: [
      {
        clips: {
          front: { url: 'https://test/clip0_front.mp4', duration: 60 },
        },
      },
      {
        clips: {
          front: { url: 'https://test/clip1_front.mp4', duration: 60 },
        },
      },
      {
        clips: {
          front: { url: 'https://test/clip2_front.mp4', duration: 60 },
        },
      },
    ],
  };

  player.banks = {
    a: {
      front: createMockVideoElement(),
      back: null,
      left_repeater: null,
      right_repeater: null,
      left_pillar: null,
      right_pillar: null,
    },
    b: {
      front: createMockVideoElement(),
      back: null,
      left_repeater: null,
      right_repeater: null,
      left_pillar: null,
      right_pillar: null,
    },
  };
  player.activeBank = 'a';
  player.currentEvent = mockEvent;

  // Track preloaded clips
  const preloadedClips = [];
  const originalPreloadClip = player.preloadClip.bind(player);
  player.preloadClip = async function (idx) {
    preloadedClips.push(idx);
    return originalPreloadClip(idx);
  };

  // Load clip 0
  await player.loadClip(0);

  // Active clip is 0 in single bank
  assert.strictEqual(player.currentClipIndex, 0);
  assert.strictEqual(player.videos.front.src, 'https://test/clip0_front.mp4');

  // Next clip (clip 1) was immediately triggered for server-side preload
  assert.ok(preloadedClips.includes(1));

  // Advance to clip 1
  await player.swapBanks();
  assert.strictEqual(player.currentClipIndex, 1);
  assert.strictEqual(player.videos.front.src, 'https://test/clip1_front.mp4');

  // Clip 2 is immediately triggered for server-side preload
  assert.ok(preloadedClips.includes(2));
});

test('VideoPlayer - respects disablePreload setting', async () => {
  const player = new VideoPlayer();
  player.disablePreload = true;

  const mockEvent = {
    name: 'event-2',
    clipGroups: [
      { clips: { front: { url: 'clip0.mp4' } } },
      { clips: { front: { url: 'clip1.mp4' } } },
    ],
  };

  player.banks = {
    a: { front: createMockVideoElement() },
    b: { front: createMockVideoElement() },
  };
  player.activeBank = 'a';
  player.currentEvent = mockEvent;

  let preloadAttempted = false;
  player.preloadClip = async function () {
    preloadAttempted = true;
  };

  await player.loadClip(0);
  assert.strictEqual(preloadAttempted, false);
});

test('VideoPlayer - loadEvent with initialTime directly loads target incident clip without loading clip 0', async () => {
  const player = new VideoPlayer();
  const loadedClips = [];

  const mockEvent = {
    name: 'sentry-event',
    clipGroups: [
      { clips: { front: { url: 'https://test/clip0.mp4', duration: 60 } } },
      { clips: { front: { url: 'https://test/clip1.mp4', duration: 60 } } },
      { clips: { front: { url: 'https://test/clip2.mp4', duration: 60 } } },
    ],
  };

  player.banks = {
    a: { front: createMockVideoElement() },
    b: { front: createMockVideoElement() },
  };
  player.activeBank = 'a';

  const origLoadClip = player.loadClip.bind(player);
  player.loadClip = async function (idx, isPreload, startTime) {
    if (!isPreload) loadedClips.push({ idx, startTime });
    return origLoadClip(idx, isPreload, startTime);
  };

  // Sentry incident at 140s (which is in clip 2 at 20s)
  await player.loadEvent(mockEvent, 140);

  // Directly loaded clip 2 at 20s, NEVER loaded clip 0
  assert.strictEqual(player.currentClipIndex, 2);
  assert.strictEqual(loadedClips.length, 1);
  assert.strictEqual(loadedClips[0].idx, 2);
  assert.strictEqual(loadedClips[0].startTime, 20);
});

test('VideoPlayer - preloadClip sends POST /api/b2/cache/preload to server', async () => {
  const player = new VideoPlayer();
  const mockEvent = {
    name: 'event-b2',
    clipGroups: [
      {
        clips: {
          front: { fileName: 'clip0_front.mp4', url: 'http://localhost:8000/api/b2/video?file=clip0_front.mp4' },
          back: { fileName: 'clip0_back.mp4', url: 'http://localhost:8000/api/b2/video?file=clip0_back.mp4' },
        },
      },
    ],
  };

  player.videos = {
    front: createMockVideoElement(),
    back: createMockVideoElement(),
  };
  player.currentEvent = mockEvent;

  let preloadFetchCalled = false;
  let preloadPayload = null;

  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  globalThis.window = {};
  globalThis.fetch = async (url, opts) => {
    if (url === '/api/b2/cache/preload') {
      preloadFetchCalled = true;
      preloadPayload = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ success: true }) };
    }
    return originalFetch ? originalFetch(url, opts) : { ok: true };
  };

  try {
    await player.preloadClip(0);
    assert.strictEqual(preloadFetchCalled, true);
    assert.strictEqual(preloadPayload.items.length, 2);
    assert.strictEqual(preloadPayload.items[0].file, 'clip0_front.mp4');
    assert.strictEqual(preloadPayload.items[1].file, 'clip0_back.mp4');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test('VideoPlayer - duration falls back to metadata clip duration when video element duration is NaN or 0', () => {
  const player = new VideoPlayer();
  const mockFront = createMockVideoElement();
  mockFront.duration = NaN;
  player.videos = { front: mockFront };

  player.currentEvent = {
    name: 'event-dur',
    clipGroups: [{ clips: { front: { duration: 58 } } }],
  };
  player.currentClipIndex = 0;

  // When video.duration is NaN, falls back to 58
  assert.strictEqual(player.duration, 58);

  // When video.duration becomes valid, uses video.duration
  mockFront.duration = 58.4;
  assert.strictEqual(player.duration, 58.4);
});

test('VideoPlayer - seek does not jump to next clip when seeking inside clip', async () => {
  const player = new VideoPlayer();
  const mockFront = createMockVideoElement();
  mockFront.duration = NaN; // simulate uncached / loading
  player.videos = { front: mockFront };

  player.currentEvent = {
    name: 'event-seek',
    clipGroups: [
      { clips: { front: { url: 'clip0.mp4', duration: 60 } } },
      { clips: { front: { url: 'clip1.mp4', duration: 60 } } },
    ],
  };
  player.currentClipIndex = 0;

  let loadedClipIdx = -1;
  player.loadClip = async (idx) => {
    loadedClipIdx = idx;
    player.currentClipIndex = idx;
  };

  // Seek to 54 seconds (e.g. Sentry trigger point)
  await player.seekToEventTime(54);

  // Should remain on clip 0 and NOT advance to clip 1
  assert.strictEqual(player.currentClipIndex, 0);
  assert.strictEqual(loadedClipIdx, -1);
  assert.strictEqual(mockFront.currentTime, 54);
});

test('VideoPlayer - _checkPreloadTrigger deduplicates and only preloads once per clip', async () => {
  const player = new VideoPlayer();
  player.currentEvent = {
    name: 'event-dedup',
    clipGroups: [
      { clips: { front: { url: 'clip0.mp4' } } },
      { clips: { front: { url: 'clip1.mp4' } } },
    ],
  };
  player.currentClipIndex = 0;

  let preloadCallCount = 0;
  player.preloadClip = async () => {
    preloadCallCount++;
  };

  // Simulate multiple timeupdate events firing during playback
  player._checkPreloadTrigger();
  player._checkPreloadTrigger();
  player._checkPreloadTrigger();
  player._checkPreloadTrigger();

  // Preload should only be called ONCE
  assert.strictEqual(preloadCallCount, 1);
});

test('VideoPlayer - handleVideoEnded does not advance clip if not near end', async () => {
  const player = new VideoPlayer();
  const mockFront = createMockVideoElement();
  mockFront.currentTime = 10;
  mockFront.duration = 60;
  mockFront.error = new Error('Transient network abort'); // simulate transient media error
  player.videos = { front: mockFront };

  player.currentEvent = {
    name: 'event-ended',
    clipGroups: [
      { clips: { front: { url: 'clip0.mp4', duration: 60 } } },
      { clips: { front: { url: 'clip1.mp4', duration: 60 } } },
    ],
  };
  player.currentClipIndex = 0;
  player._isPlayingIntent = true;

  let advanced = false;
  player.loadClip = async () => {
    advanced = true;
  };

  await player.handleVideoEnded();

  // Should NOT advance because currentTime is only 10s, not near 60s
  assert.strictEqual(advanced, false);
  assert.strictEqual(player.currentClipIndex, 0);
});

test('VideoPlayer - seek barrier pauses active videos and waits for all active feeds before playing', async () => {
  const player = new VideoPlayer();
  const listenersA = new Map();
  const listenersB = new Map();

  function makeVideo(listeners) {
    let paused = true;
    let playCalls = 0;
    return {
      seeking: false,
      readyState: 4,
      currentTime: 0,
      duration: 60,
      playbackRate: 1.0,
      src: 'https://test/clip.mp4',
      getAttribute: (k) => (k === 'src' ? 'https://test/clip.mp4' : null),
      get paused() {
        return paused;
      },
      get playCalls() {
        return playCalls;
      },
      pause: () => {
        paused = true;
      },
      play: async () => {
        paused = false;
        playCalls++;
      },
      addEventListener: (ev, fn) => {
        if (!listeners.has(ev)) listeners.set(ev, []);
        listeners.get(ev).push(fn);
      },
      removeEventListener: (ev, fn) => {
        const arr = listeners.get(ev) || [];
        listeners.set(ev, arr.filter((f) => f !== fn));
      },
      fire: (ev) => {
        const arr = (listeners.get(ev) || []).slice();
        for (const f of arr) f();
      },
    };
  }

  const vFront = makeVideo(listenersA);
  const vBack = makeVideo(listenersB);

  player.videos = { front: vFront, back: vBack };
  player._isPlayingIntent = true;

  // Simulate in-progress seeking state on both videos
  vFront.seeking = true;
  vBack.seeking = true;

  const seekPromise = player.seek(25, true);

  // While seeking, both videos should be paused and play() should not have been called yet
  assert.strictEqual(vFront.paused, true);
  assert.strictEqual(vBack.paused, true);
  assert.strictEqual(vFront.currentTime, 25);
  assert.strictEqual(vBack.currentTime, 25);
  assert.strictEqual(vFront.playCalls, 0);

  // Front camera finishes seeking
  vFront.seeking = false;
  vFront.fire('seeked');

  // Back camera is still seeking, so play() must still be waiting
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(vFront.playCalls, 0);

  // Back camera finishes seeking
  vBack.seeking = false;
  vBack.fire('seeked');

  await seekPromise;

  // Now both cameras have finished seeking and play() is called in sync!
  assert.strictEqual(vFront.playCalls, 1);
  assert.strictEqual(vBack.playCalls, 1);
  assert.strictEqual(player._isSeeking, false);
});

test('VideoPlayer - buffering lockstep pauses other cameras when one camera stalls and resumes when ready', () => {
  const player = new VideoPlayer();
  const listenersA = new Map();
  const listenersB = new Map();

  function makeVideo(listeners) {
    let paused = false;
    let playCalled = false;
    let pauseCalled = false;
    return {
      src: 'https://test/clip.mp4',
      getAttribute: (k) => (k === 'src' ? 'https://test/clip.mp4' : null),
      get paused() {
        return paused;
      },
      get playCalled() {
        return playCalled;
      },
      get pauseCalled() {
        return pauseCalled;
      },
      pause: () => {
        paused = true;
        pauseCalled = true;
      },
      play: async () => {
        paused = false;
        playCalled = true;
      },
      addEventListener: (ev, fn) => {
        if (!listeners.has(ev)) listeners.set(ev, []);
        listeners.get(ev).push(fn);
      },
      fire: (ev) => {
        const arr = (listeners.get(ev) || []).slice();
        for (const f of arr) f();
      },
    };
  }

  const vFront = makeVideo(listenersA);
  const vBack = makeVideo(listenersB);

  player.videos = { front: vFront, back: vBack };
  player.setupEventListeners();
  player._isPlayingIntent = true;

  // Back camera starts buffering (waiting event)
  vBack.fire('waiting');

  assert.strictEqual(player._bufferingCameras.has('back'), true);
  // Front camera should be paused to prevent drifting ahead
  assert.strictEqual(vFront.pauseCalled, true);

  // Back camera finishes buffering (canplay event)
  vBack.fire('canplay');
  assert.strictEqual(player._bufferingCameras.size, 0);
  // Playback resumes
  assert.strictEqual(vFront.playCalled, true);
});

test('VideoPlayer - syncCameras adjusts playbackRate for slight drift and snaps currentTime for large drift', () => {
  const player = new VideoPlayer();

  function makeVideo(currentTime, playbackRate = 1.0) {
    let _paused = false;
    return {
      src: 'https://test/clip.mp4',
      seeking: false,
      currentTime,
      playbackRate,
      get paused() {
        return _paused;
      },
      getAttribute: (k) => (k === 'src' ? 'https://test/clip.mp4' : null),
    };
  }

  const vFront = makeVideo(10.0, 1.0); // Master video at 10.0s
  const vSlightAhead = makeVideo(10.15, 1.0); // +150ms ahead
  const vSlightBehind = makeVideo(9.85, 1.0); // -150ms behind
  const vSevereDrift = makeVideo(8.5, 1.0); // 1.5s behind (> 400ms)

  player.videos = {
    front: vFront,
    back: vSlightAhead,
    left_repeater: vSlightBehind,
    right_repeater: vSevereDrift,
  };
  player._intendedPlaybackRate = 1.0;

  player.syncCameras();

  // Ahead video should be slightly slowed down (0.92x)
  assert.ok(vSlightAhead.playbackRate < 1.0);
  assert.strictEqual(vSlightAhead.playbackRate, 0.92);

  // Behind video should be slightly sped up (1.08x)
  assert.ok(vSlightBehind.playbackRate > 1.0);
  assert.strictEqual(vSlightBehind.playbackRate, 1.08);

  // Severe drift video should be hard-aligned to master currentTime (10.0s)
  assert.strictEqual(vSevereDrift.currentTime, 10.0);
  assert.strictEqual(vSevereDrift.playbackRate, 1.0);
});
