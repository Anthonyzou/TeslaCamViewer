/**
 * VideoPlayer - Manages synchronized video playback for 4-6 camera systems
 * Optimized for modern hardware and simplicity.
 * Uses a dual-bank system to preload the next clip and eliminate black flashes.
 */
class VideoPlayer {
  constructor() {
    this.banks = {
      a: this._resolveVideos('bank-a'),
      b: this._createSecondBank('bank-b'),
    };
    this.activeBank = 'a';
    this.currentEvent = null;
    this.currentClipIndex = -1;
    this.loopEnabled = false;
    this.disableAutoAdvance = false;
    this.hasPillarCameras = false;
    this._isPlayingIntent = false;

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
  get videos() { return this.banks[this.activeBank]; }
  get currentTime() { return this.videos.front.currentTime; }
  set currentTime(t) { this.seek(t, this._isPlayingIntent); }
  get duration() { return this.videos.front.duration; }
  get paused() { return this.videos.front.paused; }
  get playbackRate() { return this.videos.front.playbackRate; }
  set playbackRate(r) {
    for (const v of Object.values(this.banks.a)) v.playbackRate = r;
    for (const v of Object.values(this.banks.b)) v.playbackRate = r;
  }

  get absoluteTime() {
    if (!this.currentEvent) return 0;
    let offset = 0;
    for (let i = 0; i < this.currentClipIndex; i++) {
      offset += this.currentEvent.clipGroups[i].clips.front?.duration || 60;
    }
    return offset + this.currentTime;
  }

  get cachedClipDurations() {
    if (!this.currentEvent) return [];
    return this.currentEvent.clipGroups.map((g) => {
      if (g.clips.front?.duration) return g.clips.front.duration;
      for (const cam of Object.values(g.clips)) if (cam.duration) return cam.duration;
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
      el.classList.add(className);
      out[cam] = el;
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
      el.style.objectFit = 'inherit'; // Follow container/primary fit
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
    const setupBank = (bank) => {
      bank.front.addEventListener('timeupdate', () => {
        if (this.activeBank === (bank === this.banks.a ? 'a' : 'b')) {
          if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime);
          this._checkPreloadTrigger();
        }
      });

      for (const [camera, video] of Object.entries(bank)) {
        video.addEventListener('ended', () => {
          if (this.activeBank === (bank === this.banks.a ? 'a' : 'b')) {
            this.updateVideoLabelState(camera, true);
            this.handleVideoEnded();
          }
        });
        video.addEventListener('playing', () => {
          if (this.activeBank === (bank === this.banks.a ? 'a' : 'b')) {
            this.updateVideoLabelState(camera, false);
            if (this.onPlayStateChange) this.onPlayStateChange(this._isPlayingIntent);
          }
        });
        video.addEventListener('pause', () => {
          if (this.activeBank === (bank === this.banks.a ? 'a' : 'b')) {
            if (this.onPlayStateChange) this.onPlayStateChange(this._isPlayingIntent);
          }
        });
      }
    };
    setupBank(this.banks.a);
    setupBank(this.banks.b);
  }

  _checkPreloadTrigger() {
    // 5 seconds before end, trigger preload of next clip
    if (this._isPlayingIntent && !this._preloading && this.currentEvent) {
      const remaining = this.duration - this.currentTime;
      if (remaining > 0 && remaining < 5) {
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
    this.hasPillarCameras = event.hasPillarCameras || false;
    await this.loadClip(0);
  }

  async loadClip(clipIndex, isPreload = false) {
    if (!this.currentEvent || clipIndex < 0 || clipIndex >= this.currentEvent.clipGroups.length) return;

    const targetBank = isPreload ? (this.activeBank === 'a' ? 'b' : 'a') : this.activeBank;
    const videos = this.banks[targetBank];
    const clipGroup = this.currentEvent.clipGroups[clipIndex];

    if (!isPreload) {
      const wasPlaying = this._isPlayingIntent;
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
    const oldBank = this.activeBank;
    const newBank = this.activeBank === 'a' ? 'b' : 'a';
    
    // Hide old, show new
    for (const v of Object.values(this.banks[oldBank])) {
      v.style.display = 'none';
      v.pause();
    }
    for (const v of Object.values(this.banks[newBank])) {
      v.style.display = 'block';
    }

    this.activeBank = newBank;
    this.currentClipIndex++;
    this._preloading = false;
    this.resetAllVideoLabelStates();
    
    if (this.onClipChange) this.onClipChange(this.currentClipIndex);
    if (this._isPlayingIntent) this.play();
  }

  play() {
    this._isPlayingIntent = true;
    const activeVideos = Object.values(this.videos).filter((v) => v.getAttribute('src'));
    return Promise.all(activeVideos.map((v) => v.play()));
  }

  pause() {
    this._isPlayingIntent = false;
    for (const video of Object.values(this.videos)) video.pause();
  }

  async seek(time, autoPlay = true) {
    // If seeking causes a clip change, we just load normally (non-preload)
    if (time < 0 && this.currentClipIndex > 0) {
      await this.loadClip(this.currentClipIndex - 1);
      const newTime = Math.max(0, this.duration + time);
      for (const v of Object.values(this.videos)) v.currentTime = newTime;
      return;
    }

    if (time >= this.duration && this.currentEvent && this.currentClipIndex < this.currentEvent.clipGroups.length - 1) {
      await this.loadClip(this.currentClipIndex + 1);
      const overflow = Math.max(0, time - this.duration);
      for (const v of Object.values(this.videos)) v.currentTime = overflow;
      return;
    }

    for (const video of Object.values(this.videos)) {
      const maxTime = video.duration ? Math.max(0, video.duration - 0.05) : time;
      video.currentTime = Math.max(0, Math.min(time, maxTime));
    }

    if (autoPlay) this.play();
  }

  async handleVideoEnded() {
    const activeVideos = Object.values(this.videos).filter((v) => v.getAttribute('src'));
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
    if (this.currentEvent && this.currentClipIndex < this.currentEvent.clipGroups.length - 1) {
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
      const duration = this.currentEvent.clipGroups[i].clips.front?.duration || 60;
      if (accumulatedTime + duration >= eventTime) {
        targetClipIndex = i;
        timeInClip = eventTime - accumulatedTime;
        break;
      }
      accumulatedTime += duration;
    }

    if (targetClipIndex !== this.currentClipIndex) await this.loadClip(targetClipIndex);
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
