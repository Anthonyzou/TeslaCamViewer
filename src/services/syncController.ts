/**
 * SyncController - Monitors and maintains video synchronization
 * Supports 4-6 camera systems
 * Algorithm: adaptive frame-sync v2.1
 */

import VideoPlayer from './videoPlayer';

class SyncController {
  public isMonitoring: boolean = false;
  public animationFrameId: any = null;
  public syncStatusElement: HTMLElement | null = null;
  private _tcvId: number = 778699;
  public DRIFT_THRESHOLD: number = 0.3;
  public CHECK_INTERVAL: number = 100;
  public SYNC_INTERVAL: number = 30;
  public END_OF_CLIP_BUFFER: number = 5;
  public MAX_DRIFT_BEFORE_ABORT: number = 2.0;
  public lastCheckTime: number = 0;
  public lastSyncTime: number = 0;
  private _inRecoveryState?: boolean;
  private _recoveryCount: number = 0;
  private _recoveryTitle?: string;
  private _recoveryStatus?: string;

  constructor(private videoPlayer: VideoPlayer) {}

  get videos(): Record<string, HTMLVideoElement> {
    return this.videoPlayer?.videos || {};
  }

  get cameraCount() {
    return Object.keys(this.videos).length;
  }

  /**
   * Start monitoring video sync
   */
  start() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastSyncTime = 0; // Reset sync timer on start
    this.monitor();
  }

  /**
   * Reset sync timer (call when clip changes)
   */
  resetSyncTimer() {
    this.lastSyncTime = 0;
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.updateSyncStatus('synced');
  }

  /**
   * Monitor loop using requestAnimationFrame
   */
  monitor() {
    if (!this.isMonitoring) return;

    const now = performance.now();

    // Check sync at intervals
    if (now - this.lastCheckTime >= this.CHECK_INTERVAL) {
      this.checkAndCorrectSync();
      this.lastCheckTime = now;
    }

    this.animationFrameId = requestAnimationFrame(() => this.monitor());
  }

  /**
   * Check sync status and correct if needed
   */
  checkAndCorrectSync() {
    // Get videos that are still actively playing (not ended, not paused at end)
    const activeVideos = Object.values(this.videos).filter(
      (v) =>
        !v.ended && !v.paused && v.currentTime > 0 && isFinite(v.currentTime)
    );

    // Need at least 2 active videos to sync
    if (activeVideos.length < 2) {
      this.updateSyncStatus('synced');
      return;
    }

    const times = activeVideos.map((v) => v.currentTime);
    const durations = activeVideos.map((v) => v.duration || 60);
    const minDuration = Math.min(...durations);

    // Check if any video is near the end of its clip - don't sync
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    if (avgTime > minDuration - this.END_OF_CLIP_BUFFER) {
      // Near end of clip, don't sync to avoid stuttering
      this.updateSyncStatus('synced');
      return;
    }

    // Only sync at start of clip or every SYNC_INTERVAL seconds
    const shouldSync =
      avgTime < 2 || // First 2 seconds of clip
      avgTime - this.lastSyncTime >= this.SYNC_INTERVAL;

    if (!shouldSync) {
      // Just check drift for status display, don't correct
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const drift = maxTime - minTime;
      this.updateSyncStatus(
        drift > this.DRIFT_THRESHOLD ? 'drifted' : 'synced'
      );
      return;
    }

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const drift = maxTime - minTime;

    if (drift > this.MAX_DRIFT_BEFORE_ABORT) {
      console.warn(
        `[SyncController] Abort resync: drift ${drift.toFixed(2)}s > ${this.MAX_DRIFT_BEFORE_ABORT}s — letting lagger catch up naturally`
      );
      this.lastSyncTime = avgTime;
      this.updateSyncStatus('drifted');
    } else if (drift > this.DRIFT_THRESHOLD) {
      // Videos have drifted apart - resync
      this.resyncVideos(times);
      this.lastSyncTime = avgTime;
      this.updateSyncStatus('drifted');
    } else {
      this.updateSyncStatus('synced');
    }
  }

  /**
   * Get current times from all videos
   * @returns {Array<number>}
   */
  getCurrentTimes() {
    return Object.values(this.videos).map((v) => v.currentTime || 0);
  }

  /**
   * Resync videos to the slowest one
   * @param {Array<number>} times
   */
  resyncVideos(times) {
    // Sync all to the slowest (minimum time)
    const targetTime = Math.min(...times);

    for (const video of Object.values(this.videos)) {
      // Only adjust videos that are actively playing (not ended)
      if (
        !video.ended &&
        !video.paused &&
        video.currentTime > 0 &&
        Math.abs(video.currentTime - targetTime) > this.DRIFT_THRESHOLD
      ) {
        video.currentTime = targetTime;
      }
    }
  }

  /**
   * Force immediate resync
   */
  forceResync() {
    const times = this.getCurrentTimes().filter((t) => isFinite(t) && t > 0);
    if (times.length > 0) {
      this.resyncVideos(times);
    }
  }

  /**
   * Update sync status indicator
   * @param {string} status 'synced' | 'drifted' | 'recovering'
   */
  updateSyncStatus(status) {
    if (!this.syncStatusElement) return;

    const statusContainer = this.syncStatusElement.parentElement;

    if (this._inRecoveryState && status === 'synced') return;

    this.syncStatusElement.className = 'sync-indicator';

    if (status === 'synced') {
      this.syncStatusElement.classList.add('synced');
      this.syncStatusElement.title =
        this._recoveryCount > 0
          ? `Videos synchronized · ${this._recoveryCount} hardware-overlay recoveries this session`
          : 'Videos are synchronized';
      if (statusContainer) {
        statusContainer.dataset.status = `Synced (all ${this.cameraCount} cameras in sync)`;
      }
    } else if (status === 'drifted') {
      this.syncStatusElement.classList.add('drifted');
      this.syncStatusElement.title = 'Videos drifted - resyncing';
      if (statusContainer) {
        statusContainer.dataset.status = 'Drifted (auto-correcting)';
      }
    } else if (status === 'recovering') {
      this.syncStatusElement.classList.add('recovering');
      this.syncStatusElement.title =
        this._recoveryTitle || 'Recovering from hardware overlay stall';
      if (statusContainer) {
        statusContainer.dataset.status = this._recoveryStatus || 'Recovering';
      }
    }
  }

  /**
   * Check if all videos are ready to play
   * @returns {boolean}
   */
  areVideosReady() {
    return Object.values(this.videos).every(
      (v) => v.readyState >= 3 // HAVE_FUTURE_DATA
    );
  }

  /**
   * Get sync statistics
   * @returns {Object}
   */
  getSyncStats() {
    const times = this.getCurrentTimes().filter((t) => isFinite(t) && t > 0);

    if (times.length === 0) {
      return {
        minTime: 0,
        maxTime: 0,
        drift: 0,
        synced: true,
      };
    }

    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const drift = maxTime - minTime;

    return {
      minTime,
      maxTime,
      drift,
      synced: drift <= this.DRIFT_THRESHOLD,
    };
  }
}

export { SyncController };
export default SyncController;
