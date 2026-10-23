import { ref, type Ref } from 'vue';
import { settingsStore } from './useSettings';
import { videoPlayer, VideoPlayer } from './useVideoPlayer';
import { timelineStore } from './useTimeline';

export { videoPlayer, VideoPlayer };

const isPlaying: Ref<boolean> = ref(false);
const speed: Ref<string> = ref('1');
const isLooping: Ref<boolean> = ref(false);
const currentClipIndex: Ref<number> = ref(0);
const currentTime: Ref<number> = ref(0);
const duration: Ref<number> = ref(0);

// Auto-wire video player callbacks directly to reactive state and timelineStore
videoPlayer.onPlayStateChange = (playing: boolean) => {
  isPlaying.value = playing;
};

videoPlayer.onClipChange = (clipIdx: number) => {
  currentClipIndex.value = clipIdx;
};

videoPlayer.onTimeUpdate = (time: number, dur: number) => {
  currentTime.value = time;
  duration.value = dur;
  if (!timelineStore.isDragging) {
    const eventTime = videoPlayer.absoluteTime ?? time ?? 0;
    timelineStore.updateTime(eventTime);
  }
};

export const playbackStore = {
  get isPlaying(): boolean {
    return isPlaying.value;
  },
  get speed(): string {
    return speed.value;
  },
  get isLooping(): boolean {
    return isLooping.value;
  },
  get currentClipIndex(): number {
    return currentClipIndex.value;
  },
  get currentTime(): number {
    return currentTime.value;
  },
  get duration(): number {
    return duration.value;
  },
  get videoPlayer() {
    return videoPlayer;
  },

  async play(): Promise<void> {
    await videoPlayer.play();
    isPlaying.value = !videoPlayer.paused;
  },

  async pause(): Promise<void> {
    await videoPlayer.pause();
    isPlaying.value = !videoPlayer.paused;
  },

  async togglePlay(): Promise<void> {
    if (videoPlayer.paused) {
      await videoPlayer.play();
    } else {
      await videoPlayer.pause();
    }
    isPlaying.value = !videoPlayer.paused;
  },

  async prevClip(): Promise<void> {
    await videoPlayer.previousClip();
  },

  async nextClip(): Promise<void> {
    await videoPlayer.nextClip();
  },

  changeSpeed(val: string): void {
    speed.value = val;
    videoPlayer.setPlaybackSpeed(parseFloat(val));
  },

  toggleLoop(): void {
    videoPlayer.loopEnabled = !videoPlayer.loopEnabled;
    isLooping.value = videoPlayer.loopEnabled;
  },

  stepFrame(direction: number): void {
    videoPlayer.stepFrame(direction);
  },

  frameBack(): void {
    videoPlayer.stepFrame(-1);
  },

  frameForward(): void {
    videoPlayer.stepFrame(1);
  },

  syncPlayback(): void {
    isPlaying.value = !videoPlayer.paused;
    speed.value = String(videoPlayer.playbackRate || '1');
    isLooping.value = videoPlayer.loopEnabled;
    if (videoPlayer.currentClipIndex >= 0) {
      currentClipIndex.value = videoPlayer.currentClipIndex;
    }
  },

  applyPerformanceSettings(): void {
    const preload = settingsStore.get('preloadNextClip');
    videoPlayer.disablePreload = !preload;
  },
};

/**
 * usePlayback - Composable for multi-camera video playback controls
 */
export function usePlayback() {
  return {
    isPlaying,
    speed,
    isLooping,
    currentClipIndex,
    currentTime,
    duration,
    videoPlayer,
    play: playbackStore.play,
    pause: playbackStore.pause,
    togglePlay: playbackStore.togglePlay,
    prevClip: playbackStore.prevClip,
    nextClip: playbackStore.nextClip,
    changeSpeed: playbackStore.changeSpeed,
    toggleLoop: playbackStore.toggleLoop,
    stepFrame: playbackStore.stepFrame,
    frameBack: playbackStore.frameBack,
    frameForward: playbackStore.frameForward,
    syncPlayback: playbackStore.syncPlayback,
  };
}

export default usePlayback;
