/**
 * Main Application Controller
 * Build: NMC-2024
 */

class TeslaCamViewerApp {
  constructor() {
    // Initialize components - tcv.0x4E4D43
    this.folderParser = new FolderParser();
    this.folderManager = new FolderManager();

    // Filter and map components
    this.eventFilter = new EventFilter();
    this.filterPanel = new FilterPanel(
      document.getElementById('filterPanel'),
      this.eventFilter,
      () => this.applyFilters()
    );
    this.mapView = new MapView(document.getElementById('map'), (event) =>
      this.onEventSelected(event)
    );

    this.eventBrowser = new EventBrowser(
      document.getElementById('eventList'),
      (event) => this.onEventSelected(event)
    );
    this.videoPlayer = new VideoPlayer();

    // Connect eventBrowser to videoPlayer for preview pause/resume
    this.eventBrowser.setVideoPlayer(this.videoPlayer);
    this.timeline = new Timeline(
      document.getElementById('timeline'),
      (time) => this.onTimelineSeeked(time),
      () => this.eventBrowser.refreshBookmarkIndicators()
    );
    this.syncController = new SyncController(this.videoPlayer);
    this.layoutManager = new LayoutManager();
    this.layoutEditor = new LayoutEditor(this.layoutManager);
    this.screenshotCapture = new ScreenshotCapture(this.videoPlayer);
    this.videoEnhancer = new VideoEnhancer();
    this.miniMapOverlay = new MiniMapOverlay(this.videoPlayer);
    this.miniMapOverlay.initLayoutCallback &&
      this.miniMapOverlay.initLayoutCallback(this.layoutManager);

    this.streetViewOverlay = new StreetViewOverlay(this.videoPlayer);

    // Wire up visibility change callbacks for overlays
    this.miniMapOverlay.onVisibilityChange = (visible) => {
      this.settingsManager.set('miniMapEnabled', visible);
      this._updateOverlayButtonStates();
    };
    this.streetViewOverlay.onVisibilityChange = (visible) => {
      this.settingsManager.set('streetViewEnabled', visible);
      this._updateOverlayButtonStates();
    };

    this.videoExport = new VideoExport(this.videoPlayer, this.layoutManager);
    this.clipMarking = new ClipMarking(this.timeline, this.videoPlayer);

    // Settings, Help, Quick Start, Version, Statistics
    this.settingsManager = new SettingsManager();
    this.sessionManager = new SessionManager();
    this.versionManager = new VersionManager();
    this.statisticsManager = new StatisticsManager();
    this.helpModal = new HelpModal();
    this.quickStartGuide = new QuickStartGuide();
    this.b2Client = new B2Client();

    // Command palette (Ctrl+K / Cmd+K) — searchable action launcher.
    if (window.CommandPalette) {
      this.commandPalette = new window.CommandPalette(this);
      this._registerCommandPaletteCommands();
      this.commandPalette.setupGlobalShortcut();
    }

    // File system observer — auto-refresh event list when drive contents
    // change. Feature-detects; no-ops on browsers without the API.
    if (window.FileSystemObserverManager) {
      this.fsObserver = new window.FileSystemObserverManager();
      this.fsObserver.onChange = (driveId) =>
        this._onDriveContentsChanged(driveId);
    }

    // Drive sync
    this.driveSync = new DriveSync(this.folderManager);
    this.driveSyncUI = new DriveSyncUI(this.driveSync, this.folderManager);

    // Link settings to versionManager
    this.versionManager.setShowWhatsNew(
      this.settingsManager.get('showWhatsNew')
    );
    this.settingsManager.onChange((settings) => {
      if (this.versionManager) {
        this.versionManager.setShowWhatsNew(settings.showWhatsNew);
      }
    });

    // Settings, Help, Stats, Session buttons
    this.settingsBtn = document.getElementById('settingsBtn');
    this.helpBtn = document.getElementById('helpBtn');
    this.statsBtn = document.getElementById('statsBtn');

    // UI elements
    this.selectFolderBtn = document.getElementById('selectFolderBtn');
    this.loadB2Btn = document.getElementById('loadB2Btn');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.frameBackBtn = document.getElementById('frameBackBtn');
    this.frameForwardBtn = document.getElementById('frameForwardBtn');
    this.prevClipBtn = document.getElementById('prevClipBtn');
    this.nextClipBtn = document.getElementById('nextClipBtn');
    this.prevEventBtn = document.getElementById('prevEventBtn');
    this.nextEventBtn = document.getElementById('nextEventBtn');
    this.screenshotBtn = document.getElementById('screenshotBtn');
    this.pipBtn = document.getElementById('pipBtn');
    this.enhanceBtn = document.getElementById('enhanceBtn');
    this.markInBtn = document.getElementById('markInBtn');
    this.markOutBtn = document.getElementById('markOutBtn');
    this.clearMarksBtn = document.getElementById('clearMarksBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.exportDropdownBtn = document.getElementById('exportDropdownBtn');
    this.exportDropdown = document.getElementById('exportDropdown');
    this.prevBookmarkBtn = document.getElementById('prevBookmarkBtn');
    this.addBookmarkBtn = document.getElementById('addBookmarkBtn');
    this.nextBookmarkBtn = document.getElementById('nextBookmarkBtn');
    this.bookmarksListBtn = document.getElementById('bookmarksListBtn');
    this.bookmarksDropdown = document.getElementById('bookmarksDropdown');
    this.bookmarksList = document.getElementById('bookmarksList');
    this.clearAllBookmarksBtn = document.getElementById('clearAllBookmarksBtn');
    this.zoomOutBtn = document.getElementById('zoomOutBtn');
    this.zoomInBtn = document.getElementById('zoomInBtn');
    this.zoomResetBtn = document.getElementById('zoomResetBtn');
    this.speedSelect = document.getElementById('speedSelect');
    this.loopCheckbox = document.getElementById('loopCheckbox');
    this.loopBtn = document.getElementById('loopBtn');
    this.layoutSelect = document.getElementById('layoutSelect');
    this.focusCameraSelect = document.getElementById('focusCameraSelect');

    // Overlay toggle buttons
    this.toggleMiniMapBtn = document.getElementById('toggleMiniMapBtn');
    this.toggleStreetViewBtn = document.getElementById('toggleStreetViewBtn');
    this.toggleBirdsEyeBtn = document.getElementById('toggleBirdsEyeBtn');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');

    // Mobile menu elements
    this.menuToggleBtn = document.getElementById('menuToggleBtn');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarOverlay = document.getElementById('sidebarOverlay');

    // Mobile more menu elements
    this.mobileMoreBtn = document.getElementById('mobileMoreBtn');
    this.mobileMoreMenu = document.getElementById('mobileMoreMenu');
    this.mobileMiniMapStatus = document.getElementById('mobileMiniMapStatus');
    this.mobileLayoutSelect = document.getElementById('mobileLayoutSelect');
    this.bsMoreBtn = document.getElementById('bsMoreBtn');
    this.bsMoreContainer = document.querySelector('.bs-more-container');

    // Drive selector elements (multi-drive support)
    this.driveSelector = document.getElementById('driveSelector');
    this.driveSelect = document.getElementById('driveSelect');
    this.addDriveBtn = document.getElementById('addDriveBtn');
    this.manageDrivesBtn = document.getElementById('manageDrivesBtn');
    this.syncDrivesBtn = document.getElementById('syncDrivesBtn');

    // Mobile fullscreen elements
    this.mobileFullscreenBtn = document.getElementById('mobileFullscreenBtn');
    this.mobileFullscreenOverlay = document.getElementById(
      'mobileFullscreenOverlay'
    );
    this.fullscreenPlayBtn = document.getElementById('fullscreenPlayBtn');
    this.exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    this.isMobileFullscreen = false;
    this.fullscreenControlsTimeout = null;

    // Track current event index for navigation
    this.currentEventIndex = -1;
    this.allEvents = [];

    // Frame stepping state
    this.frameStepInterval = null;
    this.frameStepRate = 100; // ms between steps when holding

    // Event info elements
    this.eventDateElement = document.getElementById('eventDate');
    this.eventLocationElement = document.getElementById('eventLocation');
    this.eventReasonElement = document.getElementById('eventReason');
    this.eventWeatherElement = document.getElementById('eventWeather');
    this.streetViewBtn = document.getElementById('streetViewBtn');

    // Current GPS for Street View
    this.currentGpsLat = null;
    this.currentGpsLng = null;
    this.currentGpsHeading = 0;

    // State
    this.currentEvent = null;
    this.updateTimelineInterval = null;

    this.setupEventListeners();
    this.checkBrowserSupport();

    // Set layout select to match saved preference
    this.layoutSelect.value = this.layoutManager.getCurrentLayout();

    // Apply user settings
    this.applyUserSettings();

    // Try to restore last folder if setting is enabled
    this.tryRestoreLastFolder();

    // Show quick start guide on first run
    this.quickStartGuide.showIfFirstRun();

    // Initialize version display
    this.versionManager.initVersionDisplay();
  }

  /**
   * Try to restore drives from IndexedDB if setting is enabled
   */
  async tryRestoreLastFolder() {
    if (!this.settingsManager.get('rememberLastFolder')) {
      return;
    }

    this.showLoading('Restoring saved drives...');

    try {
      // Load saved drives from IndexedDB
      await this.folderManager.loadDrives();
      const drives = this.folderManager.getDrives();

      if (drives.length === 0) {
        // Try legacy single-folder restore
        const restored = await this.folderParser.loadSavedFolder();
        if (restored) {
          this.loadingText.textContent = 'Migrating to new drive system...';
          const drive = await this.folderManager.addDrive(
            this.folderParser.rootHandle
          );
          this.folderParser.setDriveContext(drive.id, drive.label, drive.color);
          this.folderParser.setProgressCallback((message, count) => {
            this.loadingText.textContent = `Migrating: ${message} (${count} events)`;
          });
          const events = await this.folderParser.parseFolder();
          this.folderParser.setProgressCallback(null);
          drive.events = events;
          this.allEvents = events;
          this.statisticsManager.setEvents(events);
          await this.registerEventsAndLoadBackups(events);
          this.applyFilters();
          this.updateDriveSelector(this.folderManager.getDrives());
          this._syncFileSystemObservers(this.folderManager.getDrives());
          this.selectFolderBtn.classList.add('hidden');
          this.loadB2Btn?.classList.add('hidden');
          console.log(`Migrated ${events.length} events to new drive system`);
        }
        this.hideLoading();
        return;
      }

      // Restore each drive - request permissions and parse
      let allEvents = [];
      let successCount = 0;

      for (const drive of drives) {
        if (!drive.handle) {
          console.warn(`Drive ${drive.label} has no handle, skipping`);
          continue;
        }

        // Skip archive drives on startup
        if (drive.isArchive) {
          console.log(`Skipping archive drive: ${drive.label}`);
          continue;
        }

        this.loadingText.textContent = `Restoring ${drive.label}...`;

        try {
          // Request permission for the stored handle
          const permission = await drive.handle.requestPermission({
            mode: 'read',
          });
          if (permission !== 'granted') {
            console.warn(`Permission denied for ${drive.label}`);
            continue;
          }

          // Parse events from this drive
          this.folderParser.setDriveContext(drive.id, drive.label, drive.color);
          this.folderParser.rootHandle = drive.handle;
          this.folderParser.setProgressCallback((message, count) => {
            this.loadingText.textContent = `${drive.label}: ${message} (${count} events)`;
          });
          let events = await this.folderParser.parseFolder();
          this.folderParser.setProgressCallback(null);

          // Apply date filter if set
          const cutoff = this.folderManager.getDateFilterCutoff(
            drive.dateFilter
          );
          if (cutoff) {
            const beforeCount = events.length;
            events = events.filter(
              (event) => new Date(event.timestamp) >= cutoff
            );
            console.log(
              `Date filter (${drive.dateFilter}): ${beforeCount} → ${events.length} events`
            );
          }

          drive.events = events;
          allEvents = allEvents.concat(events);
          successCount++;
          console.log(`Restored ${events.length} events from ${drive.label}`);
        } catch (error) {
          console.warn(`Failed to restore drive ${drive.label}:`, error);
        }
      }

      if (successCount > 0) {
        this.allEvents = allEvents;
        this.statisticsManager.setEvents(allEvents);
        await this.registerEventsAndLoadBackups(allEvents);
        this.applyFilters();
        this.updateDriveSelector(this.folderManager.getDrives());
        // IndexedDB drive restore bypasses onDrivesChanged, so the
        // file-system observer never gets attached on page reload
        // unless we do it explicitly here.
        this._syncFileSystemObservers(this.folderManager.getDrives());
        this.selectFolderBtn.classList.add('hidden');
        this.loadB2Btn?.classList.add('hidden');
        console.log(
          `Restored ${allEvents.length} total events from ${successCount} drives`
        );

        // Show diagnostic notification if there were issues
        this.showParseDiagnostics();
      }
    } catch (error) {
      console.warn('Failed to restore drives:', error);
    }

    this.hideLoading();
  }

  /**
   * Apply user settings from settings manager
   */
  applyUserSettings() {
    // Apply default speed
    const defaultSpeed = this.settingsManager.get('defaultSpeed');
    if (defaultSpeed) {
      this.speedSelect.value = defaultSpeed;
    }

    // Apply default layout
    const defaultLayout = this.settingsManager.get('defaultLayout');
    if (defaultLayout) {
      this.layoutManager.setLayout(defaultLayout);
      this.layoutSelect.value = defaultLayout;
    }

    // Apply loop setting
    const loopByDefault = this.settingsManager.get('loopByDefault');
    if (loopByDefault) {
      this.loopCheckbox.checked = true;
    }

    // Apply timeline zoom setting
    const enableTimelineZoom = this.settingsManager.get('enableTimelineZoom');
    this.timeline.setZoomEnabled(enableTimelineZoom);

    // Apply performance settings
    this.applyPerformanceSettings();

    // Apply accessibility settings on load
    this.settingsManager.applyAccessibilitySettings();

    // Listen for settings changes
    this.settingsManager.onChange(async (settings) => {
      console.log('Settings changed:', settings);
      // Re-apply settings
      this.timeline.setZoomEnabled(settings.enableTimelineZoom);
      this.applyPerformanceSettings();

      // Handle rememberLastFolder toggle
      if (settings.rememberLastFolder && this.folderParser.rootHandle) {
        // Setting enabled and we have a folder - save it
        await this.folderParser.saveFolderHandle();
      } else if (!settings.rememberLastFolder) {
        // Setting disabled - clear saved folder
        await this.folderParser.clearSavedFolder();
      }

      // Apply mini-map settings
      if (this.miniMapOverlay) {
        // Only toggle if state needs to change (avoid infinite loop with onVisibilityChange)
        if (settings.miniMapEnabled && !this.miniMapOverlay.isVisible) {
          this.miniMapOverlay.show();
        } else if (!settings.miniMapEnabled && this.miniMapOverlay.isVisible) {
          this.miniMapOverlay.hide();
        }
        // Apply dark mode setting
        this.miniMapOverlay.setDarkMode(settings.miniMapDarkMode);
      }
    });
  }

  /**
   * Apply performance settings to video player
   */
  applyPerformanceSettings() {
    const preloadNextClip = this.settingsManager.get('preloadNextClip');
    const memoryOptimization = this.settingsManager.get('memoryOptimization');

    // Store settings for use during playback
    this.performanceSettings = {
      preloadNextClip,
      memoryOptimization,
    };

    // Log active settings
    console.log('Performance settings applied:', this.performanceSettings);
  }

  /**
   * Check browser support for required APIs.
   *
   * showDirectoryPicker is gated on a secure context. Chrome makes it
   * `undefined` on insecure origins (http://<lan-ip>, file://) even
   * on browsers that fully support it on HTTPS or localhost. Without
   * differentiating, a user testing the dev build over their LAN gets
   * a misleading "browser doesn't support it" alert when the browser
   * is fine and the URL is the problem.
   */
  checkBrowserSupport() {
    if ('showDirectoryPicker' in window) return;

    if (!window.isSecureContext) {
      alert(
        'The File System Access API is disabled on insecure URLs.\n\n' +
          "You're currently on:\n  " +
          window.location.origin +
          '\n\n' +
          'To select a drive, open one of:\n' +
          '  • https://teslacamviewer.com\n' +
          '  • http://localhost (or http://127.0.0.1)\n' +
          '  • An HTTPS URL'
      );
      return;
    }

    alert(
      'Your browser does not support the File System Access API.\n\n' +
        'Please use Chrome, Edge, or another Chromium-based browser.'
    );
  }

  /**
   * Setup UI event listeners
   */
  setupEventListeners() {
    // Folder selection
    this.selectFolderBtn.addEventListener('click', () => this.selectFolder());
    this.loadB2Btn?.addEventListener('click', () => this.loadFromB2());

    // Sync language selectors when locale changes
    window.addEventListener('localeChanged', (e) => {
      const locale = e.detail.locale;
      // Sync settings language selector (if modal exists)
      const settingsSelect = document.getElementById('setting-language');
      if (settingsSelect) {
        settingsSelect.value = locale;
      }
      // Sync quickstart language selector (if modal exists)
      const quickstartSelect = document.getElementById('quickstartLanguage');
      if (quickstartSelect) {
        quickstartSelect.value = locale;
      }
    });

    // Playback controls - combined play/pause toggle
    this.playPauseBtn.addEventListener('click', () => this.togglePlayback());

    // Frame stepping - single click or hold
    this.frameBackBtn.addEventListener('mousedown', () =>
      this.startFrameStepping(-1)
    );
    this.frameBackBtn.addEventListener('mouseup', () =>
      this.stopFrameStepping()
    );
    this.frameBackBtn.addEventListener('mouseleave', () =>
      this.stopFrameStepping()
    );
    this.frameBackBtn.addEventListener('touchstart', () =>
      this.startFrameStepping(-1)
    );
    this.frameBackBtn.addEventListener('touchend', () =>
      this.stopFrameStepping()
    );

    this.frameForwardBtn.addEventListener('mousedown', () =>
      this.startFrameStepping(1)
    );
    this.frameForwardBtn.addEventListener('mouseup', () =>
      this.stopFrameStepping()
    );
    this.frameForwardBtn.addEventListener('mouseleave', () =>
      this.stopFrameStepping()
    );
    this.frameForwardBtn.addEventListener('touchstart', () =>
      this.startFrameStepping(1)
    );
    this.frameForwardBtn.addEventListener('touchend', () =>
      this.stopFrameStepping()
    );

    this.prevClipBtn.addEventListener('click', () => this.previousClip());
    this.nextClipBtn.addEventListener('click', () => this.nextClip());

    // Event navigation
    this.prevEventBtn.addEventListener('click', () => this.previousEvent());
    this.nextEventBtn.addEventListener('click', () => this.nextEvent());

    // Screenshot capture
    this.screenshotBtn.addEventListener('click', () =>
      this.captureScreenshot()
    );

    // Picture-in-Picture
    this.pipBtn.addEventListener('click', () => this.togglePictureInPicture());

    // Video Enhancement
    this.enhanceBtn.addEventListener('click', () =>
      this.videoEnhancer.toggle()
    );
    // Initialize enhancement controls in video grid container
    const videoGridContainer = document.querySelector('.video-grid-container');
    if (videoGridContainer) {
      this.videoEnhancer.initialize(videoGridContainer);
    }

    // Overlay toggle buttons
    this.toggleMiniMapBtn?.addEventListener('click', () => {
      if (this.miniMapOverlay) {
        this.miniMapOverlay.toggle();
        this._updateOverlayButtonStates();
      }
    });
    this.toggleStreetViewBtn?.addEventListener('click', () => {
      if (this.streetViewOverlay) {
        this.streetViewOverlay.toggle();
        this.settingsManager.set(
          'streetViewEnabled',
          this.streetViewOverlay.isVisible
        );
        this._updateOverlayButtonStates();
      }
    });

    // Street View button in info bar
    if (this.streetViewBtn) {
      this._setupStreetViewButton();
    }

    // Clip marking
    this.markInBtn.addEventListener('click', () => this.markIn());
    this.markOutBtn.addEventListener('click', () => this.markOut());
    this.clearMarksBtn.addEventListener('click', () => this.clearMarks());

    // Export
    this.exportBtn.addEventListener('click', () => this.exportVideo());

    // Export dropdown
    this.exportDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleExportDropdown();
    });

