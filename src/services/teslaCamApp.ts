import dayjs from 'dayjs';
import { useClipMarking } from '../composables/useClipMarking';
import { syncEvents } from '../composables/useEvents';
import { filterPanelStore } from '../composables/useFilterPanel';
import { mapViewStore } from '../composables/useMapView';
import {
  commandPaletteModalStore,
  driveManagementModalStore,
  driveSetupModalStore,
  helpModalStore,
} from '../composables/useModals';
import { timelineStore } from '../composables/useTimeline';
import { LayoutManager } from '../layout/layoutManager';
import type { DriveInfo, TeslaCamEvent } from '../types';
import { EventFilter } from '../utils/eventFilter';
import weatherService from '../utils/weatherService';
import { B2Client } from './b2Client';
import { EventBrowser } from './eventBrowser';
import { folderManager } from './folderManager';
import { folderParser } from './folderParser';
import { ScreenshotCapture } from './screenshotCapture';
import { settingsManager } from './settingsManager';
import { StatisticsManager } from './statisticsManager';
import { VideoExport } from './videoExport';
import { VideoPlayer } from './videoPlayer';

/**
 * TeslaCamApp - Central application service orchestrating headless engines
 * Replaces the monolithic js/app.js file.
 */
export class TeslaCamApp {
  public eventFilter = new EventFilter();
  public videoPlayer = new VideoPlayer();
  public layoutManager = new LayoutManager();
  public screenshotCapture = new ScreenshotCapture(this.videoPlayer);
  public videoExport = new VideoExport(this.videoPlayer);
  public statisticsManager = new StatisticsManager();
  public b2Client = new B2Client();

  public get mapView() {
    return mapViewStore.instance;
  }
  public set mapView(v: any) {
    mapViewStore.setInstance(v);
  }
  public eventBrowser: any = null;

  public timeline = timelineStore;
  public clipMarking = useClipMarking(() => this.videoPlayer);

  public filterPanel = filterPanelStore;
  public helpModal = helpModalStore;
  public commandPalette = commandPaletteModalStore;
  public telemetryOverlay: any = null;

  public allEvents: TeslaCamEvent[] = [];
  public filteredEvents: TeslaCamEvent[] = [];
  public currentEvent: TeslaCamEvent | null = null;
  public currentEventIndex: number = -1;

  public isMobileFullscreen: boolean = false;
  private _isFrameStepping: boolean = false;
  private _frameStepInterval: any = null;

  constructor() {
    this.initEngines();
    this.wireCallbacks();
    this.applyUserSettings();
    this.applyPerformanceSettings();
    this._registerCommandPaletteCommands();

    // Set global reference for backward compatibility
    if (typeof window !== 'undefined') {
      window.app = this;
      window.dispatchEvent(new CustomEvent('teslacam-ready', { detail: this }));
    }

    this.b2Client.getConfig().then((config: any) => {
      if (config?.isConfigured && config?.isPreloaded) {
        this.loadFromB2();
      }
    });
  }

  public t(key: string, params?: Record<string, any>): string {
    return window.i18n
      ? window.i18n.t(key, params)
      : key.split('.').pop() || '';
  }

  private initEngines(): void {
    const eventListEl = document.getElementById('eventList');
    if (eventListEl) {
      this.eventBrowser = new EventBrowser(
        eventListEl,
        (event: TeslaCamEvent) => this.onEventSelected(event)
      );
      this.eventBrowser.isVueManaged = true;
    }
  }

  private wireCallbacks(): void {
    if (this.videoPlayer) {
      this.videoPlayer.onTimeUpdate = (time: number) => {
        if (!this.timeline?.isDragging) {
          const eventTime = this.getAbsoluteEventTime(time);
          this.timeline?.updateTime(eventTime);
        }
      };

      this.videoPlayer.onEnded = () => {
        if (settingsManager?.get('autoPlayNextEvent')) {
          this.autoPlayNextEvent();
        }
      };

      this.videoPlayer.onPlayStateChange = () => {
        this.updatePlaybackButtons();
      };
    }
  }

  public getAbsoluteEventTime(clipTime?: number): number {
    return this.videoPlayer?.absoluteTime ?? clipTime ?? 0;
  }

  public applyUserSettings(): void {
    if (!settingsManager) return;
    settingsManager.applySettings(this);
  }

