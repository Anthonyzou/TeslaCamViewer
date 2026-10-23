/**
 * useStatistics - Headless calculation engine and composable for TeslaCam event statistics
 * Computes totals, durations, event types, timeline trends, and storage estimates reactively.
 */

import dayjs from 'dayjs';
import { computed, type ComputedRef } from 'vue';
import LayoutConfig from '../layout/layoutConfig';
import type {
  CameraDistributionStat,
  DayOfWeekPoint,
  HourDistributionPoint,
  LocationStat,
  StatisticsData,
  StorageEstimate,
  TeslaCamEvent,
  TimelineDataPoint,
  TrendDataPoint,
  TriggerReasonStat,
} from '../types';
import { eventsStore } from './useEvents';
import { statisticsModalStore } from './useModals';

export function normalizeCameraName(camera: string | number): string {
  const cameraMap: Record<string, string> = {
    '0': LayoutConfig.CAMERA_NAMES.front,
    '1': LayoutConfig.CAMERA_NAMES.back,
    '2': 'Front Left',
    '3': 'Front Right',
    '4': LayoutConfig.CAMERA_NAMES.left_pillar,
    '5': LayoutConfig.CAMERA_NAMES.left_repeater,
    '6': LayoutConfig.CAMERA_NAMES.right_repeater,
    '7': LayoutConfig.CAMERA_NAMES.right_pillar,
    front: LayoutConfig.CAMERA_NAMES.front,
    back: LayoutConfig.CAMERA_NAMES.back,
    left_repeater: LayoutConfig.CAMERA_NAMES.left_repeater,
    right_repeater: LayoutConfig.CAMERA_NAMES.right_repeater,
    left_pillar: LayoutConfig.CAMERA_NAMES.left_pillar,
    right_pillar: LayoutConfig.CAMERA_NAMES.right_pillar,
  };
  return cameraMap[String(camera).toLowerCase()] || String(camera);
}

export function normalizeTriggerReason(reason?: string): string {
  if (!reason) return 'Unknown';
  const lower = reason.toLowerCase();
  if (
    lower.includes('user_interaction') ||
    lower.includes('dashcam_launcher')
  ) {
    return 'Manual Save';
  }
  if (lower.includes('object_detection')) {
    return 'Object Detected';
  }
  if (lower.includes('accel') || lower.includes('bump')) {
    return 'Vehicle Bump';
  }
  if (lower.includes('honk')) {
    return 'Honk';
  }
  return 'Other';
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function calculateStorageEstimate(totalClips: number): StorageEstimate {
  const estimatedMB = totalClips * 10;
  const estimatedGB = estimatedMB / 1024;
  return {
    mb: Math.round(estimatedMB),
    gb: estimatedGB.toFixed(2),
    displayValue:
      estimatedGB >= 1
        ? `${estimatedGB.toFixed(1)} GB`
        : `${Math.round(estimatedMB)} MB`,
  };
}

export function generateTimelineData(
  eventsByDay: Record<string, number>
): TimelineDataPoint[] {
  const data: TimelineDataPoint[] = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayKey = dayjs(date).format('YYYY-MM-DD');
    const count = eventsByDay[dayKey] || 0;

    data.push({
      date: dayKey,
      label: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      count,
      percent: 0,
    });
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  data.forEach((d) => {
    d.percent = (d.count / maxCount) * 100;
  });

  return data;
}

export function generateTrendsData(
  eventsByDay: Record<string, number>,
  mode: 'weekly' | 'monthly' = 'weekly'
): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  const today = new Date();

  if (mode === 'weekly') {
    for (let i = 11; i >= 0; i--) {
      const weekEnd = dayjs(today).subtract(i, 'week');
      const weekStart = weekEnd.subtract(6, 'day');

      let count = 0;
      for (let d = 0; d <= 6; d++) {
        const date = weekStart.toDate();
        date.setDate(date.getDate() + d);
        const dayKey = dayjs(date).format('YYYY-MM-DD');
        if (eventsByDay[dayKey]) {
          count += eventsByDay[dayKey];
        }
      }

      data.push({
        label: dayjs(weekStart).format('MMM D'),
        count,
        percent: 0,
        start: weekStart.toDate(),
        end: weekEnd.toDate(),
      });
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const monthKey = dayjs().format('YYYY-MM');
      const monthName = dayjs().format('MMM YY');

      let count = 0;
      Object.entries(eventsByDay).forEach(([dayKey, dayCount]) => {
        if (dayKey.startsWith(monthKey)) {
          count += dayCount;
        }
      });

      data.push({
        label: monthName,
        count,
        percent: 0,
        month: monthKey,
      });
    }
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  data.forEach((d) => {
    d.percent = (d.count / maxCount) * 100;
  });

  return data;
}

export function generateTimeOfDayData(
  sentryByHour: number[]
): HourDistributionPoint[] {
  const maxCount = Math.max(...sentryByHour, 1);
  const getHourColor = (hour: number): string => {
    if (hour >= 0 && hour < 6) return '#1a237e';
    if (hour >= 6 && hour < 9) return '#ff9800';
    if (hour >= 9 && hour < 17) return '#ffc107';
    if (hour >= 17 && hour < 20) return '#ff9800';
    return '#1a237e';
  };

  return sentryByHour.map((count, hour) => {
    const label =
      hour === 0
        ? '12am'
        : hour === 12
          ? '12pm'
          : hour > 12
            ? `${hour - 12}pm`
            : `${hour}am`;

    return {
      hour,
      label,
      count,
      percent: (count / maxCount) * 100,
      color: getHourColor(hour),
    };
  });
}

export function generateDayOfWeekData(
  sentryByDayOfWeek: number[]
): DayOfWeekPoint[] {
  const maxCount = Math.max(...sentryByDayOfWeek, 1);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return sentryByDayOfWeek.map((count, day) => ({
    day,
    label: dayNames[day],
    count,
    percent: (count / maxCount) * 100,
    color: day === 0 || day === 6 ? '#ff9800' : '#4a9eff',
  }));
}

export function generateCameraDistributionData(
  triggeringCamera: Record<string, number>
): CameraDistributionStat[] {
  const entries = Object.entries(triggeringCamera);
  const total = entries.reduce((sum, [_, count]) => sum + count, 0);
  const colors: Record<string, string> = {
    Front: '#4a9eff',
    Rear: '#ff6b6b',
    'Left Repeater': '#4caf50',
    'Right Repeater': '#ff9800',
    'Left Pillar': '#9c27b0',
    'Right Pillar': '#00bcd4',
  };

  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([camera, count]) => ({
      camera,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
      color: colors[camera] || '#888',
    }));
}

