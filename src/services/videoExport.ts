/**
 * VideoExport - Server-Side FFmpeg Video Exporter Client
 * Communicates with /api/export endpoints to orchestrate server-side FFmpeg rendering.
 */
class VideoExport {
    public videoPlayer: any;
    public layoutManager: any;
    public isExporting: boolean = false;
    public currentJobId: string | null = null;
    private _pollTimer: any = null;

    constructor(videoPlayer: any, layoutManager: any) {
        this.videoPlayer = videoPlayer;
        this.layoutManager = layoutManager;
        this.isExporting = false;
        this.currentJobId = null;
        this._pollTimer = null;
    }

    getExportStatus() {
        return { isExporting: this.isExporting };
    }

    async exportVideo(camera = 'all') {
        return this.startExport({ camera, format: 'mp4' });
    }

    async exportGif() {
        return this.startExport({ camera: 'all', format: 'gif' });
    }

    async startExport(options: any = {}) {
        const event = this.videoPlayer?.currentEvent;
        if (!event) {
            alert('No event loaded to export');
            return;
        }

        const camera = options.camera || 'all';
        const format = options.format || 'mp4';

        // Check if marks exist (inPoint and outPoint from clipMarking are absolute event times in seconds)
        const marks = window.app?.clipMarking?.getMarks?.() || {};
        const inPoint = marks.inPoint != null ? marks.inPoint : null;
        const outPoint = marks.outPoint != null ? marks.outPoint : null;

        // Calculate target clip group and relative in/out offsets
        const clipGroups = event.clipGroups || [];
        let targetClipIndex = this.videoPlayer?.currentClipIndex >= 0 ? this.videoPlayer.currentClipIndex : 0;
        let relativeInPoint = null;
        let relativeOutPoint = null;

        if (clipGroups.length > 0) {
            const groupOffsets = [];
            let total = 0;
            for (let i = 0; i < clipGroups.length; i++) {
                groupOffsets.push(total);
                const g = clipGroups[i];
                const dur = g.clips?.front?.duration || 60;
                total += dur;
            }

            if (inPoint != null || outPoint != null) {
                const refPoint = inPoint != null ? inPoint : outPoint;
                for (let i = 0; i < clipGroups.length; i++) {
                    const start = groupOffsets[i];
                    const dur = clipGroups[i].clips?.front?.duration || 60;
                    if (refPoint >= start && (refPoint < start + dur || i === clipGroups.length - 1)) {
                        targetClipIndex = i;
                        break;
                    }
                }

                const groupStart = groupOffsets[targetClipIndex];
                const groupDur = clipGroups[targetClipIndex]?.clips?.front?.duration || 60;

                if (inPoint != null) {
                    relativeInPoint = Math.max(0, Math.min(groupDur - 0.5, inPoint - groupStart));
                }
                if (outPoint != null) {
                    const calculatedOut = outPoint - groupStart;
                    relativeOutPoint = Math.min(groupDur, Math.max((relativeInPoint || 0) + 0.5, calculatedOut));
                }
            }
        }

        const clipGroup = clipGroups[targetClipIndex];
        if (!clipGroup || !clipGroup.clips) {
            alert('No video clips found for this event');
            return;
        }

        const clips: Record<string, string> = {};
        for (const [cam, clip] of Object.entries(clipGroup.clips as Record<string, any>)) {
            if (clip.url && !clip.url.startsWith('blob:')) {
                clips[cam] = clip.url;
            }
        }

        if (Object.keys(clips).length === 0) {
            alert('Server export requires network/B2 clip URLs. Local file handle upload is not configured.');
            return;
        }

        this.isExporting = true;
        window.app?.disableControls?.();

        // Show export progress UI
        this._showExportOverlay(camera, format);

        try {
            const resp = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventName: event.name,
                    camera,
                    format,
                    clips,
                    inPoint: relativeInPoint,
                    outPoint: relativeOutPoint
                })
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({ error: 'Export failed to start' }));
                throw new Error(err.error || 'Server rejected export');
            }

            const { jobId } = await resp.json();
            this.currentJobId = jobId;

            // Poll for job completion
            await this._pollJob(jobId);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('[Export] Server export error:', error);
                alert(`Export failed: ${error.message}`);
            }
            this._hideExportOverlay();
            window.app?.enableControls?.();
        } finally {
            this.isExporting = false;
            this.currentJobId = null;
        }
    }

    _showExportOverlay(camera, format) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        if (!loadingOverlay || !loadingText) return;

        loadingOverlay.classList.remove('hidden');
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.position = 'fixed';
        loadingOverlay.style.top = '0';
        loadingOverlay.style.left = '0';
        loadingOverlay.style.right = '0';
        loadingOverlay.style.bottom = '0';
        loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        loadingOverlay.style.zIndex = '9999';

        const title = format === 'gif' 
            ? 'Exporting Animated GIF...' 
            : (camera === 'all' ? 'Exporting 4-Camera Grid...' : `Exporting ${camera} Camera...`);

        loadingText.innerHTML = `
            <div style="text-align: center;">
                <div id="exportTitle" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; color: #ffffff;">
                    ${title}
                </div>
                <div id="exportProgress" style="font-size: 0.9rem; color: #a0a0a0;">
                    Sending to server FFmpeg encoder...
                </div>
                <div style="width: 320px; height: 8px; background: #3a3a3a; border-radius: 4px; margin: 1rem auto; overflow: hidden;">
                    <div id="exportProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4a9eff, #6bb1ff); transition: width 0.3s ease;"></div>
                </div>
                <button id="cancelExportBtn" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                    Cancel
                </button>
            </div>
        `;

        document.getElementById('cancelExportBtn')?.addEventListener('click', () => {
            this.cancelExport();
        });
    }

    _hideExportOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.style.display = 'none';
        }
    }

    async _pollJob(jobId: string) {
        return new Promise<void>((resolve, reject) => {
            const check = async () => {
                if (!this.isExporting || this.currentJobId !== jobId) {
                    return resolve();
                }

                try {
                    const res = await fetch(`/api/export/status/${jobId}`);
                    if (!res.ok) throw new Error('Failed to check export status');

                    const job = await res.json();
                    const progressBar = document.getElementById('exportProgressBar');
                    const progressEl = document.getElementById('exportProgress');

                    if (job.status === 'encoding' || job.status === 'starting') {
                        const pct = Math.max(5, job.percent || 0);
                        if (progressBar) progressBar.style.width = `${pct}%`;
                        if (progressEl) progressEl.textContent = `Encoding with FFmpeg: ${pct}%`;
                        this._pollTimer = setTimeout(check, 600);
                    } else if (job.status === 'completed') {
                        if (progressBar) progressBar.style.width = '100%';
                        if (progressEl) progressEl.textContent = 'Encoding complete! Downloading...';

                        // Trigger download
                        this._downloadFile(`/api/export/download/${jobId}`, job.filename);
                        this._showComplete(job.filename, `/api/export/download/${jobId}`);
                        resolve();
                    } else if (job.status === 'error') {
                        throw new Error(job.error || 'Server FFmpeg encoding failed');
                    }
                } catch (e) {
                    reject(e);
                }
            };

            check();
        });
    }

    _downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'TeslaCam_Export.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    _showComplete(filename, downloadUrl) {
        const loadingText = document.getElementById('loadingText');
        if (!loadingText) return;

        loadingText.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
                <div style="font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem;">Export Complete!</div>
                <div style="color: #a0a0a0; font-size: 0.9rem; margin-bottom: 1.5rem;">${filename} has been saved.</div>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <a href="${downloadUrl}" download="${filename}" style="background: #4a9eff; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Download Again</a>
                    <button id="exportDoneBtn" style="background: #333; color: white; border: 1px solid #555; padding: 10px 24px; border-radius: 6px; cursor: pointer;">Close</button>
                </div>
            </div>
        `;

        document.getElementById('exportDoneBtn')?.addEventListener('click', () => {
            this._hideExportOverlay();
            window.app?.enableControls?.();
        });
    }

    async cancelExport() {
        if (this._pollTimer) {
            clearTimeout(this._pollTimer);
            this._pollTimer = null;
        }

        if (this.currentJobId) {
            try {
                await fetch(`/api/export/cancel/${this.currentJobId}`, { method: 'POST' });
            } catch (e) {}
        }

        this.isExporting = false;
        this._hideExportOverlay();
        window.app?.enableControls?.();
    }
}

export { VideoExport };
export default VideoExport;
