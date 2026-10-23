import type { TeslaCamEvent } from '../types';

export type VideoCameraMap = Record<string, HTMLVideoElement | null>;

/**
 * VideoPlayer - Manages synchronized video playback for 4-6 camera systems
 * Optimized for modern hardware and simplicity.
 * Uses a dual-bank system to preload the next clip and eliminate black flashes.
 */
export class VideoPlayer {
  public videos: VideoCameraMap = {};
  public currentEvent: TeslaCamEvent | null = null;
  public currentClipIndex = -1;
  public loopEnabled = false;
  public disableAutoAdvance = false;
  public hasPillarCameras = false;
  public _isPlayingIntent = false;
  public _preloading = false;
  public _intendedPlaybackRate = 1.0;
  public disablePreload = false;
  public _lastPreloadedClipIndex = -1;
  public _bufferingCameras = new Set<string>();
  public _isSeeking = false;
  private _seekGeneration = 0;
  public blobCache = new Map<string, string>();
  private _blobAbortControllers = new Map<string, AbortController>();

  public onClipChange: ((clipIndex: number) => void) | null = null;
  public onTimeUpdate:
    | ((currentTime: number, duration: number) => void)
    | null = null;
  public onEnded: (() => void) | null = null;
  public onPlayStateChange: ((isPlaying: boolean) => void) | null = null;
  public videoLabels: Record<string, HTMLElement | null> = {};

  // Backward compatibility getters
  public get banks(): Record<'a' | 'b', VideoCameraMap> {
    return { a: this.videos, b: this.videos };
  }
  public set banks(val: Record<'a' | 'b', VideoCameraMap>) {
    if (val.a) {
      this.videos = val.a;
    }
  }
  public get activeBank(): 'a' | 'b' {
    return 'a';
  }
  public set activeBank(_val: 'a' | 'b') {
    // Single bank architecture
  }

  constructor() {
    this.videos = this._resolveVideos();
    this.videoLabels = this._resolveLabels();
    this.setupEventListeners();
  }

  getActiveVideos(): HTMLVideoElement[] {
    return Object.values(this.videos).filter((v): v is HTMLVideoElement =>
      Boolean(v && (v.getAttribute('src') || v.src))
    );
  }

  getMasterVideo(): HTMLVideoElement | null {
    if (this.videos.front) {
      return this.videos.front;
    }
    const active = this.getActiveVideos();
    return active.length > 0 ? active[0] : null;
  }

  getMasterCamera(): string {
    if (this.videos.front) {
      return 'front';
    }
    for (const [cam, vid] of Object.entries(this.videos)) {
      if (vid && (vid.getAttribute('src') || vid.src)) return cam;
    }
    return 'front';
  }