export function calculateStats(
  events: TeslaCamEvent[]
): StatisticsData | null {
  if (!events || events.length === 0) {
    return null;
  }

  const totalEvents = events.length;
  let totalRecordingTime = 0;
  let totalClips = 0;

  const rawTypes: Record<string, number> = { saved: 0, sentry: 0, recent: 0 };
  const triggerReasonsMap: Record<string, number> = {};
  const topLocationsMap: Record<string, number> = {};
  const sentryLocationsMap: Record<string, number> = {};
  const eventsByDay: Record<string, number> = {};
  const sentryByHour = new Array(24).fill(0);
  const sentryByDayOfWeek = new Array(7).fill(0);
  const triggeringCameraMap: Record<string, number> = {};
  const dayVsNight = { day: 0, night: 0 };

  let earliestEvent: string | null = null;
  let latestEvent: string | null = null;

  for (const event of events) {
    const type = (event.type || 'RecentClips')
      .toLowerCase()
      .replace('clips', '');
    if (rawTypes[type] !== undefined) {
      rawTypes[type]++;
    }

    const clipCount = event.clipGroups?.length || 0;
    totalClips += clipCount;
    const eventDuration = clipCount * 60;
    totalRecordingTime += eventDuration;

    const metadata = event.metadata;
    if (metadata?.reason) {
      const normalizedReason = normalizeTriggerReason(metadata.reason);
      triggerReasonsMap[normalizedReason] =
        (triggerReasonsMap[normalizedReason] || 0) + 1;
    }

    if (type === 'sentry' && metadata?.camera !== undefined) {
      const cameraName = normalizeCameraName(metadata.camera);
      triggeringCameraMap[cameraName] =
        (triggeringCameraMap[cameraName] || 0) + 1;
    }

    const city = metadata?.city;
    if (city) {
      topLocationsMap[city] = (topLocationsMap[city] || 0) + 1;
      if (type === 'sentry') {
        sentryLocationsMap[city] = (sentryLocationsMap[city] || 0) + 1;
      }
    }

    if (event.timestamp) {
      const date = new Date(event.timestamp);
      const dayKey = dayjs(date).format('YYYY-MM-DD');
      eventsByDay[dayKey] = (eventsByDay[dayKey] || 0) + 1;

      const hour = date.getHours();
      if (type === 'sentry') {
        sentryByHour[hour]++;
        sentryByDayOfWeek[date.getDay()]++;
      }

      if (hour >= 6 && hour < 20) {
        dayVsNight.day++;
      } else {
        dayVsNight.night++;
      }

      const timeStr = String(event.timestamp);
      if (!earliestEvent || date < new Date(earliestEvent)) {
        earliestEvent = timeStr;
      }
      if (!latestEvent || date > new Date(latestEvent)) {
        latestEvent = timeStr;
      }
    }
  }

  const averageEventLength =
    totalEvents > 0 ? totalRecordingTime / totalEvents : 0;
  const storage = calculateStorageEstimate(totalClips);

  const typeColors: Record<string, string> = {
    saved: '#4caf50',
    sentry: '#f44336',
    recent: '#9e9e9e',
  };
  const typeNames: Record<string, string> = {
    saved: 'Saved',
    sentry: 'Sentry',
    recent: 'Recent',
  };

  const eventsByType = Object.entries(rawTypes)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      type,
      name: typeNames[type] || type,
      count,
      percent: Math.round((count / totalEvents) * 100),
      color: typeColors[type] || '#4a9eff',
    }));

  const triggerReasons: TriggerReasonStat[] = Object.entries(
    triggerReasonsMap
  )
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({
      reason,
      count,
      percent: Math.round((count / totalEvents) * 100),
    }));

  const topLocations: LocationStat[] = Object.entries(topLocationsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([location, count]) => ({ location, count }));

  const sentryLocations: LocationStat[] = Object.entries(sentryLocationsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([location, count]) => ({ location, count }));

  const timelineData = generateTimelineData(eventsByDay);
  const weeklyTrends = generateTrendsData(eventsByDay, 'weekly');
  const monthlyTrends = generateTrendsData(eventsByDay, 'monthly');
  const timeOfDay = generateTimeOfDayData(sentryByHour);
  const dayOfWeek = generateDayOfWeekData(sentryByDayOfWeek);
  const cameraDistribution =
    generateCameraDistributionData(triggeringCameraMap);

  const totalDayNight = dayVsNight.day + dayVsNight.night;
  const dayPercent =
    totalDayNight > 0
      ? Math.round((dayVsNight.day / totalDayNight) * 100)
      : 0;
  const nightPercent = totalDayNight > 0 ? 100 - dayPercent : 0;

  return {
    totalEvents,
    totalClips,
    formattedDuration: formatDuration(totalRecordingTime),
    averageEventLength,
    storage,
    earliestEvent,
    latestEvent,
    eventsByType,
    triggerReasons,
    topLocations,
    sentryLocations,
    timelineData,
    weeklyTrends,
    monthlyTrends,
    timeOfDay,
    dayOfWeek,
    cameraDistribution,
    dayVsNight: {
      ...dayVsNight,
      dayPercent,
      nightPercent,
    },
  };
}

