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

  public onClipChange: ((clipIndex: number) => void) | null = null;
  public onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;
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

  get currentTime(): number {
    return this.videos.front?.currentTime ?? 0;
  }

  set currentTime(t: number) {
    this.seek(t, this._isPlayingIntent);
  }

  get duration(): number {
    const d = this.videos.front?.duration;
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
    return this.videos.front?.paused ?? true;
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
      labels[cam] = video?.parentElement?.querySelector('.video-label') as HTMLElement | null;
    }
    return labels;
  }

  setupEventListeners(): void {
    this.videos.front?.addEventListener('timeupdate', () => {
      if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime, this.duration);
      this._checkPreloadTrigger();
    });

    const onPlayStateToggle = () => {
      if (this.onPlayStateChange) {
        this.onPlayStateChange(this._isPlayingIntent);
      }
    };

    for (const [camera, video] of Object.entries(this.videos)) {
      if (!video) continue;
      video.addEventListener('ended', () => {
        this.updateVideoLabelState(camera, true);
        this.handleVideoEnded();
      });

      video.addEventListener('playing', () => {
        this.updateVideoLabelState(camera, false);
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
      if (v && typeof v.pause === 'function') v.pause();
    }
    this.currentClipIndex = clipIndex;
    this.resetAllVideoLabelStates();

    const cameras = ['front', 'back', 'left_repeater', 'right_repeater'];
    if (this.hasPillarCameras) cameras.push('left_pillar', 'right_pillar');

    const loadPromises = cameras.map((camera) => {
      const clip = clipGroup?.clips?.[camera];
      const video = this.videos?.[camera];
      const url = clip?.url || '';

      if (!video) return Promise.resolve();
      if (video.getAttribute('src') === url) {
        if (startTimeInClip > 0) {
          try {
            video.currentTime = startTimeInClip;
          } catch (_e) {}
        }
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
        video.src = url;
        if (typeof video.load === 'function') {
          video.load();
        }
        if (!url) {
          clearTimeout(timeout);
          resolve();
        }
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
    }

    // Re-apply playback rate because browsers often reset it when src changes
    this._applyPlaybackRateToAll();

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
    if (clipIndex < 0 || clipIndex >= this.currentEvent.clipGroups.length) return;

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
        const hasServerItems = items.some(
          (it) => it.url?.includes('/api/b2/video') || it.url?.startsWith('http') || it.file
        );
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
    const activeVideos = Object.values(this.videos).filter(
      (v): v is HTMLVideoElement => Boolean(v && (v.getAttribute('src') || v.src))
    );
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
    for (const video of Object.values(this.videos)) {
      if (video && typeof video.pause === 'function') video.pause();
    }
  }

  async seek(time: number, autoPlay = true, allowClipAdvance = true): Promise<void> {
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

    for (const video of Object.values(this.videos)) {
      if (!video) continue;
      const maxTime =
        video.duration && !isNaN(video.duration) && video.duration > 0
          ? Math.max(0, video.duration - 0.05)
          : Math.max(0, clipDur - 0.05);
      video.currentTime = Math.max(0, Math.min(time, maxTime));
    }

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
    const allEnded = activeVideos.every((v) => v.ended || (isNearEnd && v.error));
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

  calculateTotalDuration(event: TeslaCamEvent | null = this.currentEvent): number {
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
    }
    await this.seek(timeInClip, autoPlay, false);
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
