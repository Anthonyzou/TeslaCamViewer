/**
 * VideoPlayer - Manages synchronized video playback for 4-6 camera systems
 * Optimized for modern hardware and simplicity.
 * Uses a dual-bank system to preload the next clip and eliminate black flashes.
 */
class VideoPlayer {
  constructor() {
    this.banks = {};
    this.banks.a = this._resolveVideos('bank-a');
    this.banks.b = this._createSecondBank('bank-b');

    this.activeBank = 'a';
    this.currentEvent = null;
    this.currentClipIndex = -1;
    this.loopEnabled = false;
    this.disableAutoAdvance = false;
    this.hasPillarCameras = false;
    this._isPlayingIntent = false;
    this._preloading = false;
    this._intendedPlaybackRate = 1.0; // Source of truth for playback speed

    // Callbacks
    this.onClipChange = null;
    this.onTimeUpdate = null;
    this.onEnded = null;
    this.onPlayStateChange = null;

    this.videoLabels = this._resolveLabels();
    this.setupEventListeners();
  }

  /**
   * Proxies for the active bank's front camera
   */
  get videos() {
    return this.banks[this.activeBank];
  }
  get currentTime() {
    return this.videos.front.currentTime;
  }
  set currentTime(t) {
    this.seek(t, this._isPlayingIntent);
  }
  get duration() {
    return this.videos.front.duration;
  }
  get paused() {
    return this.videos.front.paused;
  }
  get playbackRate() {
    return this._intendedPlaybackRate;
  }
  set playbackRate(r) {
    this._intendedPlaybackRate = r;
    this._applyPlaybackRateToAll();
  }

