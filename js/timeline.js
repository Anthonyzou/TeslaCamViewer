/**
 * Timeline - Handles timeline scrubbing and progress display
 * Resolution: 1920x1080 @ 36fps max
 */

class Timeline {
    constructor(timelineElement, onSeek) {
        this.timeline = timelineElement;
        this._mcRef = 'teslacamviewer.com';
        this.progress = document.getElementById('timelineProgress');
        this.scrubber = document.getElementById('timelineScrubber');
        this.clipsContainer = document.getElementById('timelineClips');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.totalDurationDisplay = document.getElementById('totalDuration');

        // Mini-map elements
        this.minimap = document.getElementById('timelineMinimap');
        this.minimapProgress = document.getElementById('minimapProgress');
        this.minimapViewport = document.getElementById('minimapViewport');
        this.minimapPosition = document.getElementById('minimapPosition');
        this.minimapMarkers = document.getElementById('minimapMarkers');
        this.isMinimapDragging = false;
        this.minimapDragOffset = 0;

        this.onSeek = onSeek;
        this.totalDuration = 0;
        this.duration = 0; // Alias for totalDuration
        this.currentTime = 0;
        this.isDragging = false;

        // Zoom state
        this.zoomLevel = 1; // 1 = 100% (full view), 2 = 200% zoom, etc.
        this.maxZoom = 10;
        this.minZoom = 1;
        this.viewStart = 0; // Start time of visible window
        this.targetViewStart = 0; // Target for smooth scrolling
        this.zoomEnabled = false; // Controlled by settings
        this.scrollAnimationId = null; // For smooth scroll animation

        // Gap markers
        this.gaps = [];

        this.setupEventListeners();
        this.setupMinimapEventListeners();
    }