export class StatisticsManager {
  public events: TeslaCamEvent[] = [];

  setEvents(events: TeslaCamEvent[]): void {
    this.events = events || [];
  }

  calculateStats(): StatisticsData | null {
    return calculateStats(this.events);
  }

  calculateStorageEstimate = calculateStorageEstimate;
  generateTimelineData = generateTimelineData;
  generateTrendsData = generateTrendsData;
  generateTimeOfDayData = generateTimeOfDayData;
  generateDayOfWeekData = generateDayOfWeekData;
  generateCameraDistributionData = generateCameraDistributionData;
  normalizeCameraName = normalizeCameraName;
  normalizeTriggerReason = normalizeTriggerReason;
  formatDuration = formatDuration;

  showModal(): void {
    const data = this.calculateStats();
    if (!data) return;
    statisticsModalStore.open(data as unknown as Record<string, unknown>);
  }

  hideModal(): void {
    statisticsModalStore.close();
  }
}

export const statisticsStore = {
  get statistics(): StatisticsData | null {
    return calculateStats(eventsStore.allEvents);
  },

  calculateStats(events?: TeslaCamEvent[]): StatisticsData | null {
    return calculateStats(events || eventsStore.allEvents);
  },

  showModal(data?: StatisticsData | null): void {
    const payload = data || calculateStats(eventsStore.allEvents);
    if (!payload) return;
    statisticsModalStore.open(payload as unknown as Record<string, unknown>);
  },

  hideModal(): void {
    statisticsModalStore.close();
  },
};

/**
 * useStatistics - Composable for computing and displaying TeslaCam statistics
 */
export function useStatistics() {
  const statistics: ComputedRef<StatisticsData | null> = computed(() => {
    return calculateStats(eventsStore.allEvents);
  });

  return {
    statistics,
    calculateStats,
    showModal: statisticsStore.showModal,
    hideModal: statisticsStore.hideModal,
  };
}

export default useStatistics;
