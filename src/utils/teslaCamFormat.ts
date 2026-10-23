/**
 * teslaCamFormat - Pure utility functions for parsing TeslaCam filenames, timestamps,
 * event folders, clip grouping, gap detection, and reasons.
 */

export interface ParsedClipFilename {
  timestamp: string;
  camera: string;
}

export interface ParsedEventFolderName {
  datePart: string;
  timePart: string;
  timestamp: string;
}

export interface RawClip {
  timestamp: string;
  camera: string;
  fileName?: string;
  file?: any;
  url?: string;
  fileHandle?: FileSystemFileHandle;
  duration?: number;
  [key: string]: any;
}

export interface ClipGroup {
  timestamp: string;
  fileName?: string | null;
  camera?: string;
  clips: Record<
    string,
    {
      fileName?: string;
      url?: string;
      fileHandle?: FileSystemFileHandle;
      duration?: number;
      [key: string]: any;
    }
  >;
}

export interface RecordingGap {
  startTime: Date;
  endTime: Date;
  duration: number;
  afterClipIndex: number;
  formattedDuration: string;
}

const CLIP_FILENAME_REGEX =
  /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})-(front|back|left_repeater|right_repeater|left_pillar|right_pillar)\.mp4$/;

const FOLDER_TIMESTAMP_REGEX = /^(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})$/;

const CLIP_TIMESTAMP_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/;

/**
 * Parse a video clip filename into timestamp and camera angle.
 */
export function parseClipFilename(fileName: string): ParsedClipFilename | null {
  if (!fileName) return null;
  const match = fileName.match(CLIP_FILENAME_REGEX);
  if (!match) return null;
  return {
    timestamp: match[1],
    camera: match[2],
  };
}

/**
 * Parse an event folder name (e.g., 2026-10-10_10-00-00) into ISO-compatible timestamp parts.
 */
export function parseEventFolderName(
  folderName: string
): ParsedEventFolderName | null {
  if (!folderName) return null;
  const match = folderName.match(FOLDER_TIMESTAMP_REGEX);
  if (!match) return null;
  const [_, datePart, timePart] = match;
  return {
    datePart,
    timePart,
    timestamp: `${datePart}T${timePart.replace(/-/g, ':')}`,
  };
}

/**
 * Parse a clip timestamp string (YYYY-MM-DD_HH-MM-SS) to a Date object.
 */
export function parseClipTimestamp(timestamp: string): Date | null {
  if (!timestamp) return null;
  const match = timestamp.match(CLIP_TIMESTAMP_REGEX);
  if (!match) return null;

  const [_, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10)
  );
}

/**
 * Group clips by timestamp (same timestamp = all synchronized cameras for that 1-minute segment).
 */
export function groupClips(clips: RawClip[]): ClipGroup[] {
  if (!Array.isArray(clips)) return [];
  const groups = new Map<string, ClipGroup>();

  for (const clip of clips) {
    if (!clip || !clip.timestamp || !clip.camera) continue;
    if (!groups.has(clip.timestamp)) {
      groups.set(clip.timestamp, {
        timestamp: clip.timestamp,
        clips: {},
      });
    }
    groups.get(clip.timestamp)!.clips[clip.camera] = clip;
  }

  const result = Array.from(groups.values());
  result.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return result;
}

/**
 * Format a 24-hour hour number (0-23) into a 12-hour range string (e.g. "2:00-2:59 PM").
 */
export function formatHourlyRange(hour: number | string): string {
  const hourNum = typeof hour === 'string' ? parseInt(hour, 10) : hour;
  const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  return `${hour12}:00-${hour12}:59 ${ampm}`;
}

/**
 * Format a duration in seconds for gap display (e.g. "45s", "2m 15s", "1h 10m").
 */
export function formatGapDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

/**
 * Detect gaps between consecutive clip groups in an event.
 */
export function detectGaps(
  clipGroups: ClipGroup[],
  gapThreshold = 30,
  expectedClipDuration = 60
): RecordingGap[] {
  if (!Array.isArray(clipGroups) || clipGroups.length < 2) return [];
  const gaps: RecordingGap[] = [];

  for (let i = 0; i < clipGroups.length - 1; i++) {
    const currentClip = clipGroups[i];
    const nextClip = clipGroups[i + 1];

    const currentTime = parseClipTimestamp(currentClip.timestamp);
    const nextTime = parseClipTimestamp(nextClip.timestamp);

    if (!currentTime || !nextTime) continue;

    const expectedNextTime = new Date(
      currentTime.getTime() + expectedClipDuration * 1000
    );

    const gapDuration =
      (nextTime.getTime() - expectedNextTime.getTime()) / 1000;

    if (gapDuration > gapThreshold) {
      gaps.push({
        startTime: expectedNextTime,
        endTime: nextTime,
        duration: gapDuration,
        afterClipIndex: i,
        formattedDuration: formatGapDuration(gapDuration),
      });
    }
  }

  return gaps;
}

/**
 * Format Tesla dashcam reason strings into user-friendly labels.
 */
export function formatReason(reason: string): string {
  if (!reason) return 'Unknown';

  const reasonMap: Record<string, string> = {
    user_interaction_dashcam_launcher_action_tapped: 'Manual Save',
    sentry_aware_object_detection: 'Sentry: Object Detected',
    sentry_aware_accel: 'Sentry: Vehicle Bumped',
  };

  for (const [key, value] of Object.entries(reasonMap)) {
    if (reason.includes(key)) {
      if (key === 'sentry_aware_accel') {
        const accelMatch = reason.match(/sentry_aware_accel_([\d.]+)/);
        if (accelMatch) {
          return `${value} (${accelMatch[1]}g)`;
        }
      }
      return value;
    }
  }

  return reason.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
