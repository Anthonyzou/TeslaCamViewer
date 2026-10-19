/**
 * StatisticsManager - Headless data calculation engine for TeslaCam event statistics
 * Calculates totals, recording duration, event types, timeline trends, locations,
 * trigger reasons, and storage estimates without direct DOM manipulation.
 */

import { statisticsModalStore } from '../composables/useModals';
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

export class StatisticsManager {
  public events: TeslaCamEvent[] = [];

  /**
   * Set the events data for analysis
   */
  setEvents(events: TeslaCamEvent[]): void {
    this.events = events || [];
  }

  /**
   * Calculate all statistics from events into pure data objects
   */
  calculateStats(): StatisticsData | null {
    if (!this.events || this.events.length === 0) {
      return null;
    }

    const totalEvents = this.events.length;
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

    for (const event of this.events) {
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
        const normalizedReason = this.normalizeTriggerReason(metadata.reason);
        triggerReasonsMap[normalizedReason] =
          (triggerReasonsMap[normalizedReason] || 0) + 1;
      }

      if (type === 'sentry' && metadata?.camera !== undefined) {
        const cameraName = this.normalizeCameraName(metadata.camera);
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
        const dayKey = date.toISOString().split('T')[0];
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

    const averageEventLength = totalEvents > 0 ? totalRecordingTime / totalEvents : 0;
    const storage = this.calculateStorageEstimate(totalClips);

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

    const timelineData = this.generateTimelineData(eventsByDay);
    const weeklyTrends = this.generateTrendsData(eventsByDay, 'weekly');
    const monthlyTrends = this.generateTrendsData(eventsByDay, 'monthly');
    const timeOfDay = this.generateTimeOfDayData(sentryByHour);
    const dayOfWeek = this.generateDayOfWeekData(sentryByDayOfWeek);
    const cameraDistribution =
      this.generateCameraDistributionData(triggeringCameraMap);

    const totalDayNight = dayVsNight.day + dayVsNight.night;
    const dayPercent =
      totalDayNight > 0 ? Math.round((dayVsNight.day / totalDayNight) * 100) : 0;
    const nightPercent = totalDayNight > 0 ? 100 - dayPercent : 0;

    return {
      totalEvents,
      totalClips,
      formattedDuration: this.formatDuration(totalRecordingTime),
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

  /**
   * Calculate storage estimate based on clip count
   */
  calculateStorageEstimate(totalClips: number): StorageEstimate {
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

  /**
   * Generate events-over-time data points (last 14 days)
   */
  generateTimelineData(
    eventsByDay: Record<string, number>
  ): TimelineDataPoint[] {
    const data: TimelineDataPoint[] = [];
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
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

  /**
   * Generate trends data points (weekly or monthly)
   */
  generateTrendsData(
    eventsByDay: Record<string, number>,
    mode: 'weekly' | 'monthly' = 'weekly'
  ): TrendDataPoint[] {
    const data: TrendDataPoint[] = [];
    const today = new Date();

    if (mode === 'weekly') {
      for (let i = 11; i >= 0; i--) {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        let count = 0;
        for (let d = 0; d <= 6; d++) {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + d);
          const dayKey = date.toISOString().split('T')[0];
          if (eventsByDay[dayKey]) {
            count += eventsByDay[dayKey];
          }
        }

        data.push({
          label: weekStart.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          count,
          percent: 0,
          start: weekStart,
          end: weekEnd,
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(
          today.getFullYear(),
          today.getMonth() - i,
          1
        );
        const monthKey = monthDate.toISOString().slice(0, 7);
        const monthName = monthDate.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });

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

  /**
   * Generate hourly distribution data for sentry events
   */
  generateTimeOfDayData(sentryByHour: number[]): HourDistributionPoint[] {
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

  /**
   * Generate day of week distribution data
   */
  generateDayOfWeekData(sentryByDayOfWeek: number[]): DayOfWeekPoint[] {
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

  /**
   * Generate camera distribution data for sentry triggers
   */
  generateCameraDistributionData(
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

  /**
   * Normalize camera ID to readable string
   */
  normalizeCameraName(camera: string | number): string {
    const cameraMap: Record<string, string> = {
      '0': 'Front',
      '1': 'Rear',
      '2': 'Front Left',
      '3': 'Front Right',
      '4': 'Left Pillar',
      '5': 'Left Repeater',
      '6': 'Right Repeater',
      '7': 'Right Pillar',
      front: 'Front',
      back: 'Rear',
      left_repeater: 'Left Repeater',
      right_repeater: 'Right Repeater',
      left_pillar: 'Left Pillar',
      right_pillar: 'Right Pillar',
    };
    return cameraMap[String(camera).toLowerCase()] || String(camera);
  }

  /**
   * Normalize trigger reason string
   */
  normalizeTriggerReason(reason?: string): string {
    if (!reason) return 'Unknown';
    const lower = reason.toLowerCase();
    if (lower.includes('user_interaction') || lower.includes('dashcam_launcher')) {
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

  /**
   * Format duration in seconds to readable string
   */
  formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  /**
   * Open the statistics modal with computed data
   */
  showModal(): void {
    const data = this.calculateStats();
    if (!data) return;
    statisticsModalStore.open(data as unknown as Record<string, unknown>);
  }

  /**
   * Close the statistics modal
   */
  hideModal(): void {
    statisticsModalStore.close();
  }
}

export const statisticsManager = new StatisticsManager();
export default StatisticsManager;
