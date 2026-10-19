import type { DBSchema } from 'idb';
import { ClipGroup } from '../utils/teslaCamFormat';

export interface FilterTypes {
  SavedClips: boolean;
  SentryClips: boolean;
  RecentClips: boolean;
  [key: string]: boolean;
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

export interface FilterState {
  types: FilterTypes;
  dateRange: DateRange;
  searchQuery: string;
  sortOrder: 'newest' | 'oldest' | string;
}

export interface EventFilterLike {
  getFilters: () => FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  reset: () => void;
  getActiveFilterCount: () => number;
}

export interface CommandItem {
  id?: string;
  title: string;
  category?: string;
  keywords?: string[] | string;
  shortcut?: string;
  action: (app?: unknown) => void;
  enabled?: (app?: unknown) => boolean;
}

export interface EventMetadata {
  city?: string;
  street?: string;
  reason?: string;
  camera?: string;
  est_lat?: string | number;
  est_lon?: string | number;
  timestamp?: string;
  weather?: {
    temp?: number | string;
    condition?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RecordingHealth {
  status: 'healthy' | 'minor' | 'warning';
  issues: string[];
  icon: string;
}

export interface TeslaCamEvent {
  name: string;
  type?: 'SavedClips' | 'SentryClips' | 'RecentClips' | string;
  timestamp: string | number | Date;
  metadata?: EventMetadata | null;
  clipGroups?: ClipGroup[];
  clips?: Array<{
    timestamp: string;
    camera: string;
    fileName: string;
    fileHandle?: FileSystemFileHandle;
    url?: string;
  }>;
  driveId?: string | null;
  driveLabel?: string | null;
  driveColor?: string | null;
  compoundKey?: string;
  thumbnailFile?: FileSystemFileHandle | null;
  thumbnailUrl?: string;
  eventVideoFile?: FileSystemFileHandle | null;
  eventVideoUrl?: string;
  isEmpty?: boolean;
  isVirtual?: boolean;
  hasPillarCameras?: boolean;
  folderHandle?: FileSystemDirectoryHandle;
  _blobURLs?: string[];
  _severityScore?: number;
  _recordingHealth?: { shortClipCount: number; [key: string]: unknown };
  [key: string]: unknown;
}

export interface DriveInfo {
  id: string;
  label?: string;
  name?: string;
  folderName?: string;
  color?: string;
  handle?: FileSystemDirectoryHandle | null;
  events?: TeslaCamEvent[];
  addedAt?: string;
  isArchive?: boolean;
  isB2?: boolean;
  dateFilter?: string | null;
  [key: string]: unknown;
}

export interface LayoutCameraPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutCameraCrop {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface LayoutCameraConfig {
  enabled: boolean;
  position: LayoutCameraPosition;
  zIndex?: number;
  aspectRatio?: string;
  objectFit?: 'fill' | 'contain' | 'cover';
  crop?: LayoutCameraCrop;
}

export interface LayoutCanvasConfig {
  aspectRatio?: string;
  backgroundColor?: string;
}

export interface LayoutConfigSchema {
  id?: string;
  name?: string;
  author?: string;
  canvas?: LayoutCanvasConfig;
  cameras?: Record<string, LayoutCameraConfig>;
  created?: string;
  modified?: string;
}

export interface DriveRecord {
  id: string;
  folderName?: string;
  label?: string;
  color?: string;
  addedAt?: string;
  isArchive: boolean;
  dateFilter: string;
  handle: FileSystemDirectoryHandle | null;
  isB2: boolean;
  events?: TeslaCamEvent[];
}

export interface TeslaCamViewerDBSchema extends DBSchema {
  drives: {
    key: string;
    value: DriveRecord;
    indexes: { label: string };
  };
  folderHandles: {
    key: string;
    value: FileSystemDirectoryHandle;
  };
}

export interface WeatherCacheRecord {
  key: string;
  data: unknown;
  cachedAt: number;
}

export interface WeatherDBSchema extends DBSchema {
  weatherCache: {
    key: string;
    value: WeatherCacheRecord;
  };
}

export interface EventTypeStat {
  type: string;
  name: string;
  count: number;
  percent: number;
  color: string;
}

export interface TriggerReasonStat {
  reason: string;
  count: number;
  percent: number;
}

export interface LocationStat {
  location: string;
  count: number;
}

export interface TimelineDataPoint {
  date: string;
  label: string;
  count: number;
  percent: number;
}

export interface HourDistributionPoint {
  hour: number;
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface DayOfWeekPoint {
  day: number;
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface CameraDistributionStat {
  camera: string;
  count: number;
  percent: number;
  color: string;
}

export interface DayVsNightStat {
  day: number;
  night: number;
  dayPercent: number;
  nightPercent: number;
}

export interface StorageEstimate {
  mb: number;
  gb: string;
  displayValue: string;
}

export interface TrendDataPoint {
  label: string;
  count: number;
  percent: number;
  start?: Date;
  end?: Date;
  month?: string;
}

export interface StatisticsData {
  totalEvents: number;
  totalClips: number;
  formattedDuration: string;
  averageEventLength: number;
  storage: StorageEstimate;
  earliestEvent: string | null;
  latestEvent: string | null;
  eventsByType: EventTypeStat[];
  triggerReasons: TriggerReasonStat[];
  topLocations: LocationStat[];
  sentryLocations: LocationStat[];
  timelineData: TimelineDataPoint[];
  weeklyTrends: TrendDataPoint[];
  monthlyTrends: TrendDataPoint[];
  timeOfDay: HourDistributionPoint[];
  dayOfWeek: DayOfWeekPoint[];
  cameraDistribution: CameraDistributionStat[];
  dayVsNight: DayVsNightStat;
}
