import { ref, onMounted, onUnmounted } from 'vue';

/**
 * usePlayback - Composable for multi-camera video playback controls
 * Replaces polling with direct event-driven hooks on VideoPlayer
 */
export function usePlayback() {
  const isPlaying = ref(false);
  const speed = ref('1');
  const isLooping = ref(false);
  const currentClipIndex = ref(0);
  const currentTime = ref(0);
  const duration = ref(0);

  function syncPlayback(): void {
    const vp = window.app?.videoPlayer;
    if (!vp) return;

    const playing = !vp.paused;
    if (isPlaying.value !== playing) isPlaying.value = playing;

    const sp = String(vp.playbackRate ?? vp.playbackSpeed ?? '1');
    if (speed.value !== sp) speed.value = sp;

    const loop = vp.loopEnabled ?? vp.isLooping ?? false;
    if (isLooping.value !== loop) isLooping.value = loop;

    if (vp.currentClipIndex !== undefined && currentClipIndex.value !== vp.currentClipIndex) {
      currentClipIndex.value = vp.currentClipIndex;
    }
  }

  let hookTimer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    syncPlayback();

    hookTimer = setInterval(() => {
      const app = window.app;
      const vp = app?.videoPlayer;
      if (vp) {
        if (hookTimer) {
          clearInterval(hookTimer);
          hookTimer = null;
        }

        // Direct callback hooks on VideoPlayer
        const origPlayState = vp.onPlayStateChange;
        vp.onPlayStateChange = (playing: boolean) => {
          isPlaying.value = playing;
          if (typeof origPlayState === 'function') origPlayState(playing);
        };

        const origClipChange = vp.onClipChange;
        vp.onClipChange = (clipIdx: number) => {
          currentClipIndex.value = clipIdx;
          if (typeof origClipChange === 'function') origClipChange(clipIdx);
        };

        const origTimeUpdate = vp.onTimeUpdate;
        vp.onTimeUpdate = (time: number, dur: number) => {
          currentTime.value = time;
          duration.value = dur;
          if (typeof origTimeUpdate === 'function') origTimeUpdate(time, dur);
        };

        syncPlayback();
      }
    }, 100);
  });

  onUnmounted(() => {
    if (hookTimer) clearInterval(hookTimer);
  });

  function play(): void {
    window.app?.play();
  }

  function pause(): void {
    window.app?.pause();
  }

  function togglePlay(): void {
    window.app?.togglePlayback();
    syncPlayback();
  }

  function prevClip(): void {
    window.app?.previousClip();
    syncPlayback();
  }

  function nextClip(): void {
    window.app?.nextClip();
    syncPlayback();
  }

  function changeSpeed(val: string): void {
    speed.value = val;
    const vp = window.app?.videoPlayer;
    if (vp) {
      if (typeof vp.setPlaybackSpeed === 'function') {
        vp.setPlaybackSpeed(parseFloat(val));
      } else {
        vp.playbackRate = parseFloat(val);
      }
    }
    syncPlayback();
  }

  function toggleLoop(): void {
    const vp = window.app?.videoPlayer;
    if (vp) {
      const nextLoop = !(vp.loopEnabled ?? vp.isLooping ?? false);
      if (typeof vp.setLoop === 'function') {
        vp.setLoop(nextLoop);
      } else {
        vp.loopEnabled = nextLoop;
      }
      isLooping.value = nextLoop;
    }
  }

  function frameBack(): void {
    window.app?.videoPlayer?.stepFrame(-1);
  }

  function frameForward(): void {
    window.app?.videoPlayer?.stepFrame(1);
  }

  return {
    isPlaying,
    speed,
    isLooping,
    currentClipIndex,
    currentTime,
    duration,
    play,
    pause,
    togglePlay,
    prevClip,
    nextClip,
    changeSpeed,
    toggleLoop,
    frameBack,
    frameForward,
    syncPlayback,
  };
}