  _waitForVideoSeeked(video: HTMLVideoElement): Promise<void> {
    if (!video) return Promise.resolve();
    if (typeof video.addEventListener !== 'function') {
      return Promise.resolve();
    }
    if (
      !video.seeking &&
      typeof video.readyState === 'number' &&
      video.readyState >= 2
    ) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        video.removeEventListener('seeked', finish);
        video.removeEventListener('error', finish);
        resolve();
      };
      video.addEventListener('seeked', finish, { once: true });
      video.addEventListener('error', finish, { once: true });
      setTimeout(finish, 2500);
    });
  }

  async _waitForAllSeeked(): Promise<void> {
    const active = this.getActiveVideos();
    if (active.length === 0) return;
    await Promise.all(active.map((v) => this._waitForVideoSeeked(v)));
  }

  syncCameras(): void {
    if (this._isSeeking || !this.isPlaying || this._bufferingCameras.size > 0) {
      return;
    }

    const master = this.getMasterVideo();
    if (!master || master.paused || master.seeking) return;

    const masterTime = master.currentTime;
    const activeVideos = this.getActiveVideos();

    // Scale drift thresholds with playback speed so high speeds (e.g. 5x) do not thrash seeks
    const rate = Math.max(1, this._intendedPlaybackRate);
    const minorDriftThreshold = 0.05 * rate;
    const severeDriftThreshold = 0.4 * rate;

    for (const video of activeVideos) {
      if (video === master || video.seeking || video.paused) continue;

      // Do not snap playing videos back to 0 if master is transiently buffering or recovering
      if (masterTime < 0.5 && video.currentTime > 1.5) continue;

      const diff = video.currentTime - masterTime;
      const absDiff = Math.abs(diff);

      if (absDiff > severeDriftThreshold) {
        // Severe drift: hard-sync currentTime
        try {
          video.currentTime = masterTime;
        } catch (_e) {}
        video.playbackRate = this._intendedPlaybackRate;
      } else if (absDiff > minorDriftThreshold) {
        // Minor drift: smooth rate nudging without audio/video jump
        const rateAdjustment = diff > 0 ? 0.92 : 1.08;
        video.playbackRate = this._intendedPlaybackRate * rateAdjustment;
      } else {
        // Synchronized: reset to standard rate
        if (video.playbackRate !== this._intendedPlaybackRate) {
          video.playbackRate = this._intendedPlaybackRate;
        }
      }
    }
  }

  get currentTime(): number {
    return this.getMasterVideo()?.currentTime ?? 0;
  }

  set currentTime(t: number) {
    this.seek(t, this._isPlayingIntent);
  }

  get duration(): number {
    const d = this.getMasterVideo()?.duration;
    if (d && !isNaN(d) && d > 0) return d;
    if (this.currentEvent && this.currentClipIndex >= 0) {
      return (
        this.currentEvent.clipGroups[this.currentClipIndex]?.clips?.front
          ?.duration || 60
      );
    }
    return 60;
  }

  get paused(): boolean {
    return this.getMasterVideo()?.paused ?? true;
  }

  get isPlaying(): boolean {
    return !this.paused;
  }

  get playbackRate(): number {
    return this._intendedPlaybackRate;
  }

  set playbackRate(r: number) {
    this._intendedPlaybackRate = r;
    this._applyPlaybackRateToAll();
    if (r >= 2 && this.currentEvent && this.currentClipIndex >= 0) {
      this._warmBlobCacheForCurrentAndNext();
    }
  }

  getBlobUrl(url: string): string | null {
    return this.blobCache.get(url) || null;
  }

  async fetchClipBlob(url: string): Promise<string | null> {
    if (!url || url.startsWith('blob:') || this.blobCache.has(url)) {
      return this.blobCache.get(url) || null;
    }
    if (typeof globalThis.fetch !== 'function') return null;

    this._blobAbortControllers.get(url)?.abort();
    const controller = new AbortController();
    this._blobAbortControllers.set(url, controller);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return null;
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.blobCache.set(url, blobUrl);
      this._blobAbortControllers.delete(url);

      // Keep blobCache bounded to avoid memory exhaustion (max 18 items = 3 clips * 6 cameras)
      if (this.blobCache.size > 18) {
        const oldestKey = this.blobCache.keys().next().value;
        if (oldestKey) {
          const oldBlobUrl = this.blobCache.get(oldestKey);
          if (oldBlobUrl) {
            try {
              URL.revokeObjectURL(oldBlobUrl);
            } catch (_e) {}
          }
          this.blobCache.delete(oldestKey);
        }
      }

      return blobUrl;
    } catch (_err) {
      this._blobAbortControllers.delete(url);
      return null;
    }
  }

  _warmBlobCacheForCurrentAndNext(): void {
    if (!this.currentEvent || typeof globalThis.fetch !== 'function') return;
    const clipGroups = [
      this.currentEvent.clipGroups[this.currentClipIndex],
      this.currentEvent.clipGroups[this.currentClipIndex + 1],
    ].filter(Boolean);

    const cameras = ['front', 'back', 'left_repeater', 'right_repeater'];
    if (this.hasPillarCameras) cameras.push('left_pillar', 'right_pillar');

    for (const group of clipGroups) {
      for (const cam of cameras) {
        const url = group?.clips?.[cam]?.url;
        if (url && !url.startsWith('blob:') && !this.blobCache.has(url)) {
          this.fetchClipBlob(url).then((blobUrl) => {
            if (!blobUrl) return;
            // If this is the active clip and video element is still playing the raw stream URL, upgrade
            if (
              this.currentEvent &&
              group === this.currentEvent.clipGroups[this.currentClipIndex]
            ) {
              const video = this.videos[cam];
              if (video && video.getAttribute('src') === url) {
                const cur = video.currentTime;
                const wasPlaying = !video.paused;
                video.src = blobUrl;
                try {
                  video.currentTime = cur;
                } catch (_e) {}
                if (wasPlaying && this._isPlayingIntent) {
                  video.play()?.catch?.(() => {});
                }
              }
            }
          });
        }
      }
    }
  }

  clearBlobCache(): void {
    for (const controller of this._blobAbortControllers.values()) {
      controller.abort();
    }
    this._blobAbortControllers.clear();
    for (const blobUrl of this.blobCache.values()) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (_e) {}
    }
    this.blobCache.clear();
  }

  get playbackSpeed(): number {
    return this.playbackRate;
  }

  set playbackSpeed(s: number) {
    this.playbackRate = s;
  }

  get isLooping(): boolean {
    return this.loopEnabled;
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackRate = speed;
  }

  setLoop(enabled: boolean): void {
    this.loopEnabled = enabled;
  }

  _applyPlaybackRateToAll(): void {
    for (const v of Object.values(this.videos)) {
      if (v) v.playbackRate = this._intendedPlaybackRate;
    }
  }

  /**
   * Absolute time in the event (sum of previous clips + current clip time)
   */
  get absoluteTime(): number {
    if (!this.currentEvent) return 0;
    let offset = 0;
    for (let i = 0; i < this.currentClipIndex; i++) {
      offset += this.currentEvent.clipGroups[i]?.clips?.front?.duration || 60;
    }
    return offset + this.currentTime;
  }

  /**
   * Backward compatibility getter for components that still expect an array
   * of clip durations (Telemetry, Export, AI Search Heatmap).
   */
  get cachedClipDurations(): number[] {
    if (!this.currentEvent) return [];
    return this.currentEvent.clipGroups.map((g) => {
      // Prefer front camera for duration source of truth
      if (g.clips.front?.duration) return g.clips.front.duration;
      // Fallback to any other camera that has a probed duration
      for (const cam of Object.values(g.clips || {})) {
        if (cam?.duration) return cam.duration;
      }
      // Default to 60s if no probe data found
      return 60;
    });
  }

  _resolveVideos(): VideoCameraMap {
    if (typeof document === 'undefined') return {};
    const ids: Record<string, string> = {
      front: 'videoFront',
      back: 'videoBack',
      left_repeater: 'videoLeft',
      right_repeater: 'videoRight',
      left_pillar: 'videoLeftPillar',
      right_pillar: 'videoRightPillar',
    };
    const out: VideoCameraMap = {};
    for (const [cam, id] of Object.entries(ids)) {
      const el = document.getElementById(id) as HTMLVideoElement | null;
      if (el) {
        el.crossOrigin = 'anonymous';
        el.preload = 'auto';
        el.style.position = 'absolute';
        el.style.top = '0';
        el.style.left = '0';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.objectFit = 'inherit';
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        el.style.zIndex = '1';
        out[cam] = el;
      }
    }
    return out;
  }

  _resolveLabels(): Record<string, HTMLElement | null> {
    const labels: Record<string, HTMLElement | null> = {};
    for (const [cam, video] of Object.entries(this.videos)) {
      labels[cam] = video?.parentElement?.querySelector(
        '.video-label'
      ) as HTMLElement | null;
    }
    return labels;
  }

  setupEventListeners(): void {
    const onPlayStateToggle = () => {
      if (this.onPlayStateChange) {
        this.onPlayStateChange(this._isPlayingIntent);
      }
    };

    for (const [camera, video] of Object.entries(this.videos)) {
      if (!video || typeof video.addEventListener !== 'function') continue;

      video.addEventListener('timeupdate', () => {
        const isMaster =
          camera === 'front' ||
          (!this.videos.front && camera === this.getMasterCamera());
        if (isMaster) {
          if (this.onTimeUpdate) {
            this.onTimeUpdate(this.currentTime, this.duration);
          }
          this._checkPreloadTrigger();
          this.syncCameras();
        }
      });

      video.addEventListener('ended', () => {
        this.updateVideoLabelState(camera, true);
        this.handleVideoEnded();
      });

      video.addEventListener('waiting', () => {
        if (!this._isPlayingIntent || this._isSeeking) return;
        this._bufferingCameras.add(camera);
        // Pause other active videos so they do not drift ahead while this camera buffers
        for (const [otherCam, otherVid] of Object.entries(this.videos)) {
          if (otherVid && otherCam !== camera && !otherVid.paused) {
            try {
              otherVid.pause();
            } catch (_e) {}
          }
        }
      });

      const onCameraReady = () => {
        this._bufferingCameras.delete(camera);
        // If all cameras have finished buffering and user intended to play, resume playback
        if (
          this._isPlayingIntent &&
          !this._isSeeking &&
          this._bufferingCameras.size === 0
        ) {
          this.play();
        }
      };

      video.addEventListener('canplay', onCameraReady);

      video.addEventListener('playing', () => {
        this.updateVideoLabelState(camera, false);
        onCameraReady();
        onPlayStateToggle();
      });

      video.addEventListener('pause', onPlayStateToggle);

      video.controls = false;
      video.muted = true;
      video.volume = 0;

      video.parentElement?.addEventListener('dblclick', () => {
        if (!document.fullscreenElement) {
          video.parentElement?.requestFullscreen().catch(console.error);
        } else {
          document.exitFullscreen();
        }
      });
    }
  }

  _checkPreloadTrigger(): void {
    if (!this.disablePreload && !this._preloading && this.currentEvent) {
      const nextIndex = this.currentClipIndex + 1;
      if (
        nextIndex < this.currentEvent.clipGroups.length &&
        this._lastPreloadedClipIndex !== nextIndex
      ) {
        this._lastPreloadedClipIndex = nextIndex;
        this.preloadClip(nextIndex);
      }
    }
  }

  async loadEvent(event: TeslaCamEvent, initialTime = 0): Promise<void> {
    this.currentEvent = event;
    this.currentClipIndex = -1;
    this._lastPreloadedClipIndex = -1;
    this.hasPillarCameras = JSON.stringify(event).includes('_pillar');

    if (initialTime > 0) {
      await this.seekToEventTime(initialTime, false);
    } else {
      await this.loadClip(0);
    }
  }

  async loadClip(
    clipIndex: number,
    _isPreload = false,
    startTimeInClip = 0
  ): Promise<void> {
    if (
      !this.currentEvent ||
      clipIndex < 0 ||
      clipIndex >= this.currentEvent.clipGroups.length
    )
      return;

    const clipGroup = this.currentEvent.clipGroups[clipIndex];

    // Hardware pause only, preserve user intent
    for (const v of Object.values(this.videos)) {
      v?.pause?.();
    }
    this.currentClipIndex = clipIndex;
    this.resetAllVideoLabelStates();

    const cameras = ['front', 'back', 'left_repeater', 'right_repeater'];
    if (this.hasPillarCameras) cameras.push('left_pillar', 'right_pillar');

    const loadPromises = cameras.map((camera) => {
      const clip = clipGroup?.clips?.[camera];
      const video = this.videos?.[camera];
      const rawUrl = clip?.url || '';
      const effectiveUrl = this.blobCache.get(rawUrl) || rawUrl;

      if (!video) return Promise.resolve();
      if (
        video.getAttribute('src') === effectiveUrl ||
        (video.src && video.src === effectiveUrl)
      ) {
        if (startTimeInClip > 0) {
          try {
            video.currentTime = startTimeInClip;
          } catch (_e) {}
        }
        return Promise.resolve();
      }

      if (!effectiveUrl) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 4000);
        video.onloadedmetadata = () => {
          if (startTimeInClip > 0) {
            try {
              video.currentTime = startTimeInClip;
            } catch (_e) {}
          }
          clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
        video.preload = 'auto';
        video.src = effectiveUrl;
      });
    });

    await Promise.all(loadPromises);

    // Ensure currentTime is applied once metadata is ready
    if (startTimeInClip > 0) {
      for (const v of Object.values(this.videos)) {
        if (v && Math.abs(v.currentTime - startTimeInClip) > 0.5) {
          try {
            v.currentTime = startTimeInClip;
          } catch (_e) {}
        }
      }
      // Wait for seek barrier so newly loaded clip starts synchronized
      await this._waitForAllSeeked();
    }

    // Re-apply playback rate because browsers often reset it when src changes
    this._applyPlaybackRateToAll();

    // If playback speed is high (>=2x), pre-warm blob buffers in memory to bypass 6.5MB limits
    if (this._intendedPlaybackRate >= 2) {
      this._warmBlobCacheForCurrentAndNext();
    }

    if (this.onClipChange) this.onClipChange(clipIndex);
    if (this._isPlayingIntent) this.play();
    this._preloading = false;

    // Trigger server-side background cache warming for the next clip
    const nextIndex = clipIndex + 1;
    if (
      !this.disablePreload &&
      this.currentEvent &&
      nextIndex < this.currentEvent.clipGroups.length
    ) {
      this.preloadClip(nextIndex);
    }
  }

  async preloadClip(clipIndex: number): Promise<void> {
    if (this.disablePreload || this._preloading || !this.currentEvent) return;
    if (clipIndex < 0 || clipIndex >= this.currentEvent.clipGroups.length)
      return;

    this._preloading = true;
    try {
      const clipGroup = this.currentEvent.clipGroups[clipIndex];
      if (!clipGroup) return;

      const items: Array<{ file?: string; url?: string }> = [];
      const cameras = ['front', 'back', 'left_repeater', 'right_repeater'];
      if (this.hasPillarCameras) cameras.push('left_pillar', 'right_pillar');

      for (const cam of cameras) {
        const clip = clipGroup.clips?.[cam];
        if (clip) {
          items.push({
            file: clip.fileName || (clip as any).file,
            url: clip.url,
          });
        }
      }

      // If items have remote B2 URLs or files, notify server to pre-warm its disk cache
      if (items.length > 0 && typeof window !== 'undefined') {
        const hasServerItems = items.some((it) => it.url?.includes('/api/'));
        if (hasServerItems) {
          fetch('/api/b2/cache/preload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
          }).catch((err) => {
            console.warn('[VideoPlayer] Server cache preload error:', err);
          });
        }
      }

      // If playing at high speed (>=2x), pre-fetch Blobs for next clip into memory
      if (this.playbackRate >= 2 && typeof globalThis.fetch === 'function') {
        for (const it of items) {
          if (it.url && !it.url.startsWith('blob:')) {
            this.fetchClipBlob(it.url).catch(() => {});
          }
        }
      }
    } finally {
      this._preloading = false;
    }
  }

  async swapBanks(): Promise<void> {
    // Single bank architecture: advancing clip directly
    if (
      this.currentEvent &&
      this.currentClipIndex < this.currentEvent.clipGroups.length - 1
    ) {
      await this.loadClip(this.currentClipIndex + 1);
    }
  }

  play(): Promise<void[] | undefined> | undefined {
    this._isPlayingIntent = true;
    this._applyPlaybackRateToAll(); // Re-enforce speed before playing
    const activeVideos = this.getActiveVideos();
    if (activeVideos.length === 0) return;
    return Promise.all(
      activeVideos.map((v) =>
        v.play().catch((err: unknown) => {
          console.warn('[VideoPlayer] Play error:', err);
        })
      )
    );
  }

  pause(): void {
    this._isPlayingIntent = false;
    this._bufferingCameras.clear();
    for (const video of Object.values(this.videos)) {
      video?.pause?.();
    }
  }

  async seek(
    time: number,
    autoPlay = true,
    allowClipAdvance = true
  ): Promise<void> {
    const clipDur = this.duration;

    if (allowClipAdvance && time < 0 && this.currentClipIndex > 0) {
      await this.loadClip(this.currentClipIndex - 1);
      const newTime = Math.max(0, this.duration + time);
      for (const v of Object.values(this.videos)) {
        if (v) v.currentTime = newTime;
      }
      return;
    }

    if (
      allowClipAdvance &&
      time >= clipDur &&
      this.currentEvent &&
      this.currentClipIndex < this.currentEvent.clipGroups.length - 1
    ) {
      await this.loadClip(this.currentClipIndex + 1);
      const overflow = Math.max(0, time - clipDur);
      for (const v of Object.values(this.videos)) {
        if (v) v.currentTime = overflow;
      }
      return;
    }

    const currentGen = ++this._seekGeneration;
    this._isSeeking = true;

    // Pause active videos during seek to prevent audio/video desync while frames buffer
    const activeVideos = this.getActiveVideos();
    for (const v of activeVideos) {
      try {
        v?.pause?.();
      } catch (_e) {}
    }

    for (const video of Object.values(this.videos)) {
      if (!video) continue;
      const maxTime =
        video.duration && !isNaN(video.duration) && video.duration > 0
          ? Math.max(0, video.duration - 0.05)
          : Math.max(0, clipDur - 0.05);
      const targetTime = Math.max(0, Math.min(time, maxTime));
      try {
        video.currentTime = targetTime;
      } catch (_e) {}
    }

    // Await seek barrier: ensure all active cameras decode their target frame
    await this._waitForAllSeeked();

    // If another seek was initiated in the meantime, don't resume playback for this stale seek
    if (this._seekGeneration !== currentGen) {
      return;
    }

    this._isSeeking = false;
    this._bufferingCameras.clear();
    this._applyPlaybackRateToAll();

    if (autoPlay) {
      this.play();
    }
  }

  async stepFrame(direction: number): Promise<void> {
    this.pause();
    const fps = 30;
    const delta = (1 / fps) * direction;
    const target = Math.max(
      0,
      Math.min(this.duration || 60, this.currentTime + delta)
    );
    await this.seek(target, false);
  }

  async handleVideoEnded(): Promise<void> {
    if (!this.currentEvent) return;
    const activeVideos = Object.values(this.videos).filter(
      (v): v is HTMLVideoElement => Boolean(v && v.getAttribute('src'))
    );
    if (activeVideos.length === 0) return;

    // Only advance if the player actually reached near the end of the clip (within 1 second)
    const isNearEnd = this.currentTime >= Math.max(0, this.duration - 1.0);
    const allEnded = activeVideos.every(
      (v) => v.ended || (isNearEnd && v.error)
    );
    if (!allEnded || !this._isPlayingIntent || !isNearEnd) return;

    if (this.disableAutoAdvance) return;

    if (this.currentClipIndex < this.currentEvent.clipGroups.length - 1) {
      await this.loadClip(this.currentClipIndex + 1);
    } else if (this.loopEnabled) {
      await this.loadClip(0);
    } else {
      this._isPlayingIntent = false;
      if (this.onEnded) this.onEnded();
    }
  }

  async nextClip(): Promise<void> {
    if (
      this.currentEvent &&
      this.currentClipIndex < this.currentEvent.clipGroups.length - 1
    ) {
      await this.loadClip(this.currentClipIndex + 1);
    }
  }

  async previousClip(): Promise<void> {
    if (this.currentEvent && this.currentClipIndex > 0) {
      await this.loadClip(this.currentClipIndex - 1);
    }
  }

  calculateTotalDuration(
    event: TeslaCamEvent | null = this.currentEvent
  ): number {
    if (!event) return 0;
    return event.clipGroups.reduce((total, group) => {
      return total + (group.clips.front?.duration || 60);
    }, 0);
  }

  async getTotalDuration(): Promise<number> {
    return this.calculateTotalDuration(this.currentEvent);
  }

  async seekToEventTime(eventTime: number, autoPlay = true): Promise<void> {
    if (!this.currentEvent) return;
    const totalDuration = this.calculateTotalDuration(this.currentEvent);
    eventTime = Math.max(0, Math.min(eventTime, totalDuration - 0.1));

    let accumulatedTime = 0;
    let targetClipIndex = 0;
    let timeInClip = 0;

    for (let i = 0; i < this.currentEvent.clipGroups.length; i++) {
      const duration =
        this.currentEvent.clipGroups[i]?.clips?.front?.duration || 60;
      if (
        accumulatedTime + duration > eventTime ||
        i === this.currentEvent.clipGroups.length - 1
      ) {
        targetClipIndex = i;
        timeInClip = Math.min(
          duration - 0.05,
          Math.max(0, eventTime - accumulatedTime)
        );
        break;
      }
      accumulatedTime += duration;
    }

    if (targetClipIndex !== this.currentClipIndex) {
      await this.loadClip(targetClipIndex, false, timeInClip);
    } else {
      await this.seek(timeInClip, autoPlay, false);
    }
    this.play();
  }

  updateVideoLabelState(camera: string, ended: boolean): void {
    const label = this.videoLabels[camera];
    if (label) label.classList.toggle('ended', ended);
  }

  resetAllVideoLabelStates(): void {
    for (const label of Object.values(this.videoLabels)) {
      if (label) label.classList.remove('ended');
    }
  }

  clear(): void {
    this.pause();
    this.clearBlobCache();
    this._bufferingCameras.clear();
    this._isSeeking = false;
    for (const video of Object.values(this.videos)) {
      if (video) video.src = '';
    }
    this.currentEvent = null;
    this.currentClipIndex = -1;
    this._lastPreloadedClipIndex = -1;
  }
}

export const videoPlayer = new VideoPlayer();
export default VideoPlayer;
