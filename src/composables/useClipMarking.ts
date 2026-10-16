import { ref } from 'vue';

export function useClipMarking(getVideoPlayer: () => any, getTimeline: () => any) {
  const inPoint = ref<number | null>(null);
  const outPoint = ref<number | null>(null);

  function getAbsoluteTime(): number {
    const player = getVideoPlayer?.();
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