  public applyPerformanceSettings(): void {
    if (!settingsManager) return;
    const preload = settingsManager.get('preloadNextClip');
    if (this.videoPlayer) {
      this.videoPlayer.disablePreload = !preload;
    }
  }

  public async tryRestoreLastFolder(): Promise<void> {
    try {
      // 1. Always load all saved drives from IndexedDB
      await folderManager.loadDrives();

      // 2. If no drives are stored yet, check for legacy single folder handle to migrate
      if (folderManager.drives.length === 0 && folderParser?.hasStoredHandle) {
        const hasStored = await folderParser.hasStoredHandle();
        if (hasStored) {
          const handle = await folderParser.getStoredHandle();
          if (handle) {
            await folderManager.migrateFromLegacy(handle);
          }
        }
      }

      // Update UI with loaded drives
      this.updateDriveSelector(folderManager.getDrives());

      // 3. Check if user enabled auto-restoring folders on startup
      if (!settingsManager?.get('rememberLastFolder')) {
        return;
      }

      if (folderManager.drives.length === 0) {
        return;
      }

      this.showLoading('Restoring drives...');

      let restoredAny = false;
      for (const drive of folderManager.drives) {
        if (drive.isArchive || !drive.handle) continue;

        try {
          let permission = 'prompt';
          if (typeof drive.handle.queryPermission === 'function') {
            permission = await drive.handle.queryPermission({ mode: 'read' });
          }
          if (permission === 'granted') {
            folderParser.setDriveContext(drive.id, drive.label, drive.color);
            folderParser.rootHandle = drive.handle;
            const events = await folderParser.parseFolder();
            const cutoff = folderManager.getDateFilterCutoff(drive.dateFilter);
            drive.events = cutoff
              ? events.filter((ev: any) => new Date(ev.timestamp) >= cutoff)
              : events;

            for (const event of drive.events) {
              event.driveId = drive.id;
              event.compoundKey = folderManager.getCompoundKey(
                drive.id,
                event.name
              );
              event.driveLabel = drive.label;
              event.driveColor = drive.color;
            }
            restoredAny = true;
            console.log(
              `[App] Restored ${drive.events.length} events from ${drive.label}`
            );
          }
        } catch (e) {
          console.warn(`[App] Could not restore drive ${drive.label}:`, e);
        }
      }

      if (restoredAny) {
        const firstActive = folderManager.drives.find(
          (d: any) => !d.isArchive && d.events?.length > 0
        );
        if (firstActive) {
          folderManager.setActiveDrive(firstActive.id);
        }
        this.allEvents = folderManager.getAllEvents();
        this.statisticsManager.setEvents(this.allEvents);
        this.applyFilters();
        this.updateDriveSelector(folderManager.getDrives());
        if (this.filteredEvents.length > 0) {
          this.onEventSelected(this.filteredEvents[0]);
        }
      }

      this.hideLoading();
    } catch (e) {
      console.log('[App] Could not restore drives:', e);
      this.hideLoading();
    }
  }

