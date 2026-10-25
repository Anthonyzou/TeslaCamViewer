import assert from 'node:assert';
import { test } from 'node:test';
import { createJiti } from 'jiti';

const jiti = createJiti(process.cwd());
const { playbackStore } = jiti('./src/composables/usePlayback.ts');
const { videoPlayer } = jiti('./src/composables/useVideoPlayer.ts');

test('playbackStore.stepSpeed - moves the reactive speed the playback menu reads, up and down the list', () => {
  videoPlayer.setPlaybackSpeed(1);
  playbackStore.changeSpeed('1');

  playbackStore.stepSpeed(1);
  assert.strictEqual(playbackStore.speed, '1.25');
  assert.strictEqual(videoPlayer.playbackRate, 1.25);

  playbackStore.stepSpeed(-1);
  assert.strictEqual(playbackStore.speed, '1');
  assert.strictEqual(videoPlayer.playbackRate, 1);
});

test('playbackStore.stepSpeed - stops at the ends of the speed list', () => {
  videoPlayer.setPlaybackSpeed(5);
  playbackStore.changeSpeed('5');
  playbackStore.stepSpeed(1);
  assert.strictEqual(playbackStore.speed, '5');

  videoPlayer.setPlaybackSpeed(0.25);
  playbackStore.changeSpeed('0.25');
  playbackStore.stepSpeed(-1);
  assert.strictEqual(playbackStore.speed, '0.25');
});
