import type { TeslaCamEvent } from '../types';

/**
 * useFolderLoader - Composable for preparing event video blob URLs and duration probing
 */
export function useFolderLoader() {
  const cameras = [
    'front',
    'back',
    'left_repeater',
    'right_repeater',
    'left_pillar',
    'right_pillar',
  ];

  /**
   * Helper to probe video duration from a blob URL
   */
  async function probeClipDuration(url: string): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const timeout = setTimeout(() => {
        video.src = '';
        resolve(60);
      }, 3000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const d = video.duration;
        video.src = '';
        resolve(d && isFinite(d) ? d : 60);
      };

      video.onerror = () => {
        clearTimeout(timeout);
        video.src = '';
        resolve(60);
      };

      video.src = url;
    });
  }

  /**
   * Pre-generate Blobs for all clips in an event to support URL-only playback.
   * Also probes durations for accurate timeline mapping.
   */
  async function prepareEventURLs(event: TeslaCamEvent): Promise<void> {
    if (!event || !Array.isArray(event.clipGroups)) return;

    let timeoutCount = 0;
    const MAX_TIMEOUTS = 3;

    for (const group of event.clipGroups) {
      let durationLoaded = false;

      for (const camera of cameras) {
        const clip = group.clips[camera];
        if (!clip) continue;

        if (!clip.url && clip.fileHandle) {
          try {
            const file = await clip.fileHandle.getFile();
            if (file.size >= 1024) {
              clip.url = URL.createObjectURL(file);
              if (!event._blobURLs) event._blobURLs = [];
              event._blobURLs.push(clip.url);

              if (
                camera === 'front' &&
                !clip.duration &&
                timeoutCount < MAX_TIMEOUTS
              ) {
                const start = performance.now();
                clip.duration = await probeClipDuration(clip.url);
                const elapsed = performance.now() - start;

                if (elapsed > 2500) timeoutCount++;
                durationLoaded = true;
              }
            }
          } catch (e) {
            console.error(`Failed to prepare ${camera}:`, e);
          }
        }
      }

      const frontClip = group.clips.front;
      if (!durationLoaded && frontClip && !frontClip.duration) {
        frontClip.duration = 60;
      }
    }
  }

  /**
   * Clean up blob URLs generated for an event to free browser memory
   */
  function cleanupEventURLs(event: TeslaCamEvent | null): void {
    if (!event) return;
    const urls = event._blobURLs;
    if (Array.isArray(urls)) {
      urls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      event._blobURLs = [];
    }
  }

  return {
    prepareEventURLs,
    cleanupEventURLs,
    probeClipDuration,
  };
}