    // Privacy mode checkbox - syncs with settings
    const privacyModeCheckbox = document.getElementById('privacyModeCheckbox');
    if (privacyModeCheckbox) {
      // Initialize from settings
      privacyModeCheckbox.checked =
        this.settingsManager.get('privacyModeExport') === true;

      // Update settings when checkbox changes
      privacyModeCheckbox.addEventListener('change', (e) => {
        e.stopPropagation();
        this.settingsManager.set('privacyModeExport', e.target.checked);
        console.log(
          'Privacy mode export:',
          e.target.checked ? 'enabled' : 'disabled'
        );
      });
    }

    // Export format dropdown - syncs with settings
    const exportFormatSelect = document.getElementById('exportFormatSelect');
    const gifWarning = document.getElementById('gifWarning');
    if (exportFormatSelect) {
      // Initialize from settings
      const savedFormat = this.settingsManager.get('exportFormat') || 'mp4';
      exportFormatSelect.value = savedFormat;

      // Show/hide GIF warning based on initial format
      if (gifWarning) {
        gifWarning.classList.toggle('hidden', savedFormat !== 'gif');
      }

      // Update settings when format changes
      exportFormatSelect.addEventListener('change', (e) => {
        e.stopPropagation();
        this.settingsManager.set('exportFormat', e.target.value);
        console.log('Export format:', e.target.value);

        // Show/hide GIF warning
        if (gifWarning) {
          gifWarning.classList.toggle('hidden', e.target.value !== 'gif');
        }
      });

      // Keep toolbar controls in sync when export settings change elsewhere (e.g. Settings modal)
      this.settingsManager.onChange((settings) => {
        if (exportFormatSelect.value !== settings.exportFormat) {
          exportFormatSelect.value = settings.exportFormat;
          if (gifWarning) {
            gifWarning.classList.toggle(
              'hidden',
              settings.exportFormat !== 'gif'
            );
          }
        }
        if (
          privacyModeCheckbox &&
          privacyModeCheckbox.checked !== (settings.privacyModeExport === true)
        ) {
          privacyModeCheckbox.checked = settings.privacyModeExport === true;
        }
        if (
          blurPlatesExportCheckbox &&
          blurPlatesExportCheckbox.checked !==
            (settings.blurLicensePlates === true)
        ) {
          blurPlatesExportCheckbox.checked =
            settings.blurLicensePlates === true;
        }
      });

      // Prevent clicks on video group from closing dropdown
      const videoGroup = exportFormatSelect.closest('.export-video-group');
      if (videoGroup) {
        videoGroup.addEventListener('click', (e) => {
          // Only stop propagation for format select, not the button
          if (
            e.target === exportFormatSelect ||
            e.target.closest('.export-format-select')
          ) {
            e.stopPropagation();
          }
        });
      }
    }

    // Export action buttons (Screenshot, Export Video, Insurance Report)
    this.exportDropdown
      .querySelectorAll('.export-action-btn')
      .forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.exportDropdown.classList.add('hidden');

