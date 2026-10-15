/**
 * VideoPlayer - Manages synchronized video playback for 4-6 camera systems
 * Optimized for modern hardware and simplicity.
 * Reflects the native state of the HTMLVideoElements as the source of truth.
 */
class VideoPlayer {
  constructor() {
    this.videos = this._resolveVideos();
    this.currentEvent = null;
    this.currentClipIndex = -1;
    this.loopEnabled = false;
    this.disableAutoAdvance = false;
    this.hasPillarCameras = false;

    // Callbacks
    this.onClipChange = null;
    this.onTimeUpdate = null;
    this.onEnded = null;
    this.onPlayStateChange = null;
    this.onBufferingChange = null;

    this.bufferingState = {
      isBuffering: false,
      bufferingCameras: new Set(),
    };

    this.videoLabels = {
      front: document.querySelector('#videoFront')?.parentElement?.querySelector('.video-label'),
      back: document.querySelector('#videoBack')?.parentElement?.querySelector('.video-label'),
      left_repeater: document.querySelector('#videoLeft')?.parentElement?.querySelector('.video-label'),
      right_repeater: document.querySelector('#videoRight')?.parentElement?.querySelector('.video-label'),
      left_pillar: document.querySelector('#videoLeftPillar')?.parentElement?.querySelector('.video-label'),
      right_pillar: document.querySelector('#videoRightPillar')?.parentElement?.querySelector('.video-label'),
    };

    this.setupEventListeners();
  }

  /**
   * Native-feeling properties that proxy to the front (master) camera
   */
  get currentTime() { return this.videos.front.currentTime; }
  set currentTime(t) { this.seek(t); }

  get duration() { return this.videos.front.duration; }
  get paused() { return this.videos.front.paused; }
  get playbackRate() { return this.videos.front.playbackRate; }
  set playbackRate(r) {
    for (const v of Object.values(this.videos)) v.playbackRate = r;
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
   * Resolve native HTMLVideoElement references from the DOM.
   */
  _resolveVideos() {
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
      out[cam] = document.getElementById(id);
    }
    return out;
  }

  setupEventListeners() {
    this.videos.front.addEventListener('timeupdate', () => {
      if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime);
    });

    const onPlayStateToggle = () => {
      if (this.onPlayStateChange) this.onPlayStateChange(!this.paused);
    };

    for (const [camera, video] of Object.entries(this.videos)) {
      video.addEventListener('ended', () => {
        this.updateVideoLabelState(camera, true);
        this.handleVideoEnded();
      });

      video.addEventListener('playing', () => {
        this.updateVideoLabelState(camera, false);
        this.handleBufferingEnd(camera);
        onPlayStateToggle();
      });

      video.addEventListener('pause', onPlayStateToggle);
      video.addEventListener('waiting', () => this.handleBufferingStart(camera));
      video.addEventListener('stalled', () => this.handleBufferingStart(camera));
      video.addEventListener('canplay', () => this.handleBufferingEnd(camera));

      video.controls = false;
      video.muted = true;
      video.volume = 0;

      video.parentElement.addEventListener('dblclick', () => {
        if (!document.fullscreenElement) {
          video.parentElement.requestFullscreen().catch(console.error);
        } else {
          document.exitFullscreen();
        }
      });
    }
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

  async loadEvent(event) {
    this.currentEvent = event;
    this.currentClipIndex = -1;
    this.hasPillarCameras = event.hasPillarCameras || false;
    await this.loadClip(0);
  }

  async loadClip(clipIndex) {
    if (!this.currentEvent || clipIndex < 0 || clipIndex >= this.currentEvent.clipGroups.length) return;

    const wasPlaying = !this.paused;
    const currentRate = this.playbackRate;
    
    if (wasPlaying) this.pause();

    this.resetAllVideoLabelStates();
    this.currentClipIndex = clipIndex;
    const clipGroup = this.currentEvent.clipGroups[clipIndex];

    const cameras = ['front', 'back', 'left_repeater', 'right_repeater'];
    if (this.hasPillarCameras) cameras.push('left_pillar', 'right_pillar');

    const loadPromises = cameras.map(camera => {
      const clip = clipGroup.clips[camera];
      const video = this.videos[camera];
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
    this.playbackRate = currentRate;

    if (this.onClipChange) this.onClipChange(clipIndex);
    if (wasPlaying) this.play();
  }

  play() {
    const activeVideos = Object.values(this.videos).filter(v => v.getAttribute('src'));
    if (activeVideos.length === 0) return;
    return Promise.all(activeVideos.map(v => v.play()));
  }

  pause() {
    for (const video of Object.values(this.videos)) video.pause();
  }

  async seek(time) {
    if (time < 0 && this.currentClipIndex > 0) {
      await this.loadClip(this.currentClipIndex - 1);
      this.currentTime = Math.max(0, this.duration + time);
      return;
    }

    if (time >= this.duration && this.currentEvent && this.currentClipIndex < this.currentEvent.clipGroups.length - 1) {
      await this.loadClip(this.currentClipIndex + 1);
      this.currentTime = Math.max(0, time - this.duration);
      return;
    }

    for (const video of Object.values(this.videos)) {
      const maxTime = video.duration ? Math.max(0, video.duration - 0.05) : time;
      video.currentTime = Math.max(0, Math.min(time, maxTime));
    }
  }

  async handleVideoEnded() {
    const activeVideos = Object.values(this.videos).filter(v => v.getAttribute('src'));
    const allEnded = activeVideos.every(v => v.ended || v.error);
    if (!allEnded || this.paused) return;

    if (this.disableAutoAdvance) return;

    if (this.currentClipIndex < this.currentEvent.clipGroups.length - 1) {
      await this.loadClip(this.currentClipIndex + 1);
    } else if (this.loopEnabled) {
      await this.loadClip(0);
    } else {
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

  async seekToEventTime(eventTime) {
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
    this.currentTime = timeInClip;
  }

  clear() {
    this.pause();
    for (const video of Object.values(this.videos)) video.src = '';
    this.currentEvent = null;
    this.currentClipIndex = -1;
  }

  handleBufferingStart(camera) {
    if (this.paused) return;
    this.bufferingState.bufferingCameras.add(camera);
    this.bufferingState.isBuffering = true;
    if (this.onBufferingChange) this.onBufferingChange(this.getBufferingState());
  }

  handleBufferingEnd(camera) {
    this.bufferingState.bufferingCameras.delete(camera);
    if (this.bufferingState.bufferingCameras.size === 0) {
      this.bufferingState.isBuffering = false;
      if (this.onBufferingChange) this.onBufferingChange(this.getBufferingState());
    }
  }

  getBufferingState() {
    return {
      isBuffering: this.bufferingState.isBuffering,
      cameras: Array.from(this.bufferingState.bufferingCameras),
    };
  }
}
