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

  // Active clip is 0 in bank A
  assert.strictEqual(player.currentClipIndex, 0);
  assert.strictEqual(player.banks.a.front.src, 'https://test/clip0_front.mp4');

  // Next clip (clip 1) was immediately triggered for preload in bank B
  assert.ok(preloadedClips.includes(1));
  assert.strictEqual(player.banks.b.front.preload, 'auto');

  // Swap banks to advance to clip 1
  await player.swapBanks();
  assert.strictEqual(player.activeBank, 'b');
  assert.strictEqual(player.currentClipIndex, 1);
  assert.strictEqual(player.banks.b.front.style.visibility, 'visible');
  assert.strictEqual(player.banks.a.front.style.visibility, 'hidden');

  // Clip 2 is immediately triggered for preload into idle bank A
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