  public async onEventSelected(event: TeslaCamEvent): Promise<void> {
    if (this.currentEvent && this.currentEvent._blobURLs) {
      this.currentEvent._blobURLs.forEach((url: string) =>
        URL.revokeObjectURL(url)
      );
      this.currentEvent._blobURLs = [];
    }

    this.showLoading('Loading event...');

    try {
      this.currentEvent = event;
      this.currentEventIndex = this.allEvents.findIndex(
        (e) => e.name === event.name
      );
      syncEvents();

      this.showLoading('Preparing video URLs...');
      await this.prepareEventURLs(event);
      await this.videoPlayer.loadEvent(event);

      const hasPillars = JSON.stringify(event).includes('_pillar');
      this.layoutManager?.setHasPillarCameras?.(hasPillars);
      this.updatePillarLayoutOptions(hasPillars);

      // Get total duration and initialize timeline
      const totalDuration = await this.videoPlayer.getTotalDuration();
      this.timeline?.setDuration(totalDuration);
      this.timeline?.setClipMarkers(event.clipGroups);

      if (typeof this.timeline?.resetThumbnailTooltip === 'function') {
        this.timeline.resetThumbnailTooltip();
      }

      if (folderParser?.detectGaps) {
        const gaps = folderParser.detectGaps(event.clipGroups);
        if (gaps && gaps.length > 0) {
          this.timeline?.setGapMarkers(gaps, event.clipGroups);
        }
      }

      this.updateEventInfo(event);

      if (typeof this.mapView?.selectEvent === 'function') {
        this.mapView?.selectEvent(event);
      }

      if (this.clipMarking) {
        this.clipMarking.clearMarks();
      }

      this.enableControls();

      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        this.closeSidebar();
      }

      const placeholder = document.getElementById('videoGridPlaceholder');
      if (placeholder) {
        placeholder.classList.add('hidden');
      }

      this.hideLoading();

      const isSentryEvent =
        event.type === 'SentryClips' ||
        event.metadata?.reason?.toLowerCase().includes('sentry');

      if (isSentryEvent) {
        const startTime = Math.max(0, totalDuration - 64);
        await this.videoPlayer.seekToEventTime(startTime);
        const triggerTime = Math.max(0, totalDuration - 60);
        this.timeline?.setSentryTriggerMarker(triggerTime);
      } else {
        this.timeline?.setSentryTriggerMarker(0);
      }

      if (
        settingsManager?.get('autoPlayNextEvent') ||
        this.currentEventIndex > 0
      ) {
        await this.play();
      }
    } catch (error: any) {
      this.hideLoading();
      console.error('Error loading event:', error?.stack || error);
      alert('Unable to load event videos: ' + (error?.message || error));
    }
  }

  public async prepareEventURLs(event: TeslaCamEvent): Promise<void> {
    const cameras = [
      'front',
      'back',
      'left_repeater',
      'right_repeater',
      'left_pillar',
      'right_pillar',
    ];

    let timeoutCount = 0;
    const MAX_TIMEOUTS = 3;

    if (!Array.isArray(event.clipGroups)) return;

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
                clip.duration = await this._probeClipDuration(clip.url);
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

  private async _probeClipDuration(url: string): Promise<number> {
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

  public updateEventInfo(event: TeslaCamEvent): void {
    const dateEl = document.getElementById('eventDate');
    const locEl = document.getElementById('eventLocation');
    const reasonEl = document.getElementById('eventReason');
    const weatherEl = document.getElementById('eventWeather');

    if (dateEl) {
      dateEl.textContent = event.timestamp
        ? dayjs(event.timestamp).format('M/D/YYYY, h:mm:ss A')
        : '';
    }

    if (locEl) {
      const parts = [event.metadata?.street, event.metadata?.city].filter(
        Boolean
      );
      locEl.textContent = parts.join(', ') || '';
    }

    if (reasonEl) {
      reasonEl.textContent = event.metadata?.reason || event.type || '';
    }

    if (weatherEl) {
      this.updateEventWeather(event);
    }
  }

  public async updateEventWeather(event: TeslaCamEvent): Promise<void> {
    const weatherEl = document.getElementById('eventWeather');
    if (!weatherEl) return;

    if (event.metadata?.weather) {
      weatherEl.textContent = `${event.metadata.weather.temp}° ${event.metadata.weather.condition}`;
      return;
    }

    const lat = event.metadata?.est_lat;
    const lon = event.metadata?.est_lon;
    const time = event.timestamp;

    if (lat && lon && time) {
      try {
        const units = settingsManager?.get('temperatureUnits') || 'celsius';
        const weather = await weatherService.getWeather(
          lat,
          lon,
          new Date(time)
        );
        if (weather) {
          weatherEl.textContent = `${weather.temperature}°${units === 'fahrenheit' ? 'F' : 'C'} ${weather.description}`;
        }
      } catch (e) {
        console.warn('[Weather] Could not fetch weather:', e);
      }
    }
  }

  public async onTimelineSeeked(time: number): Promise<void> {
    if (!this.currentEvent || !this.videoPlayer) return;
    await this.videoPlayer.seekToEventTime(time);
  }

  public async play(): Promise<void> {
    if (!this.videoPlayer) return;
    await this.videoPlayer.play();
    this.updatePlaybackButtons();
  }

  public async pause(): Promise<void> {
    if (!this.videoPlayer) return;
    await this.videoPlayer.pause();
    this.updatePlaybackButtons();
  }

  public async togglePlayback(): Promise<void> {
    if (!this.videoPlayer) return;
    if (this.videoPlayer.paused) {
      await this.play();
    } else {
      await this.pause();
    }
  }

  public async previousClip(): Promise<void> {
    if (this.videoPlayer) await this.videoPlayer.previousClip();
  }

  public async nextClip(): Promise<void> {
    if (this.videoPlayer) await this.videoPlayer.nextClip();
  }

  public startFrameStepping(direction: number): void {
    this._isFrameStepping = true;
    this.stepFrame(direction);
    this._frameStepInterval = setInterval(() => {
      if (this._isFrameStepping) this.stepFrame(direction);
    }, 150);
  }

  public stopFrameStepping(): void {
    this._isFrameStepping = false;
    if (this._frameStepInterval) {
      clearInterval(this._frameStepInterval);
      this._frameStepInterval = null;
    }
  }

  public async stepFrame(direction: number): Promise<void> {
    if (this.videoPlayer) await this.videoPlayer.stepFrame(direction);
  }

  public async previousEvent(): Promise<void> {
    if (this.currentEventIndex > 0) {
      const prevEvent = this.allEvents[this.currentEventIndex - 1];
      if (prevEvent) await this.onEventSelected(prevEvent);
    }
  }

  public async nextEvent(): Promise<void> {
    if (
      this.currentEventIndex >= 0 &&
      this.currentEventIndex < this.allEvents.length - 1
    ) {
      const nextEv = this.allEvents[this.currentEventIndex + 1];
      if (nextEv) await this.onEventSelected(nextEv);
    }
  }

  public async autoPlayNextEvent(): Promise<void> {
    if (
      this.currentEventIndex >= 0 &&
      this.currentEventIndex < this.allEvents.length - 1
    ) {
      await this.nextEvent();
      await this.play();
    }
  }

  public markIn(): void {
    if (this.clipMarking) this.clipMarking.setInPoint();
  }

  public markOut(): void {
    if (this.clipMarking) this.clipMarking.setOutPoint();
  }

  public clearMarks(): void {
    if (this.clipMarking) this.clipMarking.clearMarks();
  }

  public async exportVideo(camera: string = 'all'): Promise<void> {
    if (
      camera === 'all' &&
      this.layoutManager?.currentLayout === 'layout-focus'
    ) {
      camera = this.layoutManager.focusCamera || 'front';
    }

    if (!this.currentEvent) {
      alert('Please select an event to export.');
      return;
    }

    const formatSelect = document.getElementById(
      'exportFormatSelect'
    ) as HTMLSelectElement | null;
    const format =
      formatSelect?.value || settingsManager?.get('exportFormat') || 'mp4';
    if (this.videoExport) {
      await this.videoExport.startExport({ camera, format });
    }
  }

  public async captureScreenshot(): Promise<void> {
    if (!this.screenshotCapture || !this.currentEvent) return;
    await this.screenshotCapture.captureComposite(
      this.layoutManager?.currentConfig
    );
  }

  public changeSpeed(direction: number): void {
    const speeds = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '2'];
    const curSpeed = String(this.videoPlayer?.playbackRate || '1');
    const idx = speeds.indexOf(curSpeed);
    const newIdx = Math.max(
      0,
      Math.min(speeds.length - 1, (idx === -1 ? 3 : idx) + direction)
    );
    const newSpeed = parseFloat(speeds[newIdx]);
    if (this.videoPlayer) this.videoPlayer.playbackRate = newSpeed;
  }

  public async changeDrive(driveId: string | null): Promise<void> {
    folderManager.setActiveDrive(driveId || null);

    if (driveId) {
      const drive = folderManager.getDrive(driveId);
      if (
        drive &&
        drive.handle &&
        (!drive.events || drive.events.length === 0)
      ) {
        try {
          let permission = 'prompt';
          if (typeof drive.handle.queryPermission === 'function') {
            permission = await drive.handle.queryPermission({ mode: 'read' });
          }
          if (
            permission !== 'granted' &&
            typeof drive.handle.requestPermission === 'function'
          ) {
            permission = await drive.handle.requestPermission({ mode: 'read' });
          }
          if (permission === 'granted') {
            this.showLoading(`Loading ${drive.label}...`);
            await folderManager.parseSingleDrive(folderParser, driveId);
            this.hideLoading();
          }
        } catch (err) {
          this.hideLoading();
          console.warn(`Failed to access drive ${drive.label}:`, err);
        }
      }
    }

    this.allEvents = folderManager.getAllEvents();
    this.statisticsManager.setEvents(this.allEvents);
    this.applyFilters();
    this.updateDriveSelector(folderManager.getDrives());
    if (
      this.filteredEvents.length > 0 &&
      (!this.currentEvent ||
        !this.filteredEvents.some((e) => e.name === this.currentEvent.name))
    ) {
      this.onEventSelected(this.filteredEvents[0]);
    }
  }

  public applyFilters(): void {
    let eventsToFilter = this.allEvents;
    const activeDriveId = folderManager?.activeDriveId;

    if (activeDriveId) {
      eventsToFilter = this.allEvents.filter(
        (e) => e.driveId === activeDriveId
      );
    }

    const filteredEvents =
      this.eventFilter?.applyFilters(eventsToFilter) || eventsToFilter;
    this.filteredEvents = filteredEvents;
    syncEvents();

    this.eventBrowser?.loadEvents(filteredEvents);
    this.mapView?.loadEvents(filteredEvents);
    this.filterPanel?.updateFilterBadge();
  }

  public async selectFolder(): Promise<void> {
    let handle: any = null;

    while (true) {
      try {
        handle = await window.showDirectoryPicker();
      } catch (error: any) {
        if (error.name !== 'AbortError')
          console.error('Error selecting folder:', error);
        return;
      }

      const settings = await this.showDriveSetupDialog(handle);
      if (!settings) return;
      if (settings.changeFolder) continue;

      this.showLoading('Parsing TeslaCam folder...');

      try {
        const drive = await folderManager.addDrive(handle, {
          label: settings.label,
          isArchive: settings.isArchive,
          dateFilter: settings.dateFilter,
        });

        if (settings.isArchive) {
          this.hideLoading();
          this.updateDriveSelector(folderManager.getDrives());
          return;
        }

        folderParser.setDriveContext(drive.id, drive.label, drive.color);
        folderParser.rootHandle = handle;
        const events = await folderParser.parseFolder();

        drive.events = events;
        folderManager.setActiveDrive(drive.id);
        this.allEvents = folderManager.getAllEvents();
        this.statisticsManager.setEvents(this.allEvents);
        this.applyFilters();
        this.updateDriveSelector(folderManager.getDrives());
        if (this.filteredEvents.length > 0) {
          this.onEventSelected(this.filteredEvents[0]);
        }

        if (settingsManager?.get('rememberLastFolder')) {
          await folderParser.saveFolderHandle();
        }

        this.hideLoading();
      } catch (error) {
        this.hideLoading();
        console.error('Error parsing folder:', error);
        alert('Unable to read TeslaCam folder.');
      }
      break;
    }
  }

  public async loadFromB2(forceRefresh: boolean = false): Promise<void> {
    this.showLoading(
      forceRefresh
        ? 'Refreshing Backblaze B2...'
        : 'Connecting to Backblaze B2...'
    );
    try {
      const result = await this.b2Client.parseBucket(
        undefined,
        undefined,
        undefined,
        forceRefresh
      );
      if (!result?.events) throw new Error('No events found in B2 bucket');

      const events = result.events;
      const b2Drive = await folderManager.addOrUpdateB2Drive(events);

      folderManager.activeDriveId = b2Drive.id;
      this.allEvents = folderManager.getAllEvents();
      this.statisticsManager.setEvents(this.allEvents);
      this.applyFilters();
      this.updateDriveSelector(folderManager.getDrives());
      if (this.filteredEvents.length > 0) {
        this.onEventSelected(this.filteredEvents[0]);
      }
      this.hideLoading();
    } catch (error: any) {
      console.error('B2 Load Error:', error);
      this.hideLoading();
      alert('Failed to load from Backblaze B2: ' + error.message);
    }
  }

  public async refreshDrives(): Promise<void> {
    const activeDrive = folderManager?.getActiveDrive();
    if (folderManager.isB2Drive(activeDrive?.id) || (!activeDrive && this.b2Client)) {
      await this.loadFromB2(true);
      return;
    }

    if (activeDrive?.handle) {
      this.showLoading(`Refreshing ${activeDrive.label || 'drive'}...`);
      try {
        folderParser.setDriveContext(
          activeDrive.id,
          activeDrive.label,
          activeDrive.color
        );
        folderParser.rootHandle = activeDrive.handle;
        const events = await folderParser.parseFolder();
        activeDrive.events = events;
        this.allEvents = [
          ...this.allEvents.filter((e) => e.driveId !== activeDrive.id),
          ...events,
        ];
        this.statisticsManager.setEvents(this.allEvents);
        this.applyFilters();
        this.updateDriveSelector(folderManager.getDrives());
      } catch (err: any) {
        console.error('Error refreshing drive:', err);
      } finally {
        this.hideLoading();
      }
      return;
    }

    const config = await this.b2Client?.getConfig();
    if (config?.isConfigured) {
      await this.loadFromB2(true);
    }
  }

  public async addNewDrive(): Promise<void> {
    let handle: any = null;
    while (true) {
      try {
        handle = await window.showDirectoryPicker();
      } catch (error: any) {
        if (error.name !== 'AbortError')
          console.error('Error selecting folder:', error);
        return;
      }

      const settings = await this.showDriveSetupDialog(handle);
      if (!settings) return;
      if (settings.changeFolder) continue;

      this.showLoading('Adding drive...');
      try {
        const drive = await folderManager.addDrive(handle, {
          label: settings.label,
          isArchive: settings.isArchive,
          dateFilter: settings.dateFilter,
        });

        if (!settings.isArchive) {
          folderParser.setDriveContext(drive.id, drive.label, drive.color);
          folderParser.rootHandle = handle;
          const events = await folderParser.parseFolder();
          drive.events = events;
          this.allEvents = [...this.allEvents, ...events];
          this.statisticsManager.setEvents(this.allEvents);
          this.applyFilters();
        }

        this.updateDriveSelector(folderManager.getDrives());
        this.hideLoading();
      } catch (e) {
        this.hideLoading();
        console.error('Error adding drive:', e);
      }
      break;
    }
  }

  public async syncArchiveDrive(driveId: string): Promise<void> {
    const drive = folderManager.getDrive(driveId);
    if (!drive) return;

    this.showLoading(`Loading ${drive.label}...`);
    try {
      folderParser.setDriveContext(drive.id, drive.label, drive.color);
      folderParser.rootHandle = drive.handle;
      const events = await folderParser.parseFolder();
      drive.events = events;
      this.allEvents = [
        ...this.allEvents.filter((e) => e.driveId !== driveId),
        ...events,
      ];
      this.statisticsManager.setEvents(this.allEvents);
      this.applyFilters();
      this.updateDriveSelector(folderManager.getDrives());
      this.hideLoading();
    } catch (e) {
      this.hideLoading();
      console.error('Error syncing archive drive:', e);
    }
  }

  public async reloadDriveEvents(
    driveId: string,
    settings: any
  ): Promise<void> {
    const drive = folderManager.getDrive(driveId);
    if (!drive) return;

    this.showLoading(`Reloading ${drive.label}...`);
    try {
      if (drive.handle && !settings.isArchive) {
        folderParser.setDriveContext(drive.id, drive.label, drive.color);
        folderParser.rootHandle = drive.handle;
        const events = await folderParser.parseFolder();
        drive.events = events;
        this.allEvents = [
          ...this.allEvents.filter((e) => e.driveId !== driveId),
          ...events,
        ];
        this.statisticsManager.setEvents(this.allEvents);
        this.applyFilters();
      }
      this.updateDriveSelector(folderManager.getDrives());
      this.hideLoading();
    } catch (e) {
      this.hideLoading();
      console.error('Error reloading drive:', e);
    }
  }

  public async showDriveSetupDialog(
    handle: any,
    existingDrive: any = null
  ): Promise<any> {
    return await driveSetupModalStore.promptSetup(handle, existingDrive);
  }

  public showDriveManagementModal(): void {
    driveManagementModalStore.open();
  }

  public showLoading(message: string = 'Loading...'): void {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    if (overlay) overlay.classList.remove('hidden');
    if (text) text.textContent = message;
  }

  public hideLoading(): void {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  public showToast(
    message: string,
    kind: string = 'info',
    durationMs: number = 5000
  ): void {
    const toast = document.createElement('div');
    toast.className = `app-toast toast-${kind}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), durationMs);
  }

  public showSimpleToast(message: string, duration: number = 3000): void {
    this.showToast(message, 'info', duration);
  }

  public updateDriveSelector(drives: DriveInfo[]): void {
    const selector = document.getElementById(
      'driveSelect'
    ) as HTMLSelectElement | null;
    if (selector && Array.isArray(drives)) {
      // Re-populate options if needed
    }
  }

  public updatePlaybackButtons(): void {
    const isPlaying = this.videoPlayer ? !this.videoPlayer.paused : false;
    const btn = document.getElementById('playPauseBtn');
    if (btn) {
      const playIcon = btn.querySelector('.play-icon') as HTMLElement | null;
      const pauseIcon = btn.querySelector('.pause-icon') as HTMLElement | null;
      if (playIcon) playIcon.style.display = isPlaying ? 'none' : '';
      if (pauseIcon) pauseIcon.style.display = isPlaying ? '' : 'none';
    }
  }

  public enableControls(): void {
    const btns = document.querySelectorAll('.control-btn:disabled');
    btns.forEach((b) => ((b as HTMLButtonElement).disabled = false));
  }

  public disableControls(): void {
    const btns = document.querySelectorAll('.control-btn');
    btns.forEach((b) => ((b as HTMLButtonElement).disabled = true));
  }

  public toggleSidebar(): void {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  }

  public openSidebar(): void {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('open');
  }

  public closeSidebar(): void {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  public toggleCameraVisibility(cam: string): void {
    if (this.layoutManager) {
      const current = this.layoutManager.getCameraVisibility(cam);
      this.layoutManager.setCameraVisibility(cam, !current);
    }
  }

  public showCamera(cam: string): void {
    if (this.layoutManager) {
      this.layoutManager.setCameraVisibility(cam, true);
    }
  }

  public updatePillarLayoutOptions(hasPillars: boolean): void {
    const pillarLayoutOptions = document.querySelectorAll(
      '.pillar-layout-option'
    );
    pillarLayoutOptions.forEach((opt) => {
      (opt as HTMLElement).style.display = hasPillars ? '' : 'none';
    });

    const pillarCameraOptions = document.querySelectorAll('.pillar-option');
    pillarCameraOptions.forEach((opt) => {
      (opt as HTMLElement).style.display = hasPillars ? '' : 'none';
    });
  }

  public async togglePictureInPicture(): Promise<void> {
    try {
      const front = document.getElementById(
        'videoFront'
      ) as HTMLVideoElement | null;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (front && document.pictureInPictureEnabled) {
        await front.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP failed:', e);
    }
  }

  private _registerCommandPaletteCommands(): void {
    const cp = this.commandPalette;

    cp?.registerMany([
      {
        id: 'play-pause',
        title: 'Play / Pause',
        category: 'Playback',
        shortcut: 'Space',
        action: () => this.togglePlayback(),
      },
      {
        id: 'next-clip',
        title: 'Next Clip',
        category: 'Playback',
        shortcut: 'Shift + →',
        action: () => this.nextClip(),
      },
      {
        id: 'prev-clip',
        title: 'Previous Clip',
        category: 'Playback',
        shortcut: 'Shift + ←',
        action: () => this.previousClip(),
      },
      {
        id: 'next-event',
        title: 'Next Event',
        category: 'Navigation',
        shortcut: 'Page Down',
        action: () => this.nextEvent(),
      },
      {
        id: 'prev-event',
        title: 'Previous Event',
        category: 'Navigation',
        shortcut: 'Page Up',
        action: () => this.previousEvent(),
      },
      {
        id: 'mark-in',
        title: 'Mark IN Point',
        category: 'Editing',
        shortcut: 'I',
        action: () => this.markIn(),
      },
      {
        id: 'mark-out',
        title: 'Mark OUT Point',
        category: 'Editing',
        shortcut: 'O',
        action: () => this.markOut(),
      },
      {
        id: 'clear-marks',
        title: 'Clear Marks',
        category: 'Editing',
        shortcut: 'Esc',
        action: () => this.clearMarks(),
      },
      {
        id: 'screenshot',
        title: 'Capture Screenshot',
        category: 'Capture',
        shortcut: 'S',
        action: () => this.captureScreenshot(),
      },
      {
        id: 'export',
        title: 'Export Video',
        category: 'Capture',
        shortcut: 'E',
        action: () => this.exportVideo(),
      },
      {
        id: 'settings',
        title: 'Open Settings',
        category: 'General',
        shortcut: 'Q',
        action: () => settingsManager?.showSettingsModal(),
      },
      {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        category: 'Help',
        shortcut: '?',
        action: () => this.helpModal?.show(),
      },
    ]);
  }
}
