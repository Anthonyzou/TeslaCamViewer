import { ref, type Ref } from 'vue';
import type { VideoPlayer } from '../services/videoPlayer';

const inPoint: Ref<number | null> = ref(null);
const outPoint: Ref<number | null> = ref(null);
let defaultVideoPlayerGetter: (() => VideoPlayer | null) | null = null;

export function useClipMarking(
  getVideoPlayer?: () => VideoPlayer | null,
  _getTimeline?: () => unknown
) {
  if (getVideoPlayer) {
    defaultVideoPlayerGetter = getVideoPlayer;
  }

  function getAbsoluteTime(): number {
    const player =
      getVideoPlayer?.() ||
      defaultVideoPlayerGetter?.() ||
      (typeof window !== 'undefined'
        ? window.app?.videoPlayer
        : null);
    return player?.absoluteTime ?? player?.currentTime ?? 0;
  }

  function setInPoint(): number | null {
    const currentTime = getAbsoluteTime();
    inPoint.value = currentTime;

    if (outPoint.value !== null && inPoint.value >= outPoint.value) {
      outPoint.value = null;
    }
    return currentTime;
  }

  function setOutPoint(): number | null {
    const currentTime = getAbsoluteTime();
    outPoint.value = currentTime;

    if (inPoint.value !== null && outPoint.value <= inPoint.value) {
      inPoint.value = null;
    }
    return currentTime;
  }

  function clearInPoint(): void {
    inPoint.value = null;
  }

  function clearOutPoint(): void {
    outPoint.value = null;
  }

  function clearMarks(): void {
    inPoint.value = null;
    outPoint.value = null;
  }

  function getMarks() {
    return {
      inPoint: inPoint.value,
      outPoint: outPoint.value,
    };
  }

  function getMarkedDuration(): number | null {
    if (inPoint.value === null || outPoint.value === null) {
      return null;
    }
    return outPoint.value - inPoint.value;
  }

  return {
    inPoint,
    outPoint,
    setInPoint,
    setOutPoint,
    clearInPoint,
    clearOutPoint,
    clearMarks,
    getMarks,
    getMarkedDuration,
  };
}