          // Check if it's a screenshot action or video export
          const action = btn.dataset.action;
          if (action === 'screenshot') {
            this.captureScreenshot();
          } else {
            const camera = btn.dataset.camera;
            this.exportVideo(camera);
          }
        });
      });

    // Prevent checkbox options from closing dropdown.
    // The option is a <label> wrapping the checkbox, so the browser natively
    // toggles the checkbox on click — don't toggle manually or it double-fires.
    this.exportDropdown
      .querySelectorAll('.export-checkbox-option')
      .forEach((option) => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      });

    // Bookmark buttons
    this.prevBookmarkBtn.addEventListener('click', () =>
      this.jumpToPreviousBookmark()
    );
    this.addBookmarkBtn.addEventListener('click', () => this.addBookmark());
    this.nextBookmarkBtn.addEventListener('click', () =>
      this.jumpToNextBookmark()
    );

    // Bookmarks dropdown
    this.bookmarksListBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleBookmarksDropdown();
    });
    this.clearAllBookmarksBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearAllBookmarks();
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      // Close bookmarks dropdown
      if (
        !this.bookmarksDropdown.classList.contains('hidden') &&
        !this.bookmarksDropdown.contains(e.target) &&
        e.target !== this.bookmarksListBtn
      ) {
        this.bookmarksDropdown.classList.add('hidden');
      }
      // Close export dropdown
      if (
        !this.exportDropdown.classList.contains('hidden') &&
        !this.exportDropdown.contains(e.target) &&
        e.target !== this.exportDropdownBtn
      ) {
        this.exportDropdown.classList.add('hidden');
      }
    });

    // Zoom buttons
    this.zoomOutBtn.addEventListener('click', () => this.timeline.zoomOut());
    this.zoomInBtn.addEventListener('click', () => this.timeline.zoomIn());
    this.zoomResetBtn.addEventListener('click', () =>
      this.timeline.resetZoom()
    );

    // Mobile menu toggle
    this.menuToggleBtn.addEventListener('click', () => this.toggleSidebar());
    this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());

    // Mobile more menu (controls area)
    this.mobileMoreBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      // Move menu to controls container if needed
      if (this.mobileMoreMenu && this.mobileMoreBtn.parentElement) {
        this.mobileMoreBtn.parentElement.appendChild(this.mobileMoreMenu);
      }
      this.mobileMoreMenu?.classList.toggle('hidden');
      this._updateMobileMoreMenuStatus();
    });

    // Bottom sheet more button (use event delegation for reliability)
    document.addEventListener('click', (e) => {
      const bsMoreBtn = e.target.closest('#bsMoreBtn');
      if (bsMoreBtn) {
        e.stopPropagation();
        const menu = document.getElementById('mobileMoreMenu');
        const container = document.querySelector('.bs-more-container');
        if (menu && container) {
          container.appendChild(menu);
          menu.classList.toggle('hidden');
          this._updateMobileMoreMenuStatus();
        }
        return;
      }

      // Close mobile more menu when clicking outside
      const menu = document.getElementById('mobileMoreMenu');
      if (menu && !menu.classList.contains('hidden')) {
        const isMoreBtn =
          e.target.closest('#mobileMoreBtn') || e.target.closest('#bsMoreBtn');
        if (!menu.contains(e.target) && !isMoreBtn) {
          menu.classList.add('hidden');
        }
      }
    });

    // Mobile more menu options
    this.mobileMoreMenu
      ?.querySelectorAll('.mobile-more-option[data-action]')
      .forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const action = btn.dataset.action;
          this._handleMobileMoreAction(action);
        });
      });

    // Mobile layout select
    this.mobileLayoutSelect?.addEventListener('change', (e) => {
      const layout = e.target.value;
      this.layoutSelect.value = layout;
      this.layoutSelect.dispatchEvent(new Event('change'));
      this.mobileMoreMenu?.classList.add('hidden');
    });

    // Speed control
    this.speedSelect.addEventListener('change', (e) => {
      const speed = parseFloat(e.target.value);
      this.videoPlayer.playbackRate = speed;
    });

    // Loop control - checkbox (kept for compatibility)
    this.loopCheckbox.addEventListener('change', (e) => {
      this.videoPlayer.setLoop(e.target.checked);
      this.loopBtn.classList.toggle('active', e.target.checked);
    });

    // Loop button (new UI)
    this.loopBtn.addEventListener('click', () => {
      const newState = !this.loopCheckbox.checked;
      this.loopCheckbox.checked = newState;
      this.videoPlayer.setLoop(newState);
      this.loopBtn.classList.toggle('active', newState);
    });

    // Layout control
    this.layoutSelect.addEventListener('change', (e) => {
      const layout = e.target.value;
      this.layoutManager.setLayout(layout);
      // Show reset button when cameras have been swapped
      const resetBtn = document.getElementById('resetLayoutBtn');
      if (resetBtn) resetBtn.style.display = 'none';
    });

    // Reset layout button — restores camera positions after drag-swap
    const resetLayoutBtn = document.getElementById('resetLayoutBtn');
    if (resetLayoutBtn) {
      resetLayoutBtn.addEventListener('click', () => {
        this.layoutManager.resetCameraOrder();
        resetLayoutBtn.style.display = 'none';
      });
      // If we restored a modified layout from localStorage, show the button
      if (this.layoutManager._configModified) {
        resetLayoutBtn.style.display = '';
      }
    }

    // Focus camera selector
    this.focusCameraSelect.addEventListener('change', (e) => {
      const camera = e.target.value;
      this.layoutManager.setFocusCamera(camera);
    });

    // Video player callbacks
    this.videoPlayer.onTimeUpdate = (time) => {
      if (!this.timeline.isDragging) {
        // Calculate absolute event time
        const eventTime = this.getAbsoluteEventTime(time);
        this.timeline.updateTime(eventTime);

        // Update bottom sheet mini-timeline
        this.updateBottomSheetProgress(eventTime, this.timeline.totalDuration);
      }
    };

    this.videoPlayer.onEnded = () => {
      this.updatePlaybackButtons();

      // Auto-play next event if setting is enabled
      if (this.settingsManager.get('autoPlayNextEvent')) {
        this.autoPlayNextEvent();
      }
    };

    this.videoPlayer.onClipChange = (clipIndex) => {
      this.updatePlaybackButtons();
      // Reset sync timer so we sync at start of new clip
      this.syncController.resetSyncTimer();
    };

    this.videoPlayer.onPlayStateChange = (isPlaying) => {
      this.updatePlaybackButtons();
    };

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));

    // Settings, Help, Stats, and Session buttons
    this.settingsBtn.addEventListener('click', () =>
      this.settingsManager.showSettingsModal()
    );
    this.helpBtn.addEventListener('click', () => this.helpModal.show());
    this.statsBtn.addEventListener('click', () =>
      this.statisticsManager.showModal()
    );

    // Camera visibility toggles
    this.setupCameraVisibilityControls();

    // Mobile swipe gestures
    this.setupSwipeGestures();

    // Drive selector (multi-drive support)
    this.setupDriveSelector();

    // Mobile fullscreen mode
    this.setupMobileFullscreen();

    // Bottom sheet controls (portrait mode)
    this.setupBottomSheet();
  }

  /**
   * Setup bottom sheet controls for portrait mode
   */
  setupBottomSheet() {
    this.bottomSheet = document.getElementById('bottomSheet');
    this.bottomSheetHandle = document.getElementById('bottomSheetHandle');
    this.bottomSheetPlayBtn = document.getElementById('bottomSheetPlayBtn');
    this.bottomSheetProgress = document.getElementById('bottomSheetProgress');

    // Enable bottom sheet on portrait mobile
    const checkOrientation = () => {
      const isMobilePortrait =
        window.innerWidth <= 768 && window.innerHeight > window.innerWidth;

      if (isMobilePortrait) {
        document.body.classList.add('bottom-sheet-enabled');
      } else {
        document.body.classList.remove('bottom-sheet-enabled');
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Handle toggle on drag
    this.bottomSheetHandle.addEventListener('click', () => {
      this.bottomSheet.classList.toggle('collapsed');
    });

    // Wire up bottom sheet buttons
    this.bottomSheetPlayBtn?.addEventListener('click', () =>
      this.togglePlayback()
    );
    document
      .getElementById('bsFrameBackBtn')
      ?.addEventListener('click', () => this.frameStep(-1));
    document
      .getElementById('bsFrameForwardBtn')
      ?.addEventListener('click', () => this.frameStep(1));
    document
      .getElementById('bsPrevClipBtn')
      ?.addEventListener('click', () => this.previousClip());
    document
      .getElementById('bsNextClipBtn')
      ?.addEventListener('click', () => this.nextClip());
    document
      .getElementById('bsPrevEventBtn')
      ?.addEventListener('click', () => this.previousEvent());
    document
      .getElementById('bsNextEventBtn')
      ?.addEventListener('click', () => this.nextEvent());
    document
      .getElementById('bsScreenshotBtn')
      ?.addEventListener('click', () => this.captureScreenshot());
    document
      .getElementById('bsFullscreenBtn')
      ?.addEventListener('click', () => this.enterMobileFullscreen());

    // Mini-timeline scrubbing
    const miniTimeline = document.querySelector('.bottom-sheet-mini-timeline');
    if (miniTimeline) {
      miniTimeline.addEventListener('click', (e) => {
        if (!this.timeline.totalDuration) return;
        const rect = miniTimeline.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * this.timeline.totalDuration;
        this.onTimelineSeeked(time);
      });
    }
  }

  /**
   * Update bottom sheet progress
   */
  updateBottomSheetProgress(currentTime, totalDuration) {
    if (this.bottomSheetProgress) {
      const percent =
        totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
      this.bottomSheetProgress.style.width = `${percent}%`;
    }
    if (this.bottomSheetTime) {
      this.bottomSheetTime.textContent = this.formatTime(currentTime);
    }
  }

  /**
   * Setup mobile fullscreen mode
   */
  setupMobileFullscreen() {
    // Enter fullscreen on button click
    this.mobileFullscreenBtn.addEventListener('click', () =>
      this.enterMobileFullscreen()
    );

    // Exit fullscreen
    this.exitFullscreenBtn.addEventListener('click', () =>
      this.exitMobileFullscreen()
    );

    // Play/pause in fullscreen
    this.fullscreenPlayBtn.addEventListener('click', () => {
      this.togglePlayback();
      this.showFullscreenControls();
    });

    // Tap on overlay to show/hide controls
    this.mobileFullscreenOverlay.addEventListener('click', (e) => {
      if (e.target === this.mobileFullscreenOverlay) {
        this.toggleFullscreenControls();
      }
    });

    // Also handle clicks on video grid when in fullscreen mode
    const videoGridContainer = document.querySelector('.video-grid-container');
    if (videoGridContainer) {
      videoGridContainer.addEventListener('click', (e) => {
        if (this.isMobileFullscreen && !e.target.closest('button')) {
          this.toggleFullscreenControls();
        }
      });
    }

    // Swipe down to exit fullscreen
    let touchStartY = 0;
    this.mobileFullscreenOverlay.addEventListener(
      'touchstart',
      (e) => {
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    this.mobileFullscreenOverlay.addEventListener(
      'touchend',
      (e) => {
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        if (deltaY > 100) {
          this.exitMobileFullscreen();
        }
      },
      { passive: true }
    );
  }

  /**
   * Enter mobile fullscreen mode
   */
  enterMobileFullscreen() {
    this.isMobileFullscreen = true;
    document.body.classList.add('mobile-fullscreen');
    this.mobileFullscreenOverlay.classList.remove('hidden');
    this.mobileFullscreenOverlay.classList.add('active');

    // Show controls briefly
    this.showFullscreenControls();

    // Try to request fullscreen from the browser
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fallscreen API not available or rejected, CSS fullscreen still works
      });
    }

    console.log('Entered mobile fullscreen mode');
  }

  /**
   * Exit mobile fullscreen mode
   */
  exitMobileFullscreen() {
    this.isMobileFullscreen = false;
    document.body.classList.remove('mobile-fullscreen');
    this.mobileFullscreenOverlay.classList.add('hidden');
    this.mobileFullscreenOverlay.classList.remove('active', 'show-controls');

    if (this.fullscreenControlsTimeout) {
      clearTimeout(this.fullscreenControlsTimeout);
    }

    // Exit browser fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    console.log('Exited mobile fullscreen mode');
  }

  /**
   * Show fullscreen controls temporarily
   */
  showFullscreenControls() {
    this.mobileFullscreenOverlay.classList.add('show-controls');

    // Hide controls after 3 seconds
    if (this.fullscreenControlsTimeout) {
      clearTimeout(this.fullscreenControlsTimeout);
    }

    this.fullscreenControlsTimeout = setTimeout(() => {
      this.mobileFullscreenOverlay.classList.remove('show-controls');
    }, 3000);
  }

  /**
   * Toggle fullscreen controls visibility
   */
  toggleFullscreenControls() {
    if (this.mobileFullscreenOverlay.classList.contains('show-controls')) {
      this.mobileFullscreenOverlay.classList.remove('show-controls');
      if (this.fullscreenControlsTimeout) {
        clearTimeout(this.fullscreenControlsTimeout);
      }
    } else {
      this.showFullscreenControls();
    }
  }

  /**
   * Setup drive selector UI and event listeners
   */
  setupDriveSelector() {
    // Drive select change
    this.driveSelect.addEventListener('change', (e) => {
      const driveId = e.target.value || null;
      this.folderManager.setActiveDrive(driveId);
      this.applyFilters();
    });

    // Add drive button
    this.addDriveBtn.addEventListener('click', () => this.addNewDrive());

    // Manage drives button
    this.manageDrivesBtn.addEventListener('click', () =>
      this.showDriveManagementModal()
    );

    // Sync drives button
    this.syncDrivesBtn.addEventListener('click', () => this.driveSyncUI.show());

    // Manual drive-rescan button (always available, works even on browsers
    // without FileSystemObserver).
    const refreshBtn = document.getElementById('refreshDrivesBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.classList.add('spinning');
        try {
          await this._rescanAllDrives();
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.classList.remove('spinning');
        }
      });
    }

    // Listen for drive changes
    this.folderManager.onDrivesChanged = (drives) => {
      this.updateDriveSelector(drives);
      this._syncFileSystemObservers(drives);
    };
  }

  /**
   * Reconcile the file-system observer registry with the current drive
   * list. New drives start being watched; removed drives are unwatched.
   * No-op on browsers without FileSystemObserver.
   */
  _syncFileSystemObservers(drives) {
    if (!this.fsObserver) {
      console.log('[FSObserver] No observer instance available');
      return;
    }
    if (!this.fsObserver.isSupported) {
      console.log(
        '[FSObserver] API not supported in this browser; manual refresh button is the fallback'
      );
      return;
    }
    const driveIds = new Set(drives.map((d) => d.id));
    console.log(
      `[FSObserver] Syncing observers — ${drives.length} drive(s) active`
    );

    // Unwatch drives that no longer exist
    for (const existingId of Array.from(this.fsObserver.observers.keys())) {
      if (!driveIds.has(existingId)) {
        this.fsObserver.unwatch(existingId);
      }
    }

    // Watch new drives
    for (const drive of drives) {
      if (!drive.handle) {
        console.log(
          `[FSObserver] Drive ${drive.label} has no handle; cannot watch`
        );
        continue;
      }
      if (drive.isArchive) {
        console.log(
          `[FSObserver] Drive ${drive.label} is an archive; skipping`
        );
        continue;
      }
      if (!this.fsObserver.observers.has(drive.id)) {
        this.fsObserver.watch(drive.id, drive.handle);
      }
    }
  }

  /**
   * Update drive selector dropdown with current drives
   */
  updateDriveSelector(drives) {
    // Clear existing options except "All Drives"
    this.driveSelect.innerHTML = '<option value="">All Drives</option>';

    // Add drive options
    for (const drive of drives) {
      const option = document.createElement('option');
      option.value = drive.id;
      option.textContent = `${drive.label} (${drive.events?.length || 0})`;
      option.style.color = drive.color;
      this.driveSelect.appendChild(option);
    }

    // Show/hide drive selector based on drive count
    if (drives.length > 0) {
      this.driveSelector.classList.remove('hidden');
    } else {
      this.driveSelector.classList.add('hidden');
    }

    // Enable/disable sync button based on drive count (need 2+ drives)
    this.syncDrivesBtn.disabled = drives.length < 2;

    // Restore active drive selection
    if (this.folderManager.activeDriveId) {
      this.driveSelect.value = this.folderManager.activeDriveId;
    }
  }

  /**
   * Add a new drive (folder)
   */
  async addNewDrive() {
    let handle = null;

    // Loop to allow "Change Folder" option
    while (true) {
      try {
        handle = await window.showDirectoryPicker();
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error selecting folder:', error);
        }
        return;
      }

      // Show drive setup dialog
      const settings = await this.showDriveSetupDialog(handle);

      if (!settings) {
        return; // User cancelled
      }

      if (settings.changeFolder) {
        continue; // User wants to change folder
      }

      this.showLoading('Adding drive...');

      try {
        // Add drive to folder manager with settings
        const drive = await this.folderManager.addDrive(handle, {
          label: settings.label,
          isArchive: settings.isArchive,
          dateFilter: settings.dateFilter,
        });

        // If archive drive, skip loading
        if (settings.isArchive) {
          this.hideLoading();
          this.updateDriveSelector(this.folderManager.getDrives());
          console.log(`Added archive drive: ${drive.label}`);
          return;
        }

        // Parse the drive
        this.loadingText.textContent = 'Parsing TeslaCam folder...';
        this.folderParser.setDriveContext(drive.id, drive.label, drive.color);
        this.folderParser.rootHandle = handle;
        this.folderParser.setProgressCallback((message, count) => {
          this.loadingText.textContent = `${drive.label}: ${message} (${count} events)`;
        });
        let events = await this.folderParser.parseFolder();
        this.folderParser.setProgressCallback(null);

        // Apply date filter if set
        const cutoff = this.folderManager.getDateFilterCutoff(
          settings.dateFilter
        );
        if (cutoff) {
          const beforeCount = events.length;
          events = events.filter(
            (event) => new Date(event.timestamp) >= cutoff
          );
          console.log(
            `Date filter (${settings.dateFilter}): ${beforeCount} → ${events.length} events`
          );
        }

        // Store events in drive
        drive.events = events;

        // Merge into allEvents
        this.allEvents = this.allEvents.concat(events);
        this.allEvents.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        // Update statistics and filters
        this.statisticsManager.setEvents(this.allEvents);

        // Register events and load backups
        await this.registerEventsAndLoadBackups(events);

        this.applyFilters();

        // Update drive selector
        this.updateDriveSelector(this.folderManager.getDrives());

        this.hideLoading();

        console.log(
          `Added drive "${drive.label}" with ${events.length} events`
        );
      } catch (error) {
        console.error('Error adding drive:', error);
        this.hideLoading();
      }

      break; // Exit loop
    }
  }

  /**
   * Get translation helper
   */
  t(key) {
    return window.i18n ? window.i18n.t(key) : key.split('.').pop();
  }

  /**
   * Show drive management modal
   */
  showDriveManagementModal() {
    const drives = this.folderManager.getDrives();

    // Helper to get event count text
    const getEventCountText = (drive) => {
      if (drive.isArchive && (!drive.events || drive.events.length === 0)) {
        return this.t('driveManager.notLoaded');
      }
      const count = drive.events?.length || 0;
      return `${count} ${this.t('driveManager.events')}`;
    };

    // Helper to get date filter text
    const getDateFilterText = (drive) => {
      if (!drive.dateFilter || drive.dateFilter === 'all') return '';
      return this.folderManager.getDateFilterLabel(drive.dateFilter);
    };

    // Create modal content
    const modalContent = `
            <div class="modal-overlay" id="driveManagementModal">
                <div class="modal drive-management-modal">
                    <div class="modal-header">
                        <h3>${this.t('driveManager.title')}</h3>
                        <button class="modal-close-btn" id="closeDriveModal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-content">
                        ${
                          drives.length === 0
                            ? `
                            <p style="color: var(--text-muted); text-align: center;">${this.t('driveManager.noDrives')}</p>
                        `
                            : `
                            <div class="drive-list">
                                ${drives
                                  .map(
                                    (drive) => `
                                    <div class="drive-item ${drive.isArchive ? 'is-archive' : ''}" data-drive-id="${drive.id}">
                                        <label class="drive-color-picker" title="${this.t('driveManager.changeColor')}">
                                            <input type="color" class="drive-color-input" value="${drive.color}" data-drive-id="${drive.id}">
                                            <div class="drive-color-preview" style="background: ${drive.color};"></div>
                                        </label>
                                        <div style="flex: 1; min-width: 0;">
                                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                                <input type="text" class="drive-label-input" value="${drive.label}" data-drive-id="${drive.id}" style="flex: 1;">
                                                ${drive.isArchive ? `<span class="drive-archive-badge">${this.t('driveManager.archive')}</span>` : ''}
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                                                <span class="drive-event-count">${getEventCountText(drive)}</span>
                                                ${getDateFilterText(drive) ? `<span class="drive-date-filter">• ${getDateFilterText(drive)}</span>` : ''}
                                            </div>
                                        </div>
                                        ${
                                          drive.isArchive
                                            ? `
                                            <button class="drive-sync-btn" data-drive-id="${drive.id}" title="${this.t('driveManager.syncNow')}">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                                                </svg>
                                                ${this.t('driveManager.sync')}
                                            </button>
                                        `
                                            : ''
                                        }
                                        <button class="drive-edit-btn" data-drive-id="${drive.id}" title="${this.t('driveManager.editDrive')}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; border-radius: 4px;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                            </svg>
                                        </button>
                                        <button class="drive-remove-btn" data-drive-id="${drive.id}" title="${this.t('driveManager.removeDrive')}">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                            </svg>
                                        </button>
                                    </div>
                                `
                                  )
                                  .join('')}
                            </div>
                        `
                        }
                        <button class="btn btn-primary" id="addDriveModalBtn" style="width: 100%; margin-top: 1rem;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem;">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                            </svg>
                            ${this.t('driveManager.addDrive')}
                        </button>
                    </div>
                </div>
            </div>
        `;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalContent);

    const modal = document.getElementById('driveManagementModal');

    // Close button
    document.getElementById('closeDriveModal').addEventListener('click', () => {
      modal.remove();
    });

    // Close on overlay click (only if mousedown started on overlay - prevents close during text selection)
    let mouseDownOnOverlay = false;
    modal.addEventListener('mousedown', (e) => {
      mouseDownOnOverlay = e.target === modal;
    });
    modal.addEventListener('click', (e) => {
      if (mouseDownOnOverlay && e.target === modal) {
        modal.remove();
      }
    });

    // Add drive button in modal
    document
      .getElementById('addDriveModalBtn')
      .addEventListener('click', async () => {
        modal.remove();
        await this.addNewDrive();
      });

    // Label input change handlers
    modal.querySelectorAll('.drive-label-input').forEach((input) => {
      input.addEventListener('change', async (e) => {
        const driveId = e.target.dataset.driveId;
        const newLabel = e.target.value.trim();
        if (newLabel) {
          await this.folderManager.updateDriveLabel(driveId, newLabel);
          // Update event badges
          this.eventBrowser.render(this.filteredEvents);
        }
      });
    });

    // Color input change handlers
    modal.querySelectorAll('.drive-color-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        // Update preview immediately
        const preview = e.target.parentElement.querySelector(
          '.drive-color-preview'
        );
        if (preview) {
          preview.style.background = e.target.value;
        }
      });
      input.addEventListener('change', async (e) => {
        const driveId = e.target.dataset.driveId;
        const newColor = e.target.value;
        await this.folderManager.updateDriveColor(driveId, newColor);
        // Update event badges with new color
        this.allEvents.forEach((event) => {
          if (event.driveId === driveId) {
            event.driveColor = newColor;
          }
        });
        this.eventBrowser.render(this.filteredEvents);
      });
    });

    // Sync buttons for archive drives
    modal.querySelectorAll('.drive-sync-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const driveId = e.target.closest('.drive-sync-btn').dataset.driveId;
        modal.remove();
        await this.syncArchiveDrive(driveId);
      });
    });

    // Edit buttons
    modal.querySelectorAll('.drive-edit-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const driveId = e.target.closest('.drive-edit-btn').dataset.driveId;
        const drive = this.folderManager.getDrive(driveId);
        if (drive) {
          const oldDateFilter = drive.dateFilter;
          const oldIsArchive = drive.isArchive;

          modal.remove();
          const settings = await this.showDriveSetupDialog(null, drive);
          if (settings && !settings.changeFolder) {
            await this.folderManager.updateDriveSettings(driveId, settings);

            // Check if we need to reload events
            const filterChanged = oldDateFilter !== settings.dateFilter;
            const archiveChanged = oldIsArchive !== settings.isArchive;

            if (archiveChanged || filterChanged) {
              // Re-filter/reload the drive's events
              await this.reloadDriveEvents(driveId, settings);
            }

            // Refresh the modal
            this.showDriveManagementModal();
          } else {
            this.showDriveManagementModal();
          }
        }
      });
    });

    // Remove drive buttons
    modal.querySelectorAll('.drive-remove-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const driveId = e.target.closest('.drive-remove-btn').dataset.driveId;
        if (confirm('Remove this drive? Events will no longer be shown.')) {
          await this.folderManager.removeDrive(driveId);

          // Remove events from allEvents
          this.allEvents = this.allEvents.filter((e) => e.driveId !== driveId);
          this.statisticsManager.setEvents(this.allEvents);
          this.applyFilters();

          // Close and reopen modal to refresh
          modal.remove();
          this.showDriveManagementModal();
        }
      });
    });
  }

  /**
   * Sync an archive drive (load its events on demand)
   * @param {string} driveId
   */
  async syncArchiveDrive(driveId) {
    const drive = this.folderManager.getDrive(driveId);
    if (!drive) {
      console.error('Drive not found:', driveId);
      return;
    }

    this.showLoading(`Syncing ${drive.label}...`);

    try {
      // Restore permission for the archive drive
      const restored = await this.folderManager.restoreArchiveDrive(driveId);
      if (!restored) {
        this.hideLoading();
        alert(
          'Drive may be disconnected or needs permission. Please reconnect the drive and try again.'
        );
        return;
      }

      // Parse the drive
      this.loadingText.textContent = 'Parsing TeslaCam folder...';
      this.folderParser.setDriveContext(drive.id, drive.label, drive.color);
      this.folderParser.rootHandle = drive.handle;
      this.folderParser.setProgressCallback((message, count) => {
        this.loadingText.textContent = `${drive.label}: ${message} (${count} events)`;
      });
      let events = await this.folderParser.parseFolder();
      this.folderParser.setProgressCallback(null);

      // Apply date filter if set
      const cutoff = this.folderManager.getDateFilterCutoff(drive.dateFilter);
      if (cutoff) {
        const beforeCount = events.length;
        events = events.filter((event) => new Date(event.timestamp) >= cutoff);
        console.log(
          `Date filter (${drive.dateFilter}): ${beforeCount} → ${events.length} events`
        );
      }

      // Add drive metadata to events
      for (const event of events) {
        event.driveId = drive.id;
        event.compoundKey = this.folderManager.getCompoundKey(
          drive.id,
          event.name
        );
        event.driveLabel = drive.label;
        event.driveColor = drive.color;
      }

      // Store events in drive
      drive.events = events;

      // Remove any existing events from this drive and add new ones
      this.allEvents = this.allEvents.filter((e) => e.driveId !== driveId);
      this.allEvents = this.allEvents.concat(events);
      this.allEvents.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Update statistics and filters
      this.statisticsManager.setEvents(this.allEvents);

      // Register events and load backups
      await this.registerEventsAndLoadBackups(events);

      this.applyFilters();

      // Update drive selector
      this.updateDriveSelector(this.folderManager.getDrives());

      this.hideLoading();

      console.log(
        `Synced archive drive "${drive.label}" with ${events.length} events`
      );
    } catch (error) {
      console.error('Error syncing archive drive:', error);
      this.hideLoading();
      alert('Unable to sync drive. Please check the connection and try again.');
    }
  }

  /**
   * Reload events for a drive after settings change (date filter, archive status)
   * @param {string} driveId
   * @param {Object} settings - New settings
   */
  async reloadDriveEvents(driveId, settings) {
    const drive = this.folderManager.getDrive(driveId);
    if (!drive) return;

    // If changed to archive, remove events from allEvents
    if (settings.isArchive) {
      this.allEvents = this.allEvents.filter((e) => e.driveId !== driveId);
      drive.events = [];
      this.statisticsManager.setEvents(this.allEvents);
      this.applyFilters();
      this.updateDriveSelector(this.folderManager.getDrives());
      console.log(`Marked ${drive.label} as archive, removed events from list`);
      return;
    }

    // If drive has no handle or events need to be reloaded
    if (!drive.handle) {
      console.warn('Drive has no handle, cannot reload events');
      return;
    }

    this.showLoading(`Reloading ${drive.label}...`);

    try {
      // Request permission if needed
      const permission = await drive.handle.requestPermission({ mode: 'read' });
      if (permission !== 'granted') {
        this.hideLoading();
        alert(
          'Permission needed to access this drive. Please allow access when prompted.'
        );
        return;
      }

      // Re-parse the drive
      this.folderParser.setDriveContext(drive.id, drive.label, drive.color);
      this.folderParser.rootHandle = drive.handle;
      this.folderParser.setProgressCallback((message, count) => {
        this.loadingText.textContent = `${drive.label}: ${message} (${count} events)`;
      });
      let events = await this.folderParser.parseFolder();
      this.folderParser.setProgressCallback(null);

      // Apply date filter
      const cutoff = this.folderManager.getDateFilterCutoff(
        settings.dateFilter
      );
      if (cutoff) {
        const beforeCount = events.length;
        events = events.filter((event) => new Date(event.timestamp) >= cutoff);
        console.log(
          `Date filter (${settings.dateFilter}): ${beforeCount} → ${events.length} events`
        );
      }

      // Add drive metadata
      for (const event of events) {
        event.driveId = drive.id;
        event.compoundKey = this.folderManager.getCompoundKey(
          drive.id,
          event.name
        );
        event.driveLabel = drive.label;
        event.driveColor = drive.color;
      }

      // Update drive events
      drive.events = events;

      // Update allEvents
      this.allEvents = this.allEvents.filter((e) => e.driveId !== driveId);
      this.allEvents = this.allEvents.concat(events);
      this.allEvents.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Update UI
      this.statisticsManager.setEvents(this.allEvents);
      await this.registerEventsAndLoadBackups(events);
      this.applyFilters();
      this.updateDriveSelector(this.folderManager.getDrives());

      this.hideLoading();
      console.log(`Reloaded ${drive.label} with ${events.length} events`);
    } catch (error) {
      console.error('Error reloading drive:', error);
      this.hideLoading();
    }
  }

  /**
   * Show drive setup dialog after folder selection
   * @param {FileSystemDirectoryHandle} handle
   * @param {Object} existingDrive - If editing existing drive
   * @returns {Promise<Object|null>} Drive settings or null if cancelled
   */
  showDriveSetupDialog(handle, existingDrive = null) {
    return new Promise((resolve) => {
      const isEdit = !!existingDrive;
      const folderName = handle?.name || existingDrive?.folderName || 'Unknown';

      const modalContent = `
                <div class="modal-overlay" id="driveSetupModal">
                    <div class="modal drive-setup-modal">
                        <div class="modal-header">
                            <h3>${this.t(isEdit ? 'driveSetup.editTitle' : 'driveSetup.title')}</h3>
                            <button class="modal-close-btn" id="closeDriveSetup">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                </svg>
                            </button>
                        </div>
                        <div class="modal-content">
                            <div class="drive-setup-selected">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
                                </svg>
                                <span>${folderName}</span>
                            </div>

                            ${
                              !isEdit
                                ? `
                            <div class="drive-setup-tip">
                                <div class="drive-setup-tip-header">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                    </svg>
                                    ${this.t('driveSetup.tipTitle')}
                                </div>
                                <ul>
                                    <li>${this.t('driveSetup.tipTeslaCam')}</li>
                                    <li>${this.t('driveSetup.tipSubfolder')}</li>
                                    <li>${this.t('driveSetup.tipParent')}</li>
                                </ul>
                            </div>
                            `
                                : ''
                            }

                            <div class="drive-setup-form">
                                <div class="drive-setup-field">
                                    <label for="driveLabel">${this.t('driveSetup.labelField')}</label>
                                    <input type="text" id="driveLabel" value="${existingDrive?.label || ''}" placeholder="${this.t('driveSetup.labelPlaceholder')}">
                                </div>

                                <div class="drive-setup-field">
                                    <label for="dateFilter">${this.t('driveSetup.dateFilterField')}</label>
                                    <select id="dateFilter">
                                        <option value="all" ${existingDrive?.dateFilter === 'all' ? 'selected' : ''}>${this.t('driveSetup.dateFilterAll')}</option>
                                        <option value="week" ${existingDrive?.dateFilter === 'week' ? 'selected' : ''}>${this.t('driveSetup.dateFilterWeek')}</option>
                                        <option value="month" ${existingDrive?.dateFilter === 'month' ? 'selected' : ''}>${this.t('driveSetup.dateFilterMonth')}</option>
                                        <option value="3months" ${existingDrive?.dateFilter === '3months' ? 'selected' : ''}>${this.t('driveSetup.dateFilter3Months')}</option>
                                        <option value="6months" ${existingDrive?.dateFilter === '6months' ? 'selected' : ''}>${this.t('driveSetup.dateFilter6Months')}</option>
                                        <option value="year" ${existingDrive?.dateFilter === 'year' ? 'selected' : ''}>${this.t('driveSetup.dateFilterYear')}</option>
                                    </select>
                                </div>

                                <label class="drive-setup-checkbox">
                                    <input type="checkbox" id="isArchive" ${existingDrive?.isArchive ? 'checked' : ''}>
                                    <div class="drive-setup-checkbox-content">
                                        <div class="drive-setup-checkbox-label">${this.t('driveSetup.archiveLabel')}</div>
                                        <div class="drive-setup-checkbox-hint">${this.t('driveSetup.archiveHint')}</div>
                                    </div>
                                </label>
                            </div>

                            <div class="drive-setup-actions">
                                ${!isEdit ? `<button class="btn btn-secondary" id="changeFolderBtn">${this.t('driveSetup.changeFolder')}</button>` : ''}
                                <button class="btn btn-primary" id="confirmDriveSetup">${this.t(isEdit ? 'driveSetup.save' : 'driveSetup.addDrive')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      document.body.insertAdjacentHTML('beforeend', modalContent);

      const modal = document.getElementById('driveSetupModal');
      const labelInput = document.getElementById('driveLabel');
      const dateFilterSelect = document.getElementById('dateFilter');
      const isArchiveCheckbox = document.getElementById('isArchive');

      // Generate default label if not editing
      if (!isEdit && handle) {
        labelInput.value = this.folderManager.generateLabel(handle.name);
      }

      // Close button
      document
        .getElementById('closeDriveSetup')
        .addEventListener('click', () => {
          modal.remove();
          resolve(null);
        });

      // Close on overlay click (only if mousedown started on overlay)
      let mouseDownOnOverlay = false;
      modal.addEventListener('mousedown', (e) => {
        mouseDownOnOverlay = e.target === modal;
      });
      modal.addEventListener('click', (e) => {
        if (mouseDownOnOverlay && e.target === modal) {
          modal.remove();
          resolve(null);
        }
      });

      // Change folder button (only for new drives)
      const changeFolderBtn = document.getElementById('changeFolderBtn');
      if (changeFolderBtn) {
        changeFolderBtn.addEventListener('click', async () => {
          modal.remove();
          resolve({ changeFolder: true });
        });
      }

      // Confirm button
      document
        .getElementById('confirmDriveSetup')
        .addEventListener('click', () => {
          const settings = {
            label:
              labelInput.value.trim() ||
              this.folderManager.generateLabel(folderName),
            dateFilter: dateFilterSelect.value,
            isArchive: isArchiveCheckbox.checked,
          };
          modal.remove();
          resolve(settings);
        });
    });
  }

  /**
   * Setup swipe gestures for mobile navigation between events
   */
  setupSwipeGestures() {
    const videoGrid = document.querySelector('.video-grid-container');
    if (!videoGrid) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    videoGrid.addEventListener(
      'touchstart',
      (e) => {
        // Only track single finger touches
        if (e.touches.length !== 1) return;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      },
      { passive: true }
    );

    videoGrid.addEventListener(
      'touchend',
      (e) => {
        // Only process single finger touches
        if (e.changedTouches.length !== 1) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;

        // Swipe thresholds
        const minSwipeDistance = 80; // Minimum horizontal distance
        const maxVerticalRatio = 0.5; // Max vertical movement relative to horizontal
        const maxSwipeTime = 500; // Max time in ms for swipe

        // Check if this is a valid horizontal swipe
        if (
          Math.abs(deltaX) > minSwipeDistance &&
          Math.abs(deltaY) < Math.abs(deltaX) * maxVerticalRatio &&
          deltaTime < maxSwipeTime
        ) {
          if (deltaX > 0) {
            // Swipe right → previous event
            this.previousEvent();
            this.showSwipeIndicator('prev');
          } else {
            // Swipe left → next event
            this.nextEvent();
            this.showSwipeIndicator('next');
          }
        }
      },
      { passive: true }
    );
  }

  /**
   * Show visual feedback for swipe navigation
   */
  showSwipeIndicator(direction) {
    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = `swipe-indicator swipe-${direction}`;
    indicator.innerHTML =
      direction === 'prev'
        ? '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>'
        : '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>';

    document.body.appendChild(indicator);

    // Remove after animation
    setTimeout(() => {
      indicator.remove();
    }, 400);
  }

  /**
   * Setup camera visibility toggle controls
   */
  setupCameraVisibilityControls() {
    const hideButtons = document.querySelectorAll('.camera-hide-btn');
    const hiddenCamerasPanel = document.getElementById('hiddenCamerasPanel');
    const hiddenCamerasList = document.getElementById('hiddenCamerasList');

    const cameraNames = {
      front: 'Front',
      back: 'Back',
      left_repeater: 'Left',
      right_repeater: 'Right',
    };

    // Update hidden cameras panel
    const updateHiddenPanel = () => {
      const visibleCameras = this.layoutManager.getVisibleCameras();
      const hiddenCameras = Object.entries(visibleCameras)
        .filter(([_, visible]) => !visible)
        .map(([camera, _]) => camera);

      if (hiddenCameras.length === 0) {
        hiddenCamerasPanel.classList.add('hidden');
        return;
      }

      hiddenCamerasPanel.classList.remove('hidden');
      hiddenCamerasList.innerHTML = hiddenCameras
        .map(
          (camera) => `
                <button class="hidden-camera-btn" data-camera="${camera}" title="Show ${cameraNames[camera]} Camera">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                    ${cameraNames[camera]}
                </button>
            `
        )
        .join('');

      // Add click handlers to show hidden cameras
      hiddenCamerasList
        .querySelectorAll('.hidden-camera-btn')
        .forEach((btn) => {
          btn.addEventListener('click', () => {
            const camera = btn.dataset.camera;
            this.layoutManager.setCameraVisibility(camera, true);
            updateHiddenPanel();
          });
        });
    };

    // Add click handlers to hide buttons
    hideButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering video container events
        const camera = btn.dataset.camera;
        this.layoutManager.setCameraVisibility(camera, false);
        updateHiddenPanel();
      });
    });

    // Initial update
    updateHiddenPanel();
  }

  /**
   * Select TeslaCam folder
   */
  async selectFolder() {
    let handle = null;

    // Loop to allow "Change Folder" option
    while (true) {
      // Show folder picker
      try {
        handle = await window.showDirectoryPicker();
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error selecting folder:', error);
        }
        return;
      }

      // Show drive setup dialog
      const settings = await this.showDriveSetupDialog(handle);

      if (!settings) {
        // User cancelled
        return;
      }

      if (settings.changeFolder) {
        // User wants to change folder, loop back
        continue;
      }

      // Settings confirmed, proceed
      this.showLoading('Parsing TeslaCam folder...');

      try {
        // Add folder as a drive with settings
        const drive = await this.folderManager.addDrive(handle, {
          label: settings.label,
          isArchive: settings.isArchive,
          dateFilter: settings.dateFilter,
        });

        // Check for session recovery from drive
        if (this.sessionManager) {
          await this.sessionManager.checkDriveRecovery(handle);
        }

        // If archive drive, skip loading and just save
        if (settings.isArchive) {
          this.hideLoading();

          // Update drive selector to show the archive drive
          this.updateDriveSelector(this.folderManager.getDrives());

          // Hide select folder button
          this.selectFolderBtn.classList.add('hidden');

          console.log(
            `Added archive drive: ${drive.label} (will load on manual sync)`
          );
          return;
        }

        // Set drive context for parsing
        this.folderParser.setDriveContext(drive.id, drive.label, drive.color);
        this.folderParser.rootHandle = handle;
        this.folderParser.setProgressCallback((message, count) => {
          this.loadingText.textContent = `${drive.label}: ${message} (${count} events)`;
        });
        let events = await this.folderParser.parseFolder();
        this.folderParser.setProgressCallback(null);

        // Apply date filter if set
        const cutoff = this.folderManager.getDateFilterCutoff(
          settings.dateFilter
        );
        if (cutoff) {
          const beforeCount = events.length;
          events = events.filter(
            (event) => new Date(event.timestamp) >= cutoff
          );
          console.log(
            `Date filter (${settings.dateFilter}): ${beforeCount} → ${events.length} events`
          );
        }

        // Store events in drive
        drive.events = events;

        this.allEvents = events; // Store all events
        this.statisticsManager.setEvents(events);

        // Register events and load backups
        await this.registerEventsAndLoadBackups(events);

        this.applyFilters(); // Apply filters and load into UI

        // Update drive selector
        this.updateDriveSelector(this.folderManager.getDrives());

        // Hide select folder button after successful load
        this.selectFolderBtn.classList.add('hidden');
        this.loadB2Btn?.classList.add('hidden');

        // Save folder handle if setting is enabled
        if (this.settingsManager.get('rememberLastFolder')) {
          await this.folderParser.saveFolderHandle();
        }

        this.hideLoading();

        if (events.length > 0) {
          console.log(`Loaded ${events.length} events`);
        } else {
          alert('No TeslaCam events found in the selected folder.');
        }
      } catch (error) {
        this.hideLoading();
        console.error('Error parsing folder:', error);
        alert(
          'Unable to read TeslaCam folder. Please make sure you selected the correct folder containing TeslaCam data.'
        );
      }

      break; // Exit loop after successful processing
    }
  }

  /**
   * Load events from Backblaze B2
   */
  async loadFromB2() {
    this.showLoading('Connecting to Backblaze B2...');

    try {
      // For now, call with nulls to use server-side .env credentials
      // In the future, this could show a modal to ask for credentials
      const result = await this.b2Client.parseBucket();

      if (!result || !result.events) {
        throw new Error('No events found in B2 bucket');
      }

      const events = result.events;
      console.log(`Loaded ${events.length} events from B2`);

      // Create or update virtual B2 drive in folderManager
      let b2Drive = this.folderManager.drives.find((d) => d.id === 'b2');
      if (!b2Drive) {
        b2Drive = {
          id: 'b2',
          label: 'Backblaze B2',
          color: '#003399',
          isArchive: false,
          dateFilter: null,
          events: events,
          handle: null,
          isB2: true,
        };
        this.folderManager.drives.push(b2Drive);
      } else {
        b2Drive.events = events;
      }

      this.folderManager.activeDriveId = 'b2';

      this.allEvents = events;
      this.statisticsManager.setEvents(events);

      // Register events and load backups
      await this.registerEventsAndLoadBackups(events);

      this.applyFilters(); // Apply filters and load into UI
      this.updateDriveSelector(this.folderManager.getDrives());

      // Hide the load buttons
      this.selectFolderBtn?.classList.add('hidden');
      if (this.loadB2Btn) this.loadB2Btn.classList.add('hidden');

      this.hideLoading();
    } catch (error) {
      console.error('B2 Load Error:', error);
      this.hideLoading();
      alert('Failed to load from Backblaze B2: ' + error.message);
    }
  }

  /**
   * Apply filters and update event browser and map
   */
  applyFilters() {
    // First filter by active drive
    let eventsToFilter = this.allEvents;
    const activeDriveId = this.folderManager.activeDriveId;

    if (activeDriveId) {
      eventsToFilter = this.allEvents.filter(
        (e) => e.driveId === activeDriveId
      );
    }

    // Then apply regular filters
    const filteredEvents = this.eventFilter.applyFilters(eventsToFilter);

    // Update event browser with filtered events
    this.eventBrowser.loadEvents(filteredEvents);

    // Refresh near-miss indicators from cache
    if (this.eventBrowser?.refreshNearMissIndicators) {
      this.eventBrowser.refreshNearMissIndicators();
    }

    // Bulk-hydrate severity badges from IDB so pills appear on the
    // cards immediately after reload — no click required.
    this._bulkHydrateSeverityBadges(filteredEvents);

    // Update map with filtered events
    this.mapView.loadEvents(filteredEvents);

    // Update filter badge
    this.filterPanel.updateFilterBadge();

    console.log(
      `Filtered: ${filteredEvents.length} of ${this.allEvents.length} events${activeDriveId ? ` (drive: ${activeDriveId})` : ''}`
    );
  }

  /**
   * Register events with NotesManager and Timeline for backup purposes,
   * and load backup data from event folders
   * @param {Array} events - Array of event objects
   */
  async registerEventsAndLoadBackups(events) {
    if (!events || events.length === 0) return;

    // Register events with Timeline
    this.timeline.registerEvents(events);

    // Load backup data from event folders
    if (window.eventDataBackup) {
      try {
        console.log('[App] Loading backup data from event folders...');
        const backups = await window.eventDataBackup.loadAllFromDrive(events);

        if (backups.size > 0) {
          console.log(`[App] Found ${backups.size} backup files`);

          // Merge backup data with localStorage
          for (const [eventKey, backupData] of backups) {
            // Merge bookmarks
            const localBookmarks =
              this.timeline.getAllSavedBookmarks()[eventKey] || [];
            const mergedBookmarks = window.eventDataBackup.mergeBookmarks(
              localBookmarks,
              backupData.bookmarks
            );

            // Save merged bookmarks to localStorage
            if (mergedBookmarks.length > 0) {
              const allBookmarks = JSON.parse(
                localStorage.getItem('teslacamviewer_bookmarks') || '{}'
              );
              allBookmarks[eventKey] = mergedBookmarks;
              localStorage.setItem(
                'teslacamviewer_bookmarks',
                JSON.stringify(allBookmarks)
              );
            }
          }

          console.log('[App] Backup data merged with localStorage');
        }
      } catch (error) {
        console.warn('[App] Failed to load backup data:', error);
      }
    }
  }

  /**
   * Switch between Events and Map tabs
   * @param {string} tabName - 'events' or 'map'
   */
  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tab panes
    const eventsTab = document.getElementById('eventsTab');
    const mapTab = document.getElementById('mapTab');

    if (tabName === 'events') {
      eventsTab.classList.add('active');
      mapTab.classList.remove('active');
    } else if (tabName === 'map') {
      eventsTab.classList.remove('active');
      mapTab.classList.add('active');

      // Resize map when switching to map tab (with delay to ensure tab is visible)
      setTimeout(() => {
        this.mapView.invalidateSize();
      }, 50);
    }

    console.log(`Switched to ${tabName} tab`);
  }

  /**
   * Event selected from browser
   * @param {Object} event
   */
  async onEventSelected(event) {
    // Check session access for viewing events. Free users hit the
    // daily cap on the 10th NEW event, but already-viewed events
    // stay accessible — we pass the event's compoundKey so the
    // session manager can recognize a re-view.
    if (this.sessionManager) {
      const eventKey = event.compoundKey || event.name;
      const access = await this.sessionManager.checkAccess(
        'viewEvent',
        eventKey
      );
      if (!access.allowed) {
        this.sessionManager.showLimitModal(access.type || 'daily');
        return;
      }
      // Pre-cap warnings — only on the FIRST view of a NEW event,
      // since re-views shouldn't keep nagging the user. The
      // recordEventView side fires AFTER load below, so we read
      // the current count here against the about-to-be-viewed key.
      if (!access.reviewed) {
        this._maybeShowFreeTierWarning(access);
      }
    }

    // Cleanup previous event URLs to save memory
    if (this.currentEvent && this.currentEvent._blobURLs) {
      this.currentEvent._blobURLs.forEach((url) => URL.revokeObjectURL(url));
      this.currentEvent._blobURLs = [];
    }

    this.showLoading('Loading event...');

    try {
      this.currentEvent = event;

      // Track event index for navigation
      this.currentEventIndex = this.allEvents.findIndex(
        (e) => e.name === event.name
      );

      // Load event in video player
      this.showLoading('Preparing video URLs...');
      await this.prepareEventURLs(event);
      await this.videoPlayer.loadEvent(event);

      // Record event view for session tracking
      if (this.sessionManager) {
        await this.sessionManager.recordEventView(
          event.compoundKey || event.name
        );
      }

      // Update pillar camera support based on event

      const hasPillars = JSON.stringify(event).includes('_pillar');

      this.layoutManager.setHasPillarCameras(hasPillars);
      this.updatePillarLayoutOptions(hasPillars);

      // Get total duration first (before SEI extraction to avoid concurrent file handle access)
      const totalDuration = await this.videoPlayer.getTotalDuration();
      this.timeline.setDuration(totalDuration);
      this.timeline.setClipMarkers(event.clipGroups);

      // Clear the scrub-preview tooltip so the previous event's
      // thumbnail doesn't linger until the user hovers again.
      if (typeof this.timeline.resetThumbnailTooltip === 'function') {
        this.timeline.resetThumbnailTooltip();
      }

      // Detect and display gaps in recording
      const gaps = this.folderParser.detectGaps(event.clipGroups);
      if (gaps.length > 0) {
        console.log(`Detected ${gaps.length} gap(s) in recording:`, gaps);
        this.timeline.setGapMarkers(gaps, event.clipGroups);
      }

      // Set current event for bookmark persistence (use compoundKey for multi-drive support)
      this.timeline.setCurrentEvent(event.compoundKey || event.name);

      // Update event info
      this.updateEventInfo(event);

      // Clear any previous export marks
      if (this.clipMarking) {
        this.clipMarking.clearMarks();
      }

      // Enable controls
      this.enableControls();

      // Close sidebar on mobile after selecting an event
      if (window.innerWidth <= 768) {
        this.closeSidebar();
      }

      // Hide placeholder nudge
      const placeholder = document.getElementById('videoGridPlaceholder');
      if (placeholder) {
        placeholder.classList.add('hidden');
      }

      // Start sync monitoring
      this.syncController.start();

      this.hideLoading();

      // For Sentry events, seek to 1 minute 4 seconds from the end
      // Treat as sentry if it's in SentryClips folder OR has sentry-related metadata
      const isSentryEvent =
        event.type === 'SentryClips' ||
        event.metadata?.reason?.toLowerCase().includes('sentry');

      if (isSentryEvent) {
        const startTime = Math.max(0, totalDuration - 64); // 1:04 from end
        await this.videoPlayer.seekToEventTime(startTime);

        // Add Sentry trigger marker to timeline (at 1 minute from end)
        const triggerTime = Math.max(0, totalDuration - 60); // 1:00 from end
        this.timeline.setSentryTriggerMarker(triggerTime);
      } else {
        // Clear any existing sentry marker for non-sentry events
        this.timeline.setSentryTriggerMarker(0);
      }

      // Apply current playback speed before playing
      const currentSpeed = parseFloat(this.speedSelect.value) || 1;
      this.videoPlayer.playbackRate = currentSpeed;

      // Auto-play the event
      await this.play();
    } catch (error) {
      this.hideLoading();
      console.error('Error loading event:', error);
      alert(
        'Unable to load event videos. The drive may have been disconnected.'
      );
    }
  }

  /**
   * Pre-generate Blobs for all clips in an event to support URL-only playback.
   * Also probes durations for accurate timeline mapping.
   */
  async prepareEventURLs(event) {
    const cameras = [
      'front',
      'back',
      'left_repeater',
      'right_repeater',
      'left_pillar',
      'right_pillar',
    ];

    // Process each clip group serially to avoid overloading decoders during duration probing
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

              // Probe duration from front camera if not already set.
              // This is done serially (one clip at a time) to protect hardware slots.
              if (
                camera === 'front' &&
                !clip.duration &&
                timeoutCount < MAX_TIMEOUTS
              ) {
                const start = performance.now();
                clip.duration = await this._probeClipDuration(clip.url);
                const elapsed = performance.now() - start;

                // If it took more than 2.5s (close to the 3s timeout), count as a near-timeout
                if (elapsed > 2500) timeoutCount++;
                durationLoaded = true;
              }
            }
          } catch (e) {
            console.error(`Failed to prepare ${camera}:`, e);
          }
        }
      }

      // Fallback if front camera was missing but other cameras existed
      const frontClip = group.clips.front;
      if (!durationLoaded && frontClip && !frontClip.duration) {
        frontClip.duration = 60;
      }
    }
  }

  /**
   * Helper to probe video duration from a URL
   */
  async _probeClipDuration(url) {
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
   * Update event info display
   * @param {Object} event
   */
  updateEventInfo(event) {
    const date = new Date(event.timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    this.eventDateElement.textContent = `${dateStr} at ${timeStr}`;

    if (event.metadata) {
      const city = event.metadata.city || '';
      const street = event.metadata.street || '';
      let location = '';

      if (city && street) {
        location = `${street}, ${city}`;
      } else if (city) {
        location = city;
      } else if (street) {
        location = street;
      }

      // Add GPS coordinates if available
      if (event.metadata.est_lat && event.metadata.est_lon) {
        const lat = parseFloat(event.metadata.est_lat);
        const lon = parseFloat(event.metadata.est_lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          const gpsLink = `https://www.google.com/maps?q=${lat},${lon}`;
          const gpsText = `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          location += location ? ` • ` : '';
          location += `<a href="${gpsLink}" target="_blank" style="color: var(--accent); text-decoration: none;" title="Open in Google Maps">${gpsText}</a>`;
          // Initialize street view button with event GPS
          this._updateStreetViewButton(lat, lon, 0);
        }
      } else {
        // Disable street view button when no GPS
        this._updateStreetViewButton(null, null, 0);
      }

      // Add camera info for Sentry events.
      //
      // Labels come from the unified cameraIds table (js/cameraIds.js).
      // The user-facing copy still falls back to "Camera N" for any ID
      // we haven't verified against a real event — showing a guess
      // ("Triggered by Cabin camera") would be worse than showing the
      // raw ID, since a wrong guess is taken at face value.
      let reason = FolderParser.formatReason(event.metadata.reason);
      if (event.type === 'SentryClips' && event.metadata.camera) {
        const camId = event.metadata.camera;
        const verified = window.cameraIds?.isVerified(camId);
        const cameraName = verified
          ? window.cameraIds.label(camId)
          : `Camera ${camId}`;
        reason += ` • Triggered by ${cameraName} camera`;

        // Diagnostic logging for ground-truth collection (task #44).
        // Logs the available clip cameras alongside the trigger ID
        // so unverified IDs can be cross-referenced (e.g. an event
        // with rear clips triggered by ID 1 → evidence 1 = Rear).
        if (!verified) {
          const cams =
            (event.clipGroups?.[0]?.clips &&
              Object.keys(event.clipGroups[0].clips)) ||
            [];
          console.log(
            `[CameraID] Unverified trigger ID "${camId}" on ${event.name} — available clip cameras: [${cams.join(', ')}]`
          );
        }
      }

      this.eventLocationElement.innerHTML = location;
      this.eventReasonElement.textContent = reason;

      // Fetch and display weather
      this.updateEventWeather(event);
    } else {
      this.eventLocationElement.textContent = '';
      this.eventReasonElement.textContent = '';
      this.eventWeatherElement.textContent = '';
      // Disable street view button when no metadata
      this._updateStreetViewButton(null, null, 0);
    }
  }

  /**
   * Fetch and display weather for an event. Deferred via the background
   * scheduler so it doesn't compete with the critical video-load path
   * for network bandwidth or main-thread cycles.
   * @param {Object} event
   */
  async updateEventWeather(event) {
    // Clear previous weather immediately so stale data isn't shown.
    this.eventWeatherElement.textContent = '';

    if (
      !event.metadata?.est_lat ||
      !event.metadata?.est_lon ||
      !event.metadata?.timestamp
    ) {
      return;
    }

    const lat = parseFloat(event.metadata.est_lat);
    const lng = parseFloat(event.metadata.est_lon);
    if (isNaN(lat) || isNaN(lng)) return;

    try {
      const weather = await window.weatherService?.getWeather(
        lat,
        lng,
        event.metadata.timestamp
      );
      if (weather && this.currentEvent === event) {
        const formatted = window.weatherService.formatForDisplay(weather);
        this.eventWeatherElement.textContent = formatted;
        if (this.miniMapOverlay?.isVisible) {
          this.miniMapOverlay.setWeather(weather);
        }
      }
    } catch (error) {
      console.warn('[App] Failed to fetch weather:', error);
    }
  }

  /**
   * Fetch weather from SEI telemetry data (for RecentClips without event.json)
   * @param {Object} event - Current event
   * @param {Object} seiData - SEI telemetry data with frames
   */
  async _fetchWeatherFromTelemetry(event, seiData) {
    if (!seiData?.frames?.length || !window.weatherService) return;

    // Find first frame with valid GPS
    const frameWithGps = seiData.frames.find(
      (f) =>
        f.latitude_deg &&
        f.longitude_deg &&
        f.latitude_deg !== 0 &&
        f.longitude_deg !== 0
    );

    if (!frameWithGps) return;

    const lat = frameWithGps.latitude_deg;
    const lng = frameWithGps.longitude_deg;

    // Get timestamp from event (derived from filename for RecentClips)
    const timestamp = event.timestamp;
    if (!timestamp) return;

    this._weatherFetchedFromTelemetry = true;

    try {
      console.log(
        `[Weather] Fetching from telemetry GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
      );
      const weather = await window.weatherService.getWeather(
        lat,
        lng,
        timestamp
      );

      if (weather) {
        const formatted = window.weatherService.formatForDisplay(weather);
        this.eventWeatherElement.textContent = formatted;

        // Also update mini-map if visible
        if (this.miniMapOverlay?.isVisible) {
          this.miniMapOverlay.setWeather(weather);
        }

        // Update street view button with telemetry GPS
        this._updateStreetViewButton(lat, lng, frameWithGps.heading_deg || 0);

        console.log(`[Weather] Loaded from telemetry: ${formatted}`);
      }
    } catch (error) {
      console.warn('[App] Failed to fetch weather from telemetry:', error);
    }
  }

  /**
   * Timeline seek handler
   * @param {number} time Absolute time in event
   */
  async onTimelineSeeked(time) {
    this.showLoading('Seeking...');
    await this.videoPlayer.pause();
    await this.videoPlayer.seekToEventTime(time);
    this.hideLoading();
  }

  /**
   * Get absolute event time from current clip time
   * Uses cached clip durations for accuracy when available
   * @param {number} clipTime
   * @returns {number}
   */
  getAbsoluteEventTime(clipTime) {
    return this.videoPlayer.absoluteTime;
  }

  /**
   * Play video
   */
  async play() {
    await this.videoPlayer.play();
    this.updatePlaybackButtons();

    // Lock to landscape if setting is enabled (mobile only)
    if (this.settingsManager.get('lockOrientationDuringPlayback')) {
      this.lockOrientation();
    }
  }

  /**
   * Pause video
   */
  async pause() {
    await this.videoPlayer.pause();
    this.updatePlaybackButtons();

    // Unlock orientation when paused
    if (this.settingsManager.get('lockOrientationDuringPlayback')) {
      this.unlockOrientation();
    }
  }

  /**
   * Toggle play/pause
   */
  async togglePlayback() {
    if (this.videoPlayer.paused) {
      await this.play();
    } else {
      await this.pause();
    }
  }

  /**
   * Lock screen orientation to landscape (mobile only)
   */
  async lockOrientation() {
    try {
      // Check if Screen Orientation API is supported
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
        console.log('Orientation locked to landscape');
      }
    } catch (e) {
      // Graceful degradation - not supported or not allowed
      console.log('Orientation lock not available:', e.message);
    }
  }

  /**
   * Unlock screen orientation
   */
  unlockOrientation() {
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
        console.log('Orientation unlocked');
      }
    } catch (e) {
      console.log('Orientation unlock not available:', e.message);
    }
  }

  /**
   * Go to previous clip
   */
  async previousClip() {
    await this.videoPlayer.previousClip();
  }

  /**
   * Go to next clip
   */
  async nextClip() {
    await this.videoPlayer.nextClip();
  }

  /**
   * Update playback button states
   */
  updatePlaybackButtons() {
    const isPlaying = !this.videoPlayer.paused;

    // Update combined play/pause button icon
    if (this.playPauseBtn) {
      const playIcon = this.playPauseBtn.querySelector('.play-icon');
      const pauseIcon = this.playPauseBtn.querySelector('.pause-icon');
      if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? 'none' : '';
        pauseIcon.style.display = isPlaying ? '' : 'none';
      }
      // Update aria-label for accessibility
      this.playPauseBtn.setAttribute(
        'aria-label',
        isPlaying ? 'Pause' : 'Play'
      );
    }

    // Update bottom sheet play button icon
    if (this.bottomSheetPlayBtn) {
      const svg = this.bottomSheetPlayBtn.querySelector('svg');
      if (svg) {
        svg.innerHTML = isPlaying
          ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' // Pause icon
          : '<path d="M8 5v14l11-7z"/>'; // Play icon
      }
    }

    // Update fullscreen play button icon
    if (this.fullscreenPlayBtn) {
      const svg = this.fullscreenPlayBtn.querySelector('svg');
      if (svg) {
        svg.innerHTML = isPlaying
          ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' // Pause icon
          : '<path d="M8 5v14l11-7z"/>'; // Play icon
      }
    }
  }

  /**
   * Disable all controls (during export)
   */
  disableAllControls() {
    console.log('Disabling all controls...');
    this.playPauseBtn.disabled = true;
    this.frameBackBtn.disabled = true;
    this.frameForwardBtn.disabled = true;
    this.prevClipBtn.disabled = true;
    this.nextClipBtn.disabled = true;
    this.screenshotBtn.disabled = true;
    this.pipBtn.disabled = true;
    this.enhanceBtn.disabled = true;
    this.markInBtn.disabled = true;
    this.markOutBtn.disabled = true;
    this.clearMarksBtn.disabled = true;
    this.exportBtn.disabled = true;
    this.exportDropdownBtn.disabled = true;
    this.prevEventBtn.disabled = true;
    this.nextEventBtn.disabled = true;
    this.speedSelect.disabled = true;
    this.loopCheckbox.disabled = true;
    console.log(
      'All controls disabled. Export button disabled:',
      this.exportBtn.disabled
    );
  }

  /**
   * Disable playback controls (during export)
   */
  disableControls() {
    this.playPauseBtn.disabled = true;
    this.frameBackBtn.disabled = true;
    this.frameForwardBtn.disabled = true;
    this.prevClipBtn.disabled = true;
    this.nextClipBtn.disabled = true;
    this.screenshotBtn.disabled = true;
    this.pipBtn.disabled = true;
    this.enhanceBtn.disabled = true;
    this.markInBtn.disabled = true;
    this.markOutBtn.disabled = true;
    this.clearMarksBtn.disabled = true;
    this.exportBtn.disabled = true;
    this.exportDropdownBtn.disabled = true;
    this.prevBookmarkBtn.disabled = true;
    this.addBookmarkBtn.disabled = true;
    this.nextBookmarkBtn.disabled = true;
    this.bookmarksListBtn.disabled = true;
    this.zoomOutBtn.disabled = true;
    this.zoomInBtn.disabled = true;
    this.zoomResetBtn.disabled = true;
    this.speedSelect.disabled = true;
    this.loopCheckbox.disabled = true;
    this.loopBtn.disabled = true;
    this.prevEventBtn.disabled = true;
    this.nextEventBtn.disabled = true;

    // Hide mobile fullscreen button
    if (this.mobileFullscreenBtn) {
      this.mobileFullscreenBtn.classList.add('hidden');
    }
  }

  /**
   * Enable playback controls
   */
  enableControls() {
    this.playPauseBtn.disabled = false;
    this.frameBackBtn.disabled = false;
    this.frameForwardBtn.disabled = false;
    this.prevClipBtn.disabled = false;
    this.nextClipBtn.disabled = false;
    this.screenshotBtn.disabled = false;
    this.pipBtn.disabled = !document.pictureInPictureEnabled; // Only enable if PiP is supported
    this.enhanceBtn.disabled = false;
    this.markInBtn.disabled = false;
    this.markOutBtn.disabled = false;
    this.clearMarksBtn.disabled = false;
    this.exportBtn.disabled = false;
    this.exportDropdownBtn.disabled = false;
    this.prevBookmarkBtn.disabled = false;
    this.addBookmarkBtn.disabled = false;

    // Enable overlay toggle buttons
    if (this.toggleMiniMapBtn) this.toggleMiniMapBtn.disabled = false;
    if (this.toggleStreetViewBtn) this.toggleStreetViewBtn.disabled = false;
    if (this.toggleBirdsEyeBtn) this.toggleBirdsEyeBtn.disabled = false;
    this._updateOverlayButtonStates();
    this.nextBookmarkBtn.disabled = false;
    this.bookmarksListBtn.disabled = false;
    this.zoomOutBtn.disabled = false;
    this.zoomInBtn.disabled = false;
    this.zoomResetBtn.disabled = false;
    this.speedSelect.disabled = false;
    this.loopCheckbox.disabled = false;
    this.loopBtn.disabled = false;

    // Event navigation buttons
    this.prevEventBtn.disabled = this.currentEventIndex <= 0;
    this.nextEventBtn.disabled =
      this.currentEventIndex >= this.allEvents.length - 1;

    // Show mobile fullscreen button
    if (this.mobileFullscreenBtn) {
      this.mobileFullscreenBtn.classList.remove('hidden');
    }
  }

  /**
   * Update overlay button active states
   */
  _updateOverlayButtonStates() {
    if (this.toggleMiniMapBtn) {
      this.toggleMiniMapBtn.classList.toggle(
        'active',
        this.miniMapOverlay?.isVisible || false
      );
    }
    if (this.toggleStreetViewBtn) {
      this.toggleStreetViewBtn.classList.toggle(
        'active',
        this.streetViewOverlay?.isVisible || false
      );
    }
    if (this.toggleBirdsEyeBtn) {
      this.toggleBirdsEyeBtn.classList.toggle(
        'active',
        this.collisionReconstruction?.isVisible || false
      );
    }

    // Also update mobile more menu status
    this._updateMobileMoreMenuStatus();
  }

  /**
   * Update mobile more menu status indicators
   */
  _updateMobileMoreMenuStatus() {
    if (this.mobileMiniMapStatus) {
      const isMapOn = this.miniMapOverlay?.isVisible || false;
      this.mobileMiniMapStatus.textContent = isMapOn ? 'ON' : 'OFF';
      this.mobileMiniMapStatus
        .closest('.mobile-more-option')
        ?.classList.toggle('active', isMapOn);
    }
    // Sync mobile layout select with main layout select
    if (this.mobileLayoutSelect && this.layoutSelect) {
      this.mobileLayoutSelect.value = this.layoutSelect.value;
    }
  }

  /**
   * Handle mobile more menu actions
   */
  _handleMobileMoreAction(action) {
    switch (action) {
      case 'toggle-minimap':
        this.toggleMiniMapBtn?.click();
        break;
      case 'enhance':
        this.enhanceBtn?.click();
        this.mobileMoreMenu?.classList.add('hidden');
        break;
      case 'screenshot':
        this.screenshotBtn?.click();
        this.mobileMoreMenu?.classList.add('hidden');
        break;
      case 'export-video':
        this.exportBtn?.click();
        this.mobileMoreMenu?.classList.add('hidden');
        break;
    }
    // Update status after action
    setTimeout(() => this._updateMobileMoreMenuStatus(), 100);
  }

  /**
   * Set up the Street View button in the info bar
   */
  _setupStreetViewButton() {
    // Create tooltip element
    this.streetViewTooltip = document.createElement('div');
    this.streetViewTooltip.className = 'street-view-tooltip';
    this.streetViewTooltip.innerHTML = `
            <div class="coords">--</div>
            <div class="hint">Click to open Street View</div>
        `;
    this.streetViewBtn.appendChild(this.streetViewTooltip);

    // Click handler - open Google Street View
    this.streetViewBtn.addEventListener('click', () => {
      if (this.currentGpsLat !== null && this.currentGpsLng !== null) {
        const heading = this.currentGpsHeading || 0;
        const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${this.currentGpsLat},${this.currentGpsLng}&heading=${heading}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  }

  /**
   * Update Street View button with current GPS position
   */
  _updateStreetViewButton(lat, lng, heading = 0) {
    this.currentGpsLat = lat;
    this.currentGpsLng = lng;
    this.currentGpsHeading = heading;

    if (this.streetViewBtn) {
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        this.streetViewBtn.disabled = false;
        // Update tooltip with coordinates and heading
        if (this.streetViewTooltip) {
          const latDir = lat >= 0 ? 'N' : 'S';
          const lngDir = lng >= 0 ? 'E' : 'W';
          const coordsEl = this.streetViewTooltip.querySelector('.coords');
          if (coordsEl) {
            let text = `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
            if (heading !== null && heading !== undefined && !isNaN(heading)) {
              const dir = this._headingToDirection(heading);
              text += ` · ${Math.round(heading)}° ${dir}`;
            }
            coordsEl.textContent = text;
          }
        }
      } else {
        this.streetViewBtn.disabled = true;
      }
    }
  }

  /**
   * Convert heading degrees to cardinal direction
   */
  _headingToDirection(heading) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round((((heading % 360) + 360) % 360) / 45) % 8;
    return dirs[index];
  }

  /**
   * Start frame stepping (hold button for slow-mo)
   * @param {number} direction -1 for backward, 1 for forward
   */
  startFrameStepping(direction) {
    // Pause playback first
    if (!this.videoPlayer.paused) {
      this.pause();
    }

    // Step one frame immediately
    this.stepFrame(direction);

    // Continue stepping while button is held
    this.frameStepInterval = setInterval(() => {
      this.stepFrame(direction);
    }, this.frameStepRate);
  }

  /**
   * Stop frame stepping
   */
  stopFrameStepping() {
    if (this.frameStepInterval) {
      clearInterval(this.frameStepInterval);
      this.frameStepInterval = null;
    }
  }

  /**
   * Step one frame in specified direction
   * @param {number} direction -1 for backward, 1 for forward
   */
  async stepFrame(direction) {
    const currentTime = this.videoPlayer.currentTime;
    const frameRate = 30; // Assume 30fps for Tesla cameras
    const frameDuration = 1 / frameRate;

    const newTime = currentTime + frameDuration * direction;
    await this.videoPlayer.seek(newTime); // Don't clamp to 0, let seek() handle negative values
  }

  /**
   * Frame step - single step for button click (used by bottom sheet)
   * @param {number} direction -1 for backward, 1 for forward
   */
  async frameStep(direction) {
    // Pause playback first
    if (!this.videoPlayer.paused) {
      await this.pause();
    }
    await this.stepFrame(direction);
  }

  /**
   * Navigate to previous event
   */
  async previousEvent() {
    if (this.currentEventIndex > 0) {
      const prevEvent = this.allEvents[this.currentEventIndex - 1];
      await this.eventBrowser.selectEvent(prevEvent);
    }
  }

  /**
   * Navigate to next event
   */
  async nextEvent() {
    if (this.currentEventIndex < this.allEvents.length - 1) {
      const nextEvent = this.allEvents[this.currentEventIndex + 1];
      await this.eventBrowser.selectEvent(nextEvent);
    }
  }

  /**
   * Auto-play next event in continuous playback mode
   */
  async autoPlayNextEvent() {
    if (this.currentEventIndex >= this.allEvents.length - 1) {
      console.log('No more events to auto-play');
      return;
    }

    const nextEvent = this.allEvents[this.currentEventIndex + 1];
    console.log('Auto-playing next event:', nextEvent.name);

    // Select and play the next event
    await this.eventBrowser.selectEvent(nextEvent);
  }

  /**
   * Capture screenshot of current frame
   */
  async captureScreenshot() {
    try {
      await this.screenshotCapture.captureComposite({
        includeTimestamp: true,
        format: 'png',
        quality: 0.95,
      });
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screenshot. Make sure a video is loaded.');
    }
  }

  /**
   * Toggle Picture-in-Picture mode for front camera
   */
  async togglePictureInPicture() {
    try {
      // Check if PiP is supported
      if (!document.pictureInPictureEnabled) {
        alert('Picture-in-Picture is not supported in this browser.');
        return;
      }

      // Check if there's already a PiP window open
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.pipBtn.classList.remove('active');
        return;
      }

      // Get the focused camera or default to front
      const focusCamera = this.layoutManager.focusCamera || 'front';
      const videoMap = {
        front: document.getElementById('videoFront'),
        back: document.getElementById('videoBack'),
        left_repeater: document.getElementById('videoLeft'),
        right_repeater: document.getElementById('videoRight'),
      };

      const videoElement = videoMap[focusCamera];

      if (!videoElement || !videoElement.src) {
        alert('No video loaded. Please select an event first.');
        return;
      }

      // Request Picture-in-Picture
      await videoElement.requestPictureInPicture();
      this.pipBtn.classList.add('active');

      // Listen for PiP window close
      videoElement.addEventListener(
        'leavepictureinpicture',
        () => {
          this.pipBtn.classList.remove('active');
        },
        { once: true }
      );
    } catch (error) {
      console.error('Error toggling Picture-in-Picture:', error);
      if (error.name === 'NotAllowedError') {
        alert('Picture-in-Picture was blocked. Try clicking the button again.');
      }
    }
  }

  /**
   * Mark in point
   */
  markIn() {
    const time = this.clipMarking.setInPoint();
    console.log(`Mark IN set at ${this.formatTime(time)}`);
  }

  /**
   * Mark out point
   */
  markOut() {
    const time = this.clipMarking.setOutPoint();
    console.log(`Mark OUT set at ${this.formatTime(time)}`);
  }

  /**
   * Clear all marks
   */
  clearMarks() {
    this.clipMarking.clearMarks();
    console.log('Marks cleared');
  }

  /**
   * Export video (current clip or marked section)
   * @param {string} camera - Camera to export ('all', 'front', 'back', 'left_repeater', 'right_repeater')
   */
  /**
   * Export video (current clip or marked section)
   * @param {string} camera - Camera to export ('all', 'front', 'back', 'left_repeater', 'right_repeater')
   */
  async exportVideo(camera = 'all') {
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

    const formatSelect = document.getElementById('exportFormatSelect');
    const format = formatSelect?.value || this.settingsManager?.get('exportFormat') || 'mp4';
    await this.videoExport.startExport({ camera, format });
  }

  /**
   * Add bookmark at current position
   */
  addBookmark() {
    if (!this.currentEvent) return;
    const bookmark = this.timeline.addBookmark();
    console.log(
      `Bookmark added: ${bookmark.label} at ${this.formatTime(bookmark.time)}`
    );
  }

  /**
   * Jump to previous bookmark
   */
  jumpToPreviousBookmark() {
    if (!this.currentEvent) return;
    console.log(
      'Jump to previous bookmark. Current time:',
      this.timeline.currentTime
    );
    console.log('Bookmarks:', this.timeline.bookmarks);
    const bookmark = this.timeline.jumpToPreviousBookmark();
    if (bookmark) {
      console.log(
        `Jumped to bookmark: ${bookmark.label} at ${this.formatTime(bookmark.time)}`
      );
    } else {
      console.log('No previous bookmark found');
    }
  }

  /**
   * Jump to next bookmark
   */
  jumpToNextBookmark() {
    if (!this.currentEvent) return;
    console.log(
      'Jump to next bookmark. Current time:',
      this.timeline.currentTime
    );
    console.log('Bookmarks:', this.timeline.bookmarks);
    const bookmark = this.timeline.jumpToNextBookmark();
    if (bookmark) {
      console.log(
        `Jumped to bookmark: ${bookmark.label} at ${this.formatTime(bookmark.time)}`
      );
    } else {
      console.log('No next bookmark found');
    }
  }

  /**
   * Toggle bookmarks dropdown visibility
   */
  toggleBookmarksDropdown() {
    const isHidden = this.bookmarksDropdown.classList.contains('hidden');
    if (isHidden) {
      this.updateBookmarksList();
      this.bookmarksDropdown.classList.remove('hidden');
      // Close export dropdown if open
      this.exportDropdown.classList.add('hidden');
    } else {
      this.bookmarksDropdown.classList.add('hidden');
    }
  }

  /**
   * Toggle export dropdown visibility
   */
  toggleExportDropdown() {
    const isHidden = this.exportDropdown.classList.contains('hidden');
    if (isHidden) {
      // Update the "All Cameras" option to show current layout name
      this.updateExportLayoutName();
      this.exportDropdown.classList.remove('hidden');
      // Close bookmarks dropdown if open
      this.bookmarksDropdown.classList.add('hidden');
    } else {
      this.exportDropdown.classList.add('hidden');
    }
  }

  /**
   * Update export dropdown to show current layout name
   */
  updateExportLayoutName() {
    const exportVideoBtn = document.getElementById('exportVideoBtn');
    if (exportVideoBtn && this.layoutManager) {
      const config = this.layoutManager.getCurrentConfig();
      const layoutName = config?.name || this.layoutManager.getCurrentLayout();
      // Format the display name - capitalize each word
      const displayName = layoutName
        .replace(/^layout-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      // Keep the icon and update the text
      const icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>`;
      exportVideoBtn.innerHTML = `${icon}<span>Export Video<span class="layout-name-line">${displayName}</span></span>`;
    }
  }

  /**
   * Toggle mobile sidebar drawer
   */
  toggleSidebar() {
    const isOpen = this.sidebar.classList.contains('open');
    if (isOpen) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  /**
   * Open mobile sidebar drawer
   */
  openSidebar() {
    this.sidebar.classList.add('open');
    this.sidebarOverlay.classList.remove('hidden');
    this.sidebarOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  }

  /**
   * Close mobile sidebar drawer
   */
  closeSidebar() {
    this.sidebar.classList.remove('open');
    this.sidebarOverlay.classList.remove('visible');
    this.sidebarOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  /**
   * Update the bookmarks list in the dropdown
   */
  updateBookmarksList() {
    const bookmarks = this.timeline.getBookmarks();

    if (bookmarks.length === 0) {
      this.bookmarksList.innerHTML =
        '<p class="no-bookmarks">No bookmarks yet</p>';
      this.clearAllBookmarksBtn.style.display = 'none';
      return;
    }

    this.clearAllBookmarksBtn.style.display = 'block';

    // Sort by time
    const sortedBookmarks = [...bookmarks].sort((a, b) => a.time - b.time);

    this.bookmarksList.innerHTML = sortedBookmarks
      .map(
        (bookmark) => `
            <div class="bookmark-item" data-bookmark-id="${bookmark.id}" data-time="${bookmark.time}">
                <span class="bookmark-item-time">${this.formatTime(bookmark.time)}</span>
                <span class="bookmark-item-label">${bookmark.label}</span>
                <button class="bookmark-delete-btn" data-bookmark-id="${bookmark.id}" title="Delete bookmark">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        `
      )
      .join('');

    // Add click handlers for jumping to bookmarks
    this.bookmarksList.querySelectorAll('.bookmark-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.bookmark-delete-btn')) return;
        const time = parseFloat(item.dataset.time);
        if (this.timeline.onSeek) {
          this.timeline.onSeek(time);
        }
        this.bookmarksDropdown.classList.add('hidden');
      });
    });

    // Add click handlers for delete buttons
    this.bookmarksList
      .querySelectorAll('.bookmark-delete-btn')
      .forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.bookmarkId, 10);
          this.timeline.removeBookmark(id);
          this.updateBookmarksList();
        });
      });
  }

  /**
   * Clear all bookmarks for current event
   */
  clearAllBookmarks() {
    if (!this.currentEvent) return;
    if (confirm('Remove all bookmarks for this event?')) {
      this.timeline.clearBookmarks();
      this.updateBookmarksList();
    }
  }

  /**
   * Format time in MM:SS
   * @param {number} seconds
   * @returns {string}
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} event
   */
  async handleKeyPress(event) {
    // Ignore if typing in input
    if (event.target.tagName === 'INPUT') return;

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (!this.videoPlayer.paused) {
          this.pause();
        } else {
          this.play();
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          this.previousClip();
        } else {
          // Seek back 5 seconds (allow negative to trigger previous clip)
          const currentTime = this.videoPlayer.currentTime;
          await this.videoPlayer.seek(currentTime - 5);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          this.nextClip();
        } else {
          // Seek forward 5 seconds
          const currentTime = this.videoPlayer.currentTime;
          await this.videoPlayer.seek(currentTime + 5);
        }
        break;

      case 'KeyL':
        event.preventDefault();
        this.layoutManager.nextLayout();
        this.layoutSelect.value = this.layoutManager.getCurrentLayout();
        break;

      // Note: [ and ] are now used for bookmark navigation (see below)
      // Frame stepping moved to , and . keys

      case 'KeyH':
      case 'Slash':
        // ? or H for help
        if (event.key === '?' || event.code === 'KeyH') {
          event.preventDefault();
          this.helpModal.toggle();
        }
        break;

      case 'Comma':
        // , for frame back (pairs with . for frame forward)
        event.preventDefault();
        this.stepFrame(-1);
        break;

      case 'KeyQ':
        // Q for quick settings
        event.preventDefault();
        this.settingsManager.showSettingsModal();
        break;

      case 'KeyI':
        // I for mark in
        event.preventDefault();
        if (!this.markInBtn.disabled) {
          this.markIn();
        }
        break;

      case 'KeyO':
        // O for mark out
        event.preventDefault();
        if (!this.markOutBtn.disabled) {
          this.markOut();
        }
        break;

      case 'KeyS':
        // S for screenshot
        event.preventDefault();
        if (!this.screenshotBtn.disabled) {
          this.captureScreenshot();
        }
        break;

      case 'KeyM':
        // M for mini-map toggle
        event.preventDefault();
        if (this.miniMapOverlay) {
          this.miniMapOverlay.toggle();
        }
        break;

      // Note: 'G' keyboard shortcut removed - telemetry graphs are now always visible in sidebar

      case 'KeyP':
        // P for Picture-in-Picture
        event.preventDefault();
        if (!this.pipBtn.disabled) {
          this.togglePictureInPicture();
        }
        break;

      case 'KeyE':
        // E for export
        event.preventDefault();
        if (!this.exportBtn.disabled) {
          this.exportVideo();
        }
        break;

      case 'KeyF':
        // F for fullscreen
        event.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;

      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
        // 1-6 for focus camera (includes pillar cameras)
        event.preventDefault();
        const cameras = [
          'front',
          'back',
          'left_repeater',
          'right_repeater',
          'left_pillar',
          'right_pillar',
        ];
        const cameraIndex = parseInt(event.key) - 1;
        if (cameraIndex >= 0 && cameraIndex < cameras.length) {
          this.layoutManager.setLayout('layout-focus');
          this.layoutManager.setFocusCamera(cameras[cameraIndex]);
          this.layoutSelect.value = 'layout-focus';
          document.getElementById('focusCameraControl').style.display = 'flex';
          document.getElementById('focusCameraSelect').value =
            cameras[cameraIndex];
        }
        break;

      case 'Digit0':
        // 0 to reset speed to 1x
        event.preventDefault();
        this.speedSelect.value = '1';
        this.videoPlayer.playbackRate = 1;
        break;

      case 'Equal':
      case 'NumpadAdd':
        // + to increase speed
        event.preventDefault();
        this.changeSpeed(1);
        break;

      case 'Minus':
      case 'NumpadSubtract':
        // - to decrease speed
        event.preventDefault();
        this.changeSpeed(-1);
        break;

      case 'PageUp':
        // Previous event
        event.preventDefault();
        if (!this.prevEventBtn.disabled) {
          this.previousEvent();
        }
        break;

      case 'PageDown':
        // Next event
        event.preventDefault();
        if (!this.nextEventBtn.disabled) {
          this.nextEvent();
        }
        break;

      case 'Home':
        // Go to start
        event.preventDefault();
        if (this.currentEvent) {
          this.videoPlayer.seekToEventTime(0);
        }
        break;

      case 'End':
        // Go to end
        event.preventDefault();
        if (this.currentEvent) {
          const duration = this.timeline.duration;
          this.videoPlayer.seekToEventTime(Math.max(0, duration - 1));
        }
        break;

      case 'Escape':
        // Exit mobile fullscreen, clear marks or close modals
        event.preventDefault();
        if (this.isMobileFullscreen) {
          this.exitMobileFullscreen();
        } else if (this.clipMarking.hasMarks()) {
          this.clearMarks();
        }
        break;

      case 'KeyB':
        // B for bookmark
        event.preventDefault();
        this.addBookmark();
        break;

      case 'BracketLeft':
        // [ for previous bookmark
        event.preventDefault();
        this.jumpToPreviousBookmark();
        break;

      case 'BracketRight':
        // ] for next bookmark
        event.preventDefault();
        this.jumpToNextBookmark();
        break;

      case 'ArrowUp':
        // Up arrow for select previous event in list
        event.preventDefault();
        if (!this.prevEventBtn.disabled) {
          this.previousEvent();
        }
        break;

      case 'ArrowDown':
        // Down arrow for select next event in list
        event.preventDefault();
        if (!this.nextEventBtn.disabled) {
          this.nextEvent();
        }
        break;

      case 'Period':
        // . for frame forward
        event.preventDefault();
        this.stepFrame(1);
        break;
    }
  }

  /**
   * Change playback speed by step
   * @param {number} direction 1 for faster, -1 for slower
   */
  changeSpeed(direction) {
    const speeds = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '2', '5', '10'];
    const currentIndex = speeds.indexOf(this.speedSelect.value);
    const newIndex = Math.max(
      0,
      Math.min(speeds.length - 1, currentIndex + direction)
    );
    this.speedSelect.value = speeds[newIndex];
    this.videoPlayer.playbackRate = parseFloat(speeds[newIndex]);
  }

  /**
   * Show loading overlay
   * @param {string} message
   */
  showLoading(message = 'Loading...') {
    this.loadingText.textContent = message;
    this.loadingOverlay.style.display = 'flex';
    this.loadingOverlay.classList.remove('hidden');
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    this.loadingOverlay.classList.add('hidden');
    this.loadingOverlay.style.display = 'none';
  }

  /**
   * Update loading overlay message
   * @param {string} message
   */
  updateLoading(message) {
    this.loadingText.textContent = message;
  }

  /**
   * Show export completion overlay.
   * @param {{cancelled?: boolean}} [opts] cancelled=true uses amber styling
   *   and "Export Cancelled" copy instead of the green success state.
   */
  /**
   * Lightweight bottom-right toast — stacked, dismissible, auto-fades.
   * Shared by the free-tier warning + any other ad-hoc notification path
   * that doesn't need a dedicated overlay.
   *
   * @param {string} message
   * @param {'info'|'warn'|'error'} [kind='info']
   * @param {number} [durationMs=5000]
   */
  showToast(message, kind = 'info', durationMs = 5000) {
    let stack = document.getElementById('appToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'appToastStack';
      stack.style.cssText = `
                position: fixed; bottom: 20px; right: 20px;
                display: flex; flex-direction: column; gap: 8px;
                z-index: 10001; pointer-events: none;`;
      document.body.appendChild(stack);
    }
    const accent =
      kind === 'error'
        ? '#ff3b3b'
        : kind === 'warn'
          ? '#ffb800'
          : 'var(--accent, #00d4ff)';
    const toast = document.createElement('div');
    toast.style.cssText = `
            background: var(--bg-elevated, #1c2230);
            border: 1px solid ${accent};
            color: var(--text-primary, #e8eaed);
            padding: 10px 14px;
            border-radius: 6px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            font-size: 0.9rem;
            max-width: 360px;
            pointer-events: auto;
            cursor: pointer;
            opacity: 0;
            transform: translateX(20px);
            transition: opacity 0.2s, transform 0.2s;`;
    toast.textContent = message;
    toast.addEventListener('click', () => {
      toast.remove();
    });
    stack.appendChild(toast);
    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    }, durationMs);
  }

  /**
   * Toast a soft warning at the 5th and 8th free-tier event views so the
   * user has visibility into the daily runway BEFORE we pop the limit
   * modal at #11. Each warning fires once per day. The thresholds match
   * "halfway there" and "two left" cues — friendlier than going from
   * silent to blocked.
   *
   * @param {Object} access — checkAccess result; uses access.remaining
   */
  _maybeShowFreeTierWarning(access) {
    if (!access || access.allowed === false) return;
    if (access.remaining == null || access.limit == null) return;
    // Compute viewed-so-far. checkAccess returns "remaining" BEFORE
    // recordEventView fires for this event, so the 5th view we want
    // to warn about lands at remaining = limit - 4 (next click bumps
    // to remaining = limit - 5, i.e. 5 viewed).
    const viewedAfter = access.limit - access.remaining + 1;
    if (viewedAfter !== 5 && viewedAfter !== 8) return;

    // Per-day dedupe — one toast per threshold per day.
    const today = new Date().toISOString().slice(0, 10);
    const dedupeKey = `tcv_freetier_warn_${today}_${viewedAfter}`;
    if (localStorage.getItem(dedupeKey)) return;
    localStorage.setItem(dedupeKey, '1');

    const left = access.limit - viewedAfter;
    const message =
      viewedAfter === 5
        ? `${viewedAfter} of ${access.limit} free events viewed today. ${left} remaining.`
        : `${left} free event${left === 1 ? '' : 's'} left today. Already-viewed events stay accessible after limit.`;
    if (typeof this.showToast === 'function') {
      this.showToast(message, 'info', 8000);
    } else {
      console.log('[FreeTier]', message);
    }
  }

  /**
   * Mirror of _maybeShowFreeTierWarning for the export cap. Only 2 free
   * exports per day, so the only meaningful threshold is "1 of 2 used"
   * — toasted on the first export to give the user fair warning before
   * they hit the wall. The modal handles the hard-stop case at 2.
   *
   * @param {Object} access — checkAccess result from sessionManager
   */
  _maybeShowExportWarning(access) {
    if (!access || access.allowed === false) return;
    if (access.remaining == null || access.limit == null) return;
    const usedAfter = access.limit - access.remaining + 1;
    if (usedAfter !== 1) return;

    const today = new Date().toISOString().slice(0, 10);
    const dedupeKey = `tcv_export_warn_${today}_${usedAfter}`;
    if (localStorage.getItem(dedupeKey)) return;
    localStorage.setItem(dedupeKey, '1');

    const left = access.limit - usedAfter;
    const message = `${usedAfter} of ${access.limit} free exports used today. ${left} remaining. Re-exporting the same event stays free.`;
    if (typeof this.showToast === 'function') {
      this.showToast(message, 'info', 8000);
    } else {
      console.log('[FreeTier:Export]', message);
    }
  }

  showExportComplete(opts = {}) {
    const cancelled = opts.cancelled === true;
    const title = cancelled ? 'Export Cancelled' : 'Export Complete';
    const subtitle = cancelled
      ? 'The export was stopped before it finished. No file was saved.'
      : 'Your video has been saved successfully.';
    const titleColor = cancelled ? '#ffb800' : '#4caf50';
    const barGradient = cancelled
      ? 'linear-gradient(90deg, #ffb800, #ff8800)'
      : 'linear-gradient(90deg, #4caf50, #66bb6a)';

    this.loadingOverlay.style.display = 'flex';
    this.loadingOverlay.classList.remove('hidden');
    this.loadingText.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: ${titleColor};">
                    ${title}
                </div>
                <div style="font-size: 1rem; color: #e0e0e0; margin-bottom: 2rem;">
                    ${subtitle}
                </div>
                <div style="width: 300px; height: 8px; background: #3a3a3a; border-radius: 4px; margin: 1rem auto 2rem; overflow: hidden;">
                    <div style="width: 100%; height: 100%; background: ${barGradient};"></div>
                </div>
                <button id="exportCompleteBtn" style="
                    background: #4a9eff;
                    color: white;
                    border: none;
                    padding: 12px 32px;
                    font-size: 1rem;
                    font-weight: bold;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#3a8eef'" onmouseout="this.style.background='#4a9eff'">
                    OK
                </button>
            </div>
        `;

    // Wait for button to be in DOM, then add listener
    setTimeout(() => {
      const btn = document.getElementById('exportCompleteBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          this.hideLoading();
          this.enableControls();
        });
      }
    }, 100);
  }

  /**
   * Update mini-map from event GPS coordinates
   */
  _updateMiniMapFromEventGPS() {
    if (!this.currentEvent) return;

    const event = this.currentEvent;
    if (event.metadata?.est_lat && event.metadata?.est_lon) {
      const lat = parseFloat(event.metadata.est_lat);
      const lng = parseFloat(event.metadata.est_lon);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        if (this.miniMapOverlay) {
          if (
            this.miniMapOverlay.currentLat !== lat ||
            this.miniMapOverlay.currentLng !== lng
          ) {
            this.miniMapOverlay.updatePosition(lat, lng, 0);
          }
        }
        if (this.streetViewOverlay && this.streetViewOverlay.isVisible) {
          this.streetViewOverlay.updatePosition(lat, lng, 0);
        }
        this._updateStreetViewButton(lat, lng, 0);
      }
    }
  }

  // ==================== PILLAR CAMERA SUPPORT ====================

  /**
   * Update pillar layout options visibility based on whether event has pillar cameras
   * @param {boolean} hasPillars
   */
  updatePillarLayoutOptions(hasPillars) {
    // Show/hide 6-camera layout option
    const pillarLayoutOptions = document.querySelectorAll(
      '.pillar-layout-option'
    );
    pillarLayoutOptions.forEach((opt) => {
      opt.style.display = hasPillars ? '' : 'none';
    });

    // Show/hide pillar camera options in focus mode selector
    const pillarCameraOptions = document.querySelectorAll('.pillar-option');
    pillarCameraOptions.forEach((opt) => {
      opt.style.display = hasPillars ? '' : 'none';
    });
  }

  /**
   * Show diagnostic results after folder parsing
   * @param {boolean} forceShow - Show even if no errors
   */
  showParseDiagnostics(forceShow = false) {
    const summary = this.folderParser?.getDiagnosticSummary();
    if (!summary) return;

    const stats = summary.stats;
    const hasErrors = stats.errors.length > 0;
    const hasFailedReads = stats.eventJsonFailed > 0;

    // Only show automatically if there are issues
    if (!forceShow && !hasErrors && !hasFailedReads) {
      return;
    }

    // Create diagnostic toast
    const toast = document.createElement('div');
    toast.className = 'diagnostic-toast' + (hasErrors ? ' has-errors' : '');

    let message = '';
    if (hasErrors || hasFailedReads) {
      message = `⚠️ Parse completed with issues: ${stats.eventsCreated} events found`;
      if (hasFailedReads) {
        message += `, ${stats.eventJsonFailed} metadata read failures`;
      }
      if (hasErrors) {
        message += `, ${stats.errors.length} errors`;
      }
    } else {
      message = `✓ Loaded ${stats.eventsCreated} events (${stats.videoFilesFound} videos)`;
    }

    toast.innerHTML = `
            <div class="diagnostic-toast-content">
                <span class="diagnostic-message">${message}</span>
                <div class="diagnostic-actions">
                    <button class="diagnostic-btn copy-btn" title="Copy diagnostic report">📋 Copy Report</button>
                    <button class="diagnostic-btn close-btn" title="Dismiss">✕</button>
                </div>
            </div>
        `;

    document.body.appendChild(toast);

    // Handle copy button
    toast.querySelector('.copy-btn').addEventListener('click', () => {
      this.copyDiagnosticReport();
    });

    // Handle close button
    toast.querySelector('.close-btn').addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-dismiss after delay (longer if errors)
    const dismissDelay = hasErrors ? 15000 : 8000;
    setTimeout(() => {
      if (toast.isConnected) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }
    }, dismissDelay);
  }

  /**
   * Copy diagnostic report to clipboard
   */
  async copyDiagnosticReport() {
    const report = this.folderParser?.getDiagnosticReport();
    if (!report) {
      this.showSimpleToast('No diagnostic data available');
      return;
    }

    try {
      await navigator.clipboard.writeText(report);
      this.showSimpleToast('📋 Diagnostic report copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback: show in a modal for manual copy
      this.showDiagnosticModal(report);
    }
  }

  /**
   * Show diagnostic report in a modal (fallback for clipboard failure)
   */
  showDiagnosticModal(report) {
    const modal = document.createElement('div');
    modal.className = 'diagnostic-modal-overlay';
    modal.innerHTML = `
            <div class="diagnostic-modal">
                <div class="diagnostic-modal-header">
                    <h3>📋 Diagnostic Report</h3>
                    <button class="diagnostic-modal-close">✕</button>
                </div>
                <div class="diagnostic-modal-body">
                    <p>Copy the text below and include it in your bug report:</p>
                    <textarea readonly class="diagnostic-textarea">${report}</textarea>
                </div>
                <div class="diagnostic-modal-footer">
                    <a href="https://github.com/teslacamviewer/teslacamviewer.github.io/issues/new"
                       target="_blank" class="diagnostic-btn primary">
                        🐛 Open GitHub Issue
                    </a>
                    <button class="diagnostic-btn select-all">Select All</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Handle close
    modal
      .querySelector('.diagnostic-modal-close')
      .addEventListener('click', () => {
        modal.remove();
      });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Handle select all
    modal.querySelector('.select-all').addEventListener('click', () => {
      const textarea = modal.querySelector('.diagnostic-textarea');
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
    });

    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  /**
   * Show a simple toast notification
   */
  showSimpleToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'simple-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ===== Command Palette registration =====

  _registerCommandPaletteCommands() {
    if (!this.commandPalette) return;
    const safe = (fn) => () => {
      try {
        fn();
      } catch (e) {
        console.warn('[Command] failed:', e);
      }
    };

    this.commandPalette.registerMany([
      // Playback
      {
        id: 'play-pause',
        title: 'Play / Pause',
        category: 'Playback',
        shortcut: 'Space',
        keywords: 'play pause space',
        action: safe(() => {
          this.videoPlayer.paused ? this.play() : this.pause();
        }),
      },
      {
        id: 'next-clip',
        title: 'Next Clip',
        category: 'Playback',
        shortcut: 'Shift + →',
        keywords: 'clip forward skip',
        action: safe(() => this.nextClip()),
      },
      {
        id: 'prev-clip',
        title: 'Previous Clip',
        category: 'Playback',
        shortcut: 'Shift + ←',
        keywords: 'clip back skip',
        action: safe(() => this.previousClip()),
      },
      {
        id: 'next-event',
        title: 'Next Event',
        category: 'Playback',
        shortcut: '↓',
        keywords: 'event navigate',
        action: safe(() => this.nextEvent && this.nextEvent()),
      },
      {
        id: 'prev-event',
        title: 'Previous Event',
        category: 'Playback',
        shortcut: '↑',
        keywords: 'event navigate',
        action: safe(() => this.previousEvent && this.previousEvent()),
      },
      {
        id: 'seek-back-5',
        title: 'Seek Back 5 seconds',
        category: 'Playback',
        shortcut: '←',
        keywords: 'rewind back',
        action: safe(async () => {
          const t = this.videoPlayer.currentTime;
          await this.videoPlayer.seek(t - 5);
        }),
      },
      {
        id: 'seek-fwd-5',
        title: 'Seek Forward 5 seconds',
        category: 'Playback',
        shortcut: '→',
        keywords: 'forward skip',
        action: safe(async () => {
          const t = this.videoPlayer.currentTime;
          await this.videoPlayer.seek(t + 5);
        }),
      },
      {
        id: 'frame-back',
        title: 'Frame Back',
        category: 'Playback',
        shortcut: ',',
        keywords: 'frame step',
        action: safe(() => this.stepFrame(-1)),
      },
      {
        id: 'frame-fwd',
        title: 'Frame Forward',
        category: 'Playback',
        shortcut: '.',
        keywords: 'frame step',
        action: safe(() => this.stepFrame(1)),
      },

      // Layouts
      {
        id: 'cycle-layout',
        title: 'Cycle Layouts',
        category: 'Layout',
        shortcut: 'L',
        keywords: 'layout view switch',
        action: safe(() => {
          this.layoutManager.nextLayout();
          this.layoutSelect.value = this.layoutManager.getCurrentLayout();
        }),
      },

      // Export / capture
      {
        id: 'screenshot',
        title: 'Take Screenshot',
        category: 'Export',
        shortcut: 'S',
        keywords: 'screenshot capture png',
        action: safe(() => {
          if (!this.screenshotBtn?.disabled) this.screenshotBtn?.click();
        }),
      },
      {
        id: 'export-video',
        title: 'Export Video',
        category: 'Export',
        keywords: 'export render mp4 webm',
        action: safe(() => this.exportVideo && this.exportVideo()),
      },
      {
        id: 'mark-in',
        title: 'Mark IN point',
        category: 'Export',
        shortcut: 'I',
        keywords: 'mark in clip',
        action: safe(() => {
          if (!this.markInBtn?.disabled) this.markIn && this.markIn();
        }),
      },
      {
        id: 'mark-out',
        title: 'Mark OUT point',
        category: 'Export',
        shortcut: 'O',
        keywords: 'mark out clip',
        action: safe(() => {
          if (!this.markOutBtn?.disabled) this.markOut && this.markOut();
        }),
      },

      // Overlays
      {
        id: 'toggle-minimap',
        title: 'Toggle Mini-Map',
        category: 'Overlay',
        keywords: 'map mini gps',
        action: safe(
          () => this.miniMapOverlay?.toggle && this.miniMapOverlay.toggle()
        ),
      },
      {
        id: 'open-settings',
        title: 'Open Settings',
        category: 'App',
        shortcut: 'Q',
        keywords: 'settings preferences config',
        action: safe(() => this.settingsManager?.showSettingsModal()),
      },
      {
        id: 'open-help',
        title: 'Open Help / Keyboard Shortcuts',
        category: 'App',
        shortcut: 'H',
        keywords: 'help shortcuts keys',
        action: safe(() => this.helpModal?.toggle()),
      },
      {
        id: 'open-stats',
        title: 'Open Statistics',
        category: 'App',
        keywords: 'statistics stats analytics',
        action: safe(() => this.statisticsManager?.show()),
      },

      // Tools
      {
        id: 'add-drive',
        title: 'Add New Drive / Folder',
        category: 'Tools',
        keywords: 'add drive folder usb open',
        action: safe(() => this.addNewDrive && this.addNewDrive()),
      },
      {
        id: 'refresh-drives',
        title: 'Refresh Drives',
        category: 'Tools',
        keywords: 'refresh reload rescan',
        action: safe(() => this._rescanAllDrives && this._rescanAllDrives()),
      },
    ]);
  }

  // ===== File System Observer handlers =====

  _onDriveContentsChanged(driveId) {
    // Don't auto-reload (could surprise the user mid-review). Show a toast
    // with a one-click refresh instead.
    this._showDriveRefreshToast(driveId);
  }

  _showDriveRefreshToast(driveId) {
    // De-dupe — if a toast is already up for this drive, keep it.
    const existing = document.querySelector(
      `.drive-refresh-toast[data-drive-id="${driveId}"]`
    );
    if (existing) return;

    const drive = this.folderManager
      ?.getDrives?.()
      .find((d) => d.id === driveId);
    const label = drive?.label || 'Drive';

    const toast = document.createElement('div');
    toast.className = 'update-toast drive-refresh-toast';
    toast.dataset.driveId = driveId;
    toast.innerHTML = `
            <div class="update-toast-content">
                <div class="update-toast-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                </div>
                <div class="update-toast-text">
                    <strong>New files detected</strong>
                    <span>${label} — refresh to load new events</span>
                </div>
                <button class="update-toast-btn" data-action="refresh">Refresh</button>
                <button class="update-toast-close" data-action="dismiss" title="Dismiss">&times;</button>
            </div>
        `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));

    toast.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'refresh') {
        toast.remove();
        this._rescanDrive(driveId);
      } else {
        toast.remove();
      }
    });

    // Auto-dismiss after a while
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 47000);
  }

  async _rescanDrive(driveId) {
    const drives = this.folderManager?.getDrives?.() || [];
    const drive = drives.find((d) => d.id === driveId);
    if (!drive || !drive.handle) return;

    try {
      this.folderParser.setDriveContext(drive.id, drive.label, drive.color);
      this.folderParser.rootHandle = drive.handle;
      const events = await this.folderParser.parseFolder();
      drive.events = events;

      // Rebuild the flat all-drives event list for the sidebar + stats.
      const allDrives = this.folderManager.getDrives();
      this.allEvents = allDrives.flatMap((d) => d.events || []);
      if (this.statisticsManager)
        this.statisticsManager.setEvents(this.allEvents);
      if (typeof this.registerEventsAndLoadBackups === 'function') {
        await this.registerEventsAndLoadBackups(this.allEvents);
      }
      if (typeof this.applyFilters === 'function') this.applyFilters();
      this.updateDriveSelector(allDrives);
      console.log(
        `[FSObserver] Rescan complete for ${drive.label}: ${events.length} events`
      );
    } catch (err) {
      console.warn('[FSObserver] Rescan failed:', err);
    }
  }

  async _rescanAllDrives() {
    const drives = this.folderManager?.getDrives?.() || [];
    for (const d of drives) {
      await this._rescanDrive(d.id);
    }
  }
}