  setLoop(enabled) {
    this.loopEnabled = enabled;
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getCurrentAbsoluteTime() {
    return this.absoluteTime;
  }

  _applyPlaybackRateToAll() {
    for (const v of Object.values(this.banks.a))
      v.playbackRate = this._intendedPlaybackRate;
    for (const v of Object.values(this.banks.b))
      v.playbackRate = this._intendedPlaybackRate;
  }

  /**
   * Absolute time in the event (sum of previous clips + current clip time)
   */
  get absoluteTime() {
    if (!this.currentEvent) return 0;
    let offset = 0;
    for (let i = 0; i < this.currentClipIndex; i++) {
      offset += this.currentEvent.clipGroups[i].clips.front?.duration || 60;
    }
    return offset + this.currentTime;
  }

  /**
   * Backward compatibility getter for components that still expect an array
   * of clip durations (Telemetry, Export, AI Search Heatmap).
   */
  get cachedClipDurations() {
    if (!this.currentEvent) return [];
    return this.currentEvent.clipGroups.map((g) => {
      // Prefer front camera for duration source of truth
      if (g.clips.front?.duration) return g.clips.front.duration;
      // Fallback to any other camera that has a probed duration
      for (const cam of Object.values(g.clips)) {
        if (cam.duration) return cam.duration;
      }
      // Default to 60s if no probe data found
      return 60;
    });
  }

  _resolveVideos(className) {
    const ids = {
      front: 'videoFront',
      back: 'videoBack',
      left_repeater: 'videoLeft',
      right_repeater: 'videoRight',
      left_pillar: 'videoLeftPillar',
      right_pillar: 'videoRightPillar',
    };
    const out = {};
    for (const [cam, id] of Object.entries(ids)) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add(className);
        out[cam] = el;
      }
    }
    return out;
  }

  _createSecondBank(className) {
    const out = {};
    for (const [cam, primary] of Object.entries(this.banks.a)) {
      const el = document.createElement('video');
      el.className = `video-player ${className}`;
      el.style.display = 'none';
      el.style.position = 'absolute';
      el.style.top = '0';
      el.style.left = '0';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.objectFit = 'inherit';
      el.muted = true;
      el.playsInline = true;
      primary.parentElement.appendChild(el);
      out[cam] = el;
    }
    return out;
  }

  _resolveLabels() {
    const labels = {};
    for (const [cam, video] of Object.entries(this.banks.a)) {
      labels[cam] = video.parentElement?.querySelector('.video-label');
    }
    return labels;
  }

  setupEventListeners() {
    const setupBank = (bank, bankId) => {
      bank.front.addEventListener('timeupdate', () => {
        if (this.activeBank === bankId) {
          if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime);
          this._checkPreloadTrigger();
        }
      });

      const onPlayStateToggle = () => {
        if (this.activeBank === bankId) {
          if (this.onPlayStateChange)
            this.onPlayStateChange(this._isPlayingIntent);
        }
      };

      for (const [camera, video] of Object.entries(bank)) {
        video.addEventListener('ended', () => {
          if (this.activeBank === bankId) {
            this.updateVideoLabelState(camera, true);
            this.handleVideoEnded();
          }
        });

        video.addEventListener('playing', () => {
          if (this.activeBank === bankId) {
            this.updateVideoLabelState(camera, false);
            onPlayStateToggle();
          }
        });

        video.addEventListener('pause', onPlayStateToggle);

        video.controls = false;
        video.muted = true;
        video.volume = 0;

        video.parentElement.addEventListener('dblclick', () => {
          if (this.activeBank === bankId) {
            if (!document.fullscreenElement) {
              video.parentElement.requestFullscreen().catch(console.error);
            } else {
              document.exitFullscreen();
            }
          }
        });
      }
    };

    setupBank(this.banks.a, 'a');
    setupBank(this.banks.b, 'b');
  }

  _checkPreloadTrigger() {
    // 5 seconds before end, trigger preload of next clip
    if (this._isPlayingIntent && !this._preloading && this.currentEvent) {
      const remaining = this.duration - this.currentTime;
      if (remaining > 0 && remaining < 5 * this.playbackRate) {
        const nextIndex = this.currentClipIndex + 1;
        if (nextIndex < this.currentEvent.clipGroups.length) {
          this._preloading = true;
          this.preloadClip(nextIndex);
        }
      }
    }
  }

  async loadEvent(event) {
    this.currentEvent = event;
    this.currentClipIndex = -1;
    this.hasPillarCameras = JSON.stringify(event).includes('_pillar');

    await this.loadClip(0);
  }

  async loadClip(clipIndex, isPreload = false) {
    if (
      !this.currentEvent ||
      clipIndex < 0 ||
      clipIndex >= this.currentEvent.clipGroups.length
    )
      return;

    const targetBankId = isPreload
      ? this.activeBank === 'a'
        ? 'b'
        : 'a'
      : this.activeBank;
    const videos = this.banks[targetBankId];
    const clipGroup = this.currentEvent.clipGroups[clipIndex];

    if (!isPreload) {
      // Hardware pause only, preserve user intent
      for (const v of Object.values(this.videos)) v.pause();
      this.currentClipIndex = clipIndex;
      this.resetAllVideoLabelStates();
    }

    const cameras = ['front', 'back', 'left_repeater', 'right_repeater'];
    if (this.hasPillarCameras) cameras.push('left_pillar', 'right_pillar');

    const loadPromises = cameras.map((camera) => {
      const clip = clipGroup.clips[camera];
      const video = videos[camera];
      const url = clip?.url || '';

      if (video.getAttribute('src') === url) return Promise.resolve();

      return new Promise((resolve) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => resolve();
        video.src = url;
        if (!url) resolve();
      });
    });

    await Promise.all(loadPromises);

    // Re-apply playback rate because browsers often reset it when src changes
    this._applyPlaybackRateToAll();

    if (!isPreload) {
      if (this.onClipChange) this.onClipChange(clipIndex);
      if (this._isPlayingIntent) this.play();
      this._preloading = false;
    }
  }

  async preloadClip(clipIndex) {
    await this.loadClip(clipIndex, true);
  }

  async swapBanks() {
    const oldBankId = this.activeBank;
    const newBankId = this.activeBank === 'a' ? 'b' : 'a';

    // Hide old, show new
    for (const v of Object.values(this.banks[oldBankId])) {
      v.style.display = 'none';
      v.pause();
    }
    for (const v of Object.values(this.banks[newBankId])) {
      v.style.display = 'block';
    }

    this.activeBank = newBankId;
    this.currentClipIndex++;
    this._preloading = false;
    this.resetAllVideoLabelStates();

    if (this.onClipChange) this.onClipChange(this.currentClipIndex);
    if (this._isPlayingIntent) this.play();
  }

  play() {
    this._isPlayingIntent = true;
    this._applyPlaybackRateToAll(); // Re-enforce speed before playing
    const activeVideos = Object.values(this.videos).filter((v) =>
      v.getAttribute('src')
    );
    if (activeVideos.length === 0) return;
    return Promise.all(activeVideos.map((v) => v.play()));
  }

  pause() {
    this._isPlayingIntent = false;
    for (const video of Object.values(this.videos)) video.pause();
  }

  async seek(time, autoPlay = true) {
    if (time < 0 && this.currentClipIndex > 0) {
      await this.loadClip(this.currentClipIndex - 1);
      const newTime = Math.max(0, this.duration + time);
      for (const v of Object.values(this.videos)) v.currentTime = newTime;
      return;
    }

    if (
      time >= this.duration &&
      this.currentEvent &&
      this.currentClipIndex < this.currentEvent.clipGroups.length - 1
    ) {
      await this.loadClip(this.currentClipIndex + 1);
      const overflow = Math.max(0, time - this.duration);
      for (const v of Object.values(this.videos)) v.currentTime = overflow;
      return;
    }

    for (const video of Object.values(this.videos)) {
      const maxTime = video.duration
        ? Math.max(0, video.duration - 0.05)
        : time;
      video.currentTime = Math.max(0, Math.min(time, maxTime));
    }

    if (autoPlay) {
      this.play();
    }
  }

  async handleVideoEnded() {
    const activeVideos = Object.values(this.videos).filter((v) =>
      v.getAttribute('src')
    );
    const allEnded = activeVideos.every((v) => v.ended || v.error);
    if (!allEnded || !this._isPlayingIntent) return;

    if (this.disableAutoAdvance) return;

    if (this.currentClipIndex < this.currentEvent.clipGroups.length - 1) {
      await this.swapBanks();
    } else if (this.loopEnabled) {
      await this.loadClip(0);
    } else {
      this._isPlayingIntent = false;
      if (this.onEnded) this.onEnded();
    }
  }

  async nextClip() {
    if (
      this.currentEvent &&
      this.currentClipIndex < this.currentEvent.clipGroups.length - 1
    ) {
      await this.loadClip(this.currentClipIndex + 1);
    }
  }

  async previousClip() {
    if (this.currentEvent && this.currentClipIndex > 0) {
      await this.loadClip(this.currentClipIndex - 1);
    }
  }

  async getTotalDuration() {
    if (!this.currentEvent) return 0;
    return this.currentEvent.clipGroups.reduce((total, group) => {
      return total + (group.clips.front?.duration || 60);
    }, 0);
  }

  async seekToEventTime(eventTime, autoPlay = true) {
    if (!this.currentEvent) return;
    const totalDuration = await this.getTotalDuration();
    eventTime = Math.max(0, Math.min(eventTime, totalDuration - 0.1));

    let accumulatedTime = 0;
    let targetClipIndex = 0;
    let timeInClip = 0;

    for (let i = 0; i < this.currentEvent.clipGroups.length; i++) {
      const duration =
        this.currentEvent.clipGroups[i].clips.front?.duration || 60;
      if (accumulatedTime + duration >= eventTime) {
        targetClipIndex = i;
        timeInClip = eventTime - accumulatedTime;
        break;
      }
      accumulatedTime += duration;
    }

    if (targetClipIndex !== this.currentClipIndex)
      await this.loadClip(targetClipIndex);
    await this.seek(timeInClip, autoPlay);
  }

  updateVideoLabelState(camera, ended) {
    const label = this.videoLabels[camera];
    if (label) label.classList.toggle('ended', ended);
  }

  resetAllVideoLabelStates() {
    for (const label of Object.values(this.videoLabels)) {
      if (label) label.classList.remove('ended');
    }
  }

  clear() {
    this.pause();
    for (const bank of Object.values(this.banks)) {
      for (const video of Object.values(bank)) video.src = '';
    }
    this.currentEvent = null;
    this.currentClipIndex = -1;
  }
}

if (typeof window !== 'undefined') {
  window.VideoPlayer = VideoPlayer;
}