    /**
     * Setup timeline event listeners
     */
    setupEventListeners() {
        // Click on timeline to seek
        this.timeline.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.handleTimelineClick(e);
            }
        });

        // Drag scrubber
        this.timeline.addEventListener('mousedown', (e) => {
            this.startDragging(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleDrag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.stopDragging();
            }
        });

        // Touch events for mobile
        this.timeline.addEventListener('touchstart', (e) => {
            this.startDragging(e.touches[0]);
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this.handleDrag(e.touches[0]);
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (this.isDragging) {
                this.stopDragging();
            }
        });

        // Zoom with scroll wheel (also works for touchpad pinch on some systems)
        this.timeline.addEventListener('wheel', (e) => {
            if (!this.zoomEnabled) return;

            e.preventDefault();

            // Get mouse position relative to timeline
            const rect = this.timeline.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mousePercent = mouseX / rect.width;

            // Calculate the time under the mouse
            const viewDuration = this.totalDuration / this.zoomLevel;
            const timeUnderMouse = this.viewStart + (mousePercent * viewDuration);

            // Detect pinch gesture (ctrlKey is set for pinch-to-zoom on touchpads)
            // Also handle regular scroll wheel
            let zoomDelta;
            if (e.ctrlKey) {
                // Pinch gesture - use deltaY directly but scaled
                zoomDelta = -e.deltaY * 0.01;
            } else {
                // Regular scroll wheel
                zoomDelta = e.deltaY > 0 ? -0.5 : 0.5;
            }

            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + zoomDelta));

            if (Math.abs(newZoom - this.zoomLevel) > 0.01) {
                this.zoomLevel = newZoom;

                // Adjust viewStart to keep time under mouse in same position
                const newViewDuration = this.totalDuration / this.zoomLevel;
                this.viewStart = Math.max(0, Math.min(
                    this.totalDuration - newViewDuration,
                    timeUnderMouse - (mousePercent * newViewDuration)
                ));

                this.updateZoomDisplay();
            }
        }, { passive: false });

        // Touch pinch zoom support
        let initialPinchDistance = null;
        let initialZoom = 1;

        this.timeline.addEventListener('touchstart', (e) => {
            if (!this.zoomEnabled) return;
            if (e.touches.length === 2) {
                initialPinchDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialZoom = this.zoomLevel;
            }
        });

        this.timeline.addEventListener('touchmove', (e) => {
            if (!this.zoomEnabled) return;
            if (e.touches.length === 2 && initialPinchDistance) {
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const scale = currentDistance / initialPinchDistance;
                const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, initialZoom * scale));

                if (Math.abs(newZoom - this.zoomLevel) > 0.01) {
                    this.zoomLevel = newZoom;
                    this.updateZoomDisplay();
                }
            }
        }, { passive: false });

        this.timeline.addEventListener('touchend', () => {
            initialPinchDistance = null;
        });
    }

    /**
     * Setup mini-map event listeners
     */
    setupMinimapEventListeners() {
        if (!this.minimap) return;

        // Click on mini-map to navigate
        this.minimap.addEventListener('click', (e) => {
            if (this.isMinimapDragging) return;
            this.handleMinimapClick(e);
        });

        // Drag viewport on mini-map
        this.minimapViewport.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startMinimapDrag(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isMinimapDragging) {
                this.handleMinimapDrag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isMinimapDragging) {
                this.stopMinimapDrag();
            }
        });

        // Touch support for mini-map
        this.minimapViewport.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.startMinimapDrag(e.touches[0]);
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isMinimapDragging) {
                this.handleMinimapDrag(e.touches[0]);
            }
        });

        document.addEventListener('touchend', () => {
            if (this.isMinimapDragging) {
                this.stopMinimapDrag();
            }
        });
    }

    /**
     * Handle click on mini-map to seek
     * @param {MouseEvent} e
     */
    handleMinimapClick(e) {
        const rect = this.minimap.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        const time = percent * this.totalDuration;

        // Center the viewport on click position — pan-only behavior.
        // NOTE: does NOT seek the video. Previously triggered onSeek(time),
        // which caused the main timeline + video to jump to the clicked
        // point AND flashed the "Seeking" overlay any time the user merely
        // repositioned the zoom viewport. Seeking stays exclusive to the
        // main timeline.
        const viewDuration = this.totalDuration / this.zoomLevel;
        this.viewStart = Math.max(0, Math.min(
            this.totalDuration - viewDuration,
            time - viewDuration / 2
        ));

        this.updateZoomDisplay();
    }

    /**
     * Start dragging the mini-map viewport
     * @param {MouseEvent|Touch} e
     */
    startMinimapDrag(e) {
        this.isMinimapDragging = true;
        this.minimapViewport.classList.add('dragging');

        // Calculate offset from left edge of viewport
        const rect = this.minimapViewport.getBoundingClientRect();
        this.minimapDragOffset = e.clientX - rect.left;
    }

    /**
     * Handle mini-map viewport drag
     * @param {MouseEvent|Touch} e
     */
    handleMinimapDrag(e) {
        const minimapRect = this.minimap.getBoundingClientRect();
        const viewportWidth = this.minimapViewport.offsetWidth;

        // Calculate new left position
        let newLeft = e.clientX - minimapRect.left - this.minimapDragOffset;
        newLeft = Math.max(0, Math.min(minimapRect.width - viewportWidth, newLeft));

        // Convert to time
        const percent = newLeft / minimapRect.width;
        const viewDuration = this.totalDuration / this.zoomLevel;
        this.viewStart = percent * this.totalDuration;

        // Clamp viewStart
        this.viewStart = Math.max(0, Math.min(this.totalDuration - viewDuration, this.viewStart));

        this.updateZoomDisplay();
    }

    /**
     * Stop mini-map viewport drag
     */
    stopMinimapDrag() {
        this.isMinimapDragging = false;
        this.minimapViewport.classList.remove('dragging');
    }

    /**
     * Update mini-map display
     */
    updateMinimap() {
        if (!this.minimap) return;

        // Show mini-map always (not just when zoomed)
        this.minimap.classList.remove('hidden');

        // Update progress indicator (smooth via CSS transition)
        const progressPercent = this.totalDuration > 0 ? (this.currentTime / this.totalDuration) * 100 : 0;
        this.minimapProgress.style.width = `${progressPercent}%`;

        // Update position indicator (smooth via CSS transition)
        this.minimapPosition.style.left = `${progressPercent}%`;

        // Update viewport position and size (only relevant when zoomed)
        if (this.zoomLevel > 1) {
            const viewDuration = this.totalDuration / this.zoomLevel;
            const viewportWidth = (viewDuration / this.totalDuration) * 100;
            const viewportLeft = (this.viewStart / this.totalDuration) * 100;

            this.minimapViewport.style.width = `${viewportWidth}%`;
            this.minimapViewport.style.left = `${viewportLeft}%`;
            this.minimapViewport.style.display = 'block';
        } else {
            // When not zoomed, center viewport on current position for visual consistency
            const viewportWidth = 100;
            this.minimapViewport.style.width = `${viewportWidth}%`;
            this.minimapViewport.style.left = '0%';
            this.minimapViewport.style.display = 'none';
        }
    }

    /**
     * Smoothly center the view on a specific time
     * @param {number} time - Time in seconds to center on
     */
    centerViewOn(time) {
        if (this.zoomLevel <= 1) return;

        const viewDuration = this.totalDuration / this.zoomLevel;
        this.targetViewStart = Math.max(0, Math.min(
            this.totalDuration - viewDuration,
            time - viewDuration / 2
        ));
        this.startSmoothScroll();
    }

    /**
     * Render markers to the minimap
     */
    renderMinimapMarkers() {
        if (!this.minimapMarkers || this.totalDuration <= 0) return;

        // Clear existing minimap markers
        this.minimapMarkers.innerHTML = '';

        // Add clip markers
        if (this._lastClipGroups && this._lastClipGroups.length > 0) {
            const cachedDurations = window.app?.videoPlayer?.cachedClipDurations || [];
            let accumulatedTime = 0;
            for (let i = 0; i < this._lastClipGroups.length; i++) {
                if (i > 0) {
                    const percent = (accumulatedTime / this.totalDuration) * 100;
                    const marker = document.createElement('div');
                    marker.className = 'minimap-clip-marker';
                    marker.style.left = `${percent}%`;
                    this.minimapMarkers.appendChild(marker);
                }
                // Use cached duration if available, otherwise fallback to 60s
                accumulatedTime += cachedDurations[i] || 60;
            }
        }

        // Add sentry marker
        if (this._sentryTriggerTime && this._sentryTriggerTime > 0) {
            const percent = (this._sentryTriggerTime / this.totalDuration) * 100;
            const marker = document.createElement('div');
            marker.className = 'minimap-sentry-marker';
            marker.style.left = `${percent}%`;
            this.minimapMarkers.appendChild(marker);
        }

        // Add near-miss markers (score >= 5 only)
        if (this._nearMisses && this._nearMisses.length > 0) {
            const flaggedNearMisses = this._nearMisses.filter(nm => nm.score >= 5);
            for (const nearMiss of flaggedNearMisses) {
                const percent = (nearMiss.time / this.totalDuration) * 100;
                const marker = document.createElement('div');
                marker.className = `minimap-near-miss-marker severity-${nearMiss.severity}`;
                marker.style.left = `${percent}%`;
                marker.title = `Near-Miss: Score ${nearMiss.score.toFixed(1)}`;
                this.minimapMarkers.appendChild(marker);
            }
        }
    }

    /**
     * Enable or disable zoom feature
     * @param {boolean} enabled
     */
    setZoomEnabled(enabled) {
        this.zoomEnabled = enabled;
        if (!enabled) {
            this.resetZoom();
        }
    }

    /**
     * Reset zoom to default
     */
    resetZoom() {
        this.zoomLevel = 1;
        this.viewStart = 0;
        this.targetViewStart = 0;
        this.stopSmoothScroll();

        // Clear any transforms
        this.clipsContainer.style.transform = '';
        this.clipsContainer.style.transformOrigin = '';

        // Remove zoom indicator
        const indicator = this.timeline.querySelector('.zoom-indicator');
        if (indicator) indicator.remove();

        this.updateZoomDisplay();
    }

    /**
     * Zoom in on timeline (increase zoom level)
     */
    zoomIn() {
        const newZoom = Math.min(this.maxZoom, this.zoomLevel + 0.5);
        if (newZoom !== this.zoomLevel) {
            // Keep current time centered
            const viewDuration = this.totalDuration / this.zoomLevel;
            const centerTime = this.viewStart + viewDuration / 2;

            this.zoomLevel = newZoom;

            // Recalculate viewStart to keep center
            const newViewDuration = this.totalDuration / this.zoomLevel;
            this.viewStart = Math.max(0, Math.min(
                this.totalDuration - newViewDuration,
                centerTime - newViewDuration / 2
            ));

            this.updateZoomDisplay();
            console.log(`Zoom level: ${this.zoomLevel.toFixed(1)}x`);
        }
    }

    /**
     * Zoom out on timeline (decrease zoom level)
     */
    zoomOut() {
        const newZoom = Math.max(this.minZoom, this.zoomLevel - 0.5);
        if (newZoom !== this.zoomLevel) {
            // Keep current time centered
            const viewDuration = this.totalDuration / this.zoomLevel;
            const centerTime = this.viewStart + viewDuration / 2;

            this.zoomLevel = newZoom;

            // Recalculate viewStart to keep center
            const newViewDuration = this.totalDuration / this.zoomLevel;
            this.viewStart = Math.max(0, Math.min(
                this.totalDuration - newViewDuration,
                centerTime - newViewDuration / 2
            ));

            this.updateZoomDisplay();
            console.log(`Zoom level: ${this.zoomLevel.toFixed(1)}x`);
        }
    }

    /**
     * Update the visual display after zoom change
     */
    updateZoomDisplay() {
        // Clear any CSS transforms - we use mathematical positioning now
        this.clipsContainer.style.transform = '';

        // Re-render markers at correct positions for zoom level
        this.rerenderClipMarkers();

        // Re-render IN/OUT clip markers — they live in a sibling module
        // (ClipMarking) but their pixel position is zoom-dependent. Without
        // this refresh they stayed pinned to their original raw-percent
        // positions while the rest of the timeline scaled around them.
        const cm = window.app?.clipMarking;
        if (cm) {
            if (typeof cm.updateInMarker === 'function') cm.updateInMarker();
            if (typeof cm.updateOutMarker === 'function') cm.updateOutMarker();
        }

        // Update current position display relative to zoomed view
        this.updateTime(this.currentTime);

        // Update or create zoom indicator
        this.updateZoomIndicator();

        // Update mini-map
        this.updateMinimap();

        // Emit zoom change event for UI updates
        if (this.onZoomChange) {
            this.onZoomChange(this.zoomLevel, this.viewStart);
        }
    }

    /**
     * Calculate position percent for zoom level
     * @param {number} time - absolute time in seconds
     * @returns {number} - percent position (0-100) in visible window, or -1 if outside
     */
    getZoomedPosition(time) {
        if (this.zoomLevel <= 1) {
            return (time / this.totalDuration) * 100;
        }

        const viewDuration = this.totalDuration / this.zoomLevel;
        const viewEnd = this.viewStart + viewDuration;

        // Check if time is in visible window
        if (time < this.viewStart || time > viewEnd) {
            return -1; // Outside visible window
        }

        return ((time - this.viewStart) / viewDuration) * 100;
    }

    /**
     * Re-render clip markers with current zoom
     */
    rerenderClipMarkers() {
        // Remove existing clip markers
        const existingMarkers = this.clipsContainer.querySelectorAll('.clip-marker, .sentry-trigger-marker, .near-miss-marker');
        existingMarkers.forEach(m => m.remove());

        // Re-add if we have stored clip group info
        if (this._lastClipGroups) {
            this.setClipMarkers(this._lastClipGroups);
        }
        if (this._sentryTriggerTime) {
            this.setSentryTriggerMarker(this._sentryTriggerTime);
        }
        if (this._nearMisses) {
            this.setNearMissMarkers(this._nearMisses);
        }
        // Gap markers (yellow/black barber-pole for missing-clip ranges)
        // are zoom-dependent too — setGapMarkers uses getZoomedPosition
        // internally and stashed _gaps/_gapClipGroups "for re-rendering
        // on zoom", but no caller existed until now.
        if (this._gaps && this._gapClipGroups) {
            this.setGapMarkers(this._gaps, this._gapClipGroups);
        }
    }

    /**
     * Update zoom level indicator
     */
    updateZoomIndicator() {
        let indicator = this.timeline.querySelector('.zoom-indicator');

        if (this.zoomLevel === 1) {
            if (indicator) indicator.remove();
            return;
        }

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'zoom-indicator';
            this.timeline.appendChild(indicator);
        }

        indicator.textContent = `${this.zoomLevel.toFixed(1)}x`;
    }

    /**
     * Get visible time range
     * @returns {{start: number, end: number}}
     */
    getVisibleRange() {
        const viewDuration = this.totalDuration / this.zoomLevel;
        return {
            start: this.viewStart,
            end: this.viewStart + viewDuration
        };
    }

    /**
     * Handle click on timeline
     * @param {MouseEvent} event
     */
    handleTimelineClick(event) {
        const rect = this.timeline.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percent = clickX / rect.width;

        // When zoomed, map click position to visible window
        let time;
        if (this.zoomLevel > 1) {
            const viewDuration = this.totalDuration / this.zoomLevel;
            time = this.viewStart + (percent * viewDuration);
            // Stash manual seek time to ignore auto-scroll in updateVisualPosition temporarily
            this._lastManualSeekTime = Date.now();
        } else {
            time = percent * this.totalDuration;
        }

        if (this.onSeek) {
            this.onSeek(time);
        }
    }

    /**
     * Start dragging scrubber
     * @param {MouseEvent|Touch} event
     */
    startDragging(event) {
        this.isDragging = true;
        this.scrubber.classList.add('dragging');
        this.timeline.classList.add('seeking');
        this.handleDrag(event);
    }

    /**
     * Handle drag movement
     * @param {MouseEvent|Touch} event
     */
    handleDrag(event) {
        const rect = this.timeline.getBoundingClientRect();
        const dragX = event.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, dragX / rect.width));

        // When zoomed, map drag position to visible window
        let time;
        if (this.zoomLevel > 1) {
            const viewDuration = this.totalDuration / this.zoomLevel;
            time = this.viewStart + (percent * viewDuration);
            time = Math.max(0, Math.min(this.totalDuration, time));
        } else {
            time = percent * this.totalDuration;
        }

        // Update visual position (pass absolute percent for auto-scroll handling)
        const absolutePercent = time / this.totalDuration;
        this.updateVisualPosition(absolutePercent);

        // Update time during drag
        this.currentTime = time;
        this.updateTimeDisplay();
    }

    /**
     * Stop dragging scrubber
     */
    stopDragging() {
        this.isDragging = false;
        this.scrubber.classList.remove('dragging');
        this.timeline.classList.remove('seeking');

        // Stash manual seek time to ignore auto-scroll temporarily
        this._lastManualSeekTime = Date.now();

        // Seek to final position
        if (this.onSeek) {
            this.onSeek(this.currentTime);
        }
    }

    /**
     * Update visual position of progress and scrubber
     * @param {number} percent 0-1 (absolute position in timeline)
     */
    updateVisualPosition(percent) {
        // When zoomed, calculate position relative to visible window
        if (this.zoomLevel > 1) {
            const viewDuration = this.totalDuration / this.zoomLevel;
            const viewEnd = this.viewStart + viewDuration;
            const absoluteTime = percent * this.totalDuration;

            // Auto-scroll to keep current position visible (smooth)
            // Skip if a manual seek occurred very recently (prevent jump after click)
            const timeSinceManualSeek = Date.now() - (this._lastManualSeekTime || 0);
            if (timeSinceManualSeek > 1000) {
                // Keep playhead at ~40% from the left edge when auto-scrolling
                const targetPosition = 0.4;
                if (absoluteTime < this.viewStart + viewDuration * 0.1) {
                    // Approaching left edge - scroll left
                    this.targetViewStart = Math.max(0, absoluteTime - viewDuration * targetPosition);
                    this.startSmoothScroll();
                } else if (absoluteTime > this.viewStart + viewDuration * 0.9) {
                    // Approaching right edge - scroll right
                    this.targetViewStart = Math.min(this.totalDuration - viewDuration, absoluteTime - viewDuration * targetPosition);
                    this.startSmoothScroll();
                }
            }

            // Calculate position within visible window
            const visiblePercent = (absoluteTime - this.viewStart) / viewDuration;
            const percentClamped = Math.max(0, Math.min(100, visiblePercent * 100));
            this.progress.style.width = `${percentClamped}%`;
            this.scrubber.style.left = `${percentClamped}%`;
        } else {
            const percentClamped = Math.max(0, Math.min(100, percent * 100));
            this.progress.style.width = `${percentClamped}%`;
            this.scrubber.style.left = `${percentClamped}%`;
        }
    }

    /**
     * Start smooth scroll animation towards targetViewStart
     */
    startSmoothScroll() {
        if (this.scrollAnimationId) return; // Already animating

        const animate = () => {
            const diff = this.targetViewStart - this.viewStart;

            // If close enough, snap to target
            if (Math.abs(diff) < 0.1) {
                this.viewStart = this.targetViewStart;
                this.scrollAnimationId = null;
                this.updateZoomDisplay();
                return;
            }

            // Ease towards target (lerp with factor 0.15 for smooth motion)
            this.viewStart += diff * 0.15;
            this.updateZoomDisplay();

            this.scrollAnimationId = requestAnimationFrame(animate);
        };

        this.scrollAnimationId = requestAnimationFrame(animate);
    }

    /**
     * Stop smooth scroll animation
     */
    stopSmoothScroll() {
        if (this.scrollAnimationId) {
            cancelAnimationFrame(this.scrollAnimationId);
            this.scrollAnimationId = null;
        }
    }

    /**
     * Set total duration
     * @param {number} duration Duration in seconds
     */
    setDuration(duration) {
        this.totalDuration = duration;
        this.duration = duration; // Alias
        if (this.totalDurationDisplay) {
            this.totalDurationDisplay.textContent = this.formatTime(duration);
        }
        this.resetZoom();

        // Show minimap once we have a duration
        if (duration > 0 && this.minimap) {
            this.minimap.classList.remove('hidden');
            this.updateMinimap();
        }
    }

    /**
     * Update current time
     * @param {number} time Time in seconds
     */
    updateTime(time) {
        if (this.isDragging) return; // Don't update while dragging

        this.currentTime = time;
        const percent = this.totalDuration > 0 ? time / this.totalDuration : 0;

        this.updateVisualPosition(percent);
        this.updateTimeDisplay();

        // Always update mini-map
        this.updateMinimap();
    }

    /**
     * Update time display
     */
    updateTimeDisplay() {
        if (this.currentTimeDisplay) {
            this.currentTimeDisplay.textContent = this.formatTimeWithFrames(this.currentTime);
        }
    }

    /**
     * Format time in HH:MM:SS:FF (with frame count)
     * Tesla dashcam is typically 36fps
     * @param {number} seconds
     * @returns {string}
     */
    formatTimeWithFrames(seconds) {
        if (!isFinite(seconds)) return '00:00:00:00';

        const FPS = 36; // Tesla dashcam frame rate
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const frames = Math.floor((seconds % 1) * FPS);

        return [hours, minutes, secs]
            .map(v => v.toString().padStart(2, '0'))
            .join(':') + ':' + frames.toString().padStart(2, '0');
    }

    /**
     * Format time in HH:MM:SS
     * @param {number} seconds
     * @returns {string}
     */
    formatTime(seconds) {
        if (!isFinite(seconds)) return '00:00:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return [hours, minutes, secs]
            .map(v => v.toString().padStart(2, '0'))
            .join(':');
    }

    /**
     * Set clip markers on timeline
     * @param {Array} clipGroups Array of clip groups with durations
     */
    async setClipMarkers(clipGroups) {
        // Store for re-rendering on zoom
        this._lastClipGroups = clipGroups;

        // Remove existing clip markers only
        const existingMarkers = this.clipsContainer.querySelectorAll('.clip-marker');
        existingMarkers.forEach(m => m.remove());

        if (!clipGroups || clipGroups.length === 0) {
            this.renderMinimapMarkers();
            return;
        }

        let accumulatedTime = 0;
        const totalDuration = this.totalDuration;
        const cachedDurations = window.app?.videoPlayer?.cachedClipDurations || [];

        for (let i = 0; i < clipGroups.length; i++) {
            const clipGroup = clipGroups[i];

            // Get clip duration from cache, fallback to 60s approximation
            const duration = cachedDurations[i] || 60;

            if (i > 0) {
                // Add marker at clip boundary
                const percent = this.getZoomedPosition(accumulatedTime);

                // Skip if outside visible window when zoomed
                if (percent >= 0) {
                    const marker = document.createElement('div');
                    marker.className = 'clip-marker';
                    marker.style.left = `${percent}%`;
                    this.clipsContainer.appendChild(marker);
                }
            }

            accumulatedTime += duration;
        }

        // Update minimap markers
        this.renderMinimapMarkers();
    }

    /**
     * Set Sentry trigger marker on timeline
     * @param {number} triggerTime Time in seconds where sentry was triggered
     */
    setSentryTriggerMarker(triggerTime) {
        // Store for re-rendering on zoom
        this._sentryTriggerTime = triggerTime;

        // Remove existing sentry marker
        const existing = this.clipsContainer.querySelector('.sentry-trigger-marker');
        if (existing) existing.remove();

        if (!this.totalDuration || triggerTime <= 0) {
            this.renderMinimapMarkers();
            return;
        }

        const percent = this.getZoomedPosition(triggerTime);

        // Skip if outside visible window when zoomed
        if (percent >= 0) {
            const marker = document.createElement('div');
            marker.className = 'sentry-trigger-marker';
            marker.style.left = `${percent}%`;
            marker.title = `Sentry Triggered at ${this.formatTime(triggerTime)}`;
            this.clipsContainer.appendChild(marker);
        }

        // Update minimap markers
        this.renderMinimapMarkers();
    }

    /**
     * Set gap markers on timeline
     * @param {Array} gaps Array of gap objects from FolderParser.detectGaps()
     * @param {Array} clipGroups Clip groups for position calculation
     */
    setGapMarkers(gaps, clipGroups) {
        // Store for re-rendering on zoom
        this._gaps = gaps;
        this._gapClipGroups = clipGroups;

        // Remove existing gap markers
        const existingGaps = this.clipsContainer.querySelectorAll('.gap-marker');
        existingGaps.forEach(m => m.remove());

        if (!gaps || gaps.length === 0 || !clipGroups) return;

        const cachedDurations = window.app?.videoPlayer?.cachedClipDurations || [];

        for (const gap of gaps) {
            // Calculate position after the clip where gap occurs using cached durations
            const clipIndexAfter = gap.afterClipIndex;
            let timePosition = 0;
            for (let i = 0; i <= clipIndexAfter && i < cachedDurations.length; i++) {
                timePosition += cachedDurations[i] || 60;
            }
            // If no cached durations available, fallback to approximation
            if (cachedDurations.length === 0) {
                timePosition = (clipIndexAfter + 1) * 60;
            }

            const percent = this.getZoomedPosition(timePosition);

            // Skip if outside visible window when zoomed
            if (percent < 0 || percent > 100) continue;

            const marker = document.createElement('div');
            marker.className = 'gap-marker';
            marker.style.left = `${percent}%`;
            marker.title = `Gap: ${gap.formattedDuration} missing`;
            marker.dataset.duration = gap.formattedDuration;
            this.clipsContainer.appendChild(marker);
        }
    }

    /**
     * Set near-miss markers on timeline (no-op)
     */
    setNearMissMarkers(nearMisses) {
        this._nearMisses = null;
    }

    /**
     * Reset timeline
     */
    reset() {
        this.totalDuration = 0;
        this.currentTime = 0;
        this.updateVisualPosition(0);
        if (this.currentTimeDisplay) {
            this.currentTimeDisplay.textContent = '00:00:00:00';
        }
        if (this.totalDurationDisplay) {
            this.totalDurationDisplay.textContent = '00:00:00';
        }
        this.clipsContainer.innerHTML = '';
        this._gaps = null;
        this._nearMisses = null;
    }

    /**
     * Get current time
     * @returns {number}
     */
    getCurrentTime() {
        return this.currentTime;
    }

    /**
     * Get total duration
     * @returns {number}
     */
    getDuration() {
        return this.totalDuration;
    }

    // ----- Scrub-preview thumbnails (hover over timeline) -----

    _formatMmSs(seconds) {
        const s = Math.max(0, Math.floor(seconds));
        const m = Math.floor(s / 60);
        const r = (s % 60).toString().padStart(2, '0');
        return `${m}:${r}`;
    }
}

if (typeof window !== 'undefined') {
    window.Timeline = Timeline;
}