if (typeof window !== 'undefined') {
  window.TeslaCamViewerApp = TeslaCamViewerApp;
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize i18n first
  if (window.i18n) {
    await window.i18n.init();
  }

  window.app = new TeslaCamViewerApp();

  // Initialize session state (header button, expiry warnings)
  if (window.app.sessionManager) {
    window.app.sessionManager._updateHeaderButton();
    window.app.sessionManager.showExpiryWarningIfNeeded();
  }

  // Check for preloaded B2 data
  if (window.app.b2Client) {
    window.app.b2Client.getConfig().then((config) => {
      if (config.isConfigured && config.isPreloaded) {
        console.log('[App] B2 data is preloaded, auto-loading events...');
        window.app.loadFromB2();
      } else if (config.isConfigured) {
        console.log('[App] B2 is configured but not yet preloaded.');
      }
    });
  }

  // Debug helper for export troubleshooting
  window.debugExport = () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('EXPORT TROUBLESHOOTING GUIDE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('If export stalls or buffers frequently, try:\n');
    console.log('1. Move footage to a faster drive (SSD recommended)');
    console.log('   - USB 2.0 drives are often too slow for high-speed export');
    console.log('   - NVMe or SATA SSD provides best performance\n');

    console.log('2. Use lower playback speed (1x-2x instead of 5x)');
    console.log('   - Canvas rendering is CPU-bound at ~30fps');
    console.log('   - High speeds can outpace what the browser can process\n');

    console.log('3. Close other applications using the drive');
    console.log(
      '   - Background downloads, virus scans, etc. compete for I/O\n'
    );

    console.log('4. Check available disk space');
    console.log('   - Low disk space can cause performance issues\n');

    console.log('5. Try shorter export segments');
    console.log('   - Use IN/OUT markers to export specific sections\n');

    // Show current export status if available
    if (window.app?.videoExport) {
      const status = window.app.videoExport.getExportStatus();
      console.log('Current Export Status:');
      console.log('  - isExporting:', status.isExporting);
      console.log('  - speedWasReduced:', status.speedWasReduced);
      if (status.wallStartTime) {
        const elapsed = (Date.now() - status.wallStartTime) / 1000;
        console.log('  - wallTimeElapsed:', elapsed.toFixed(1) + 's');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  };
});
