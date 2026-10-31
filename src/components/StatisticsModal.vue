<template>
  <div v-if="isOpen" class="stats-modal" @keydown.esc="close">
    <div class="stats-overlay" @mousedown="close" @click="close"></div>
    <div class="stats-panel">
      <div class="stats-layout">
        <!-- Sidebar Navigation -->
        <div class="stats-sidebar">
          <div class="stats-sidebar-header">
            <h2>
              <BarChart3 :size="20" class="icon-mr-2" />
              {{ t('statistics.title') }}
            </h2>
          </div>
          <nav class="stats-nav">
            <button class="stats-nav-item" :class="{ active: activeTab === 'overview' }"
              @click="activeTab = 'overview'">
              <BarChart3 :size="18" />
              {{ t('statistics.tabs.overview') }}
            </button>
            <button class="stats-nav-item" :class="{ active: activeTab === 'timeline' }"
              @click="activeTab = 'timeline'">
              <Clock :size="18" />
              {{ t('statistics.tabs.timeline') }}
            </button>
            <button class="stats-nav-item" :class="{ active: activeTab === 'locations' }"
              @click="activeTab = 'locations'">
              <MapPin :size="18" />
              {{ t('statistics.tabs.locations') }}
            </button>
            <button v-if="hasSentryData" class="stats-nav-item" :class="{ active: activeTab === 'sentry' }"
              @click="activeTab = 'sentry'">
              <Shield :size="18" />
              {{ t('statistics.tabs.sentry') }}
            </button>
            <button class="stats-nav-item" :class="{ active: activeTab === 'quality' }" @click="activeTab = 'quality'">
              <CheckCircle2 :size="18" />
              {{ t('statistics.tabs.quality') }}
            </button>
          </nav>
        </div>

        <!-- Main Content Area -->
        <div class="stats-main">
          <div class="stats-main-header">
            <h3 class="stats-section-title">{{ currentSectionTitle }}</h3>
            <button class="stats-close-btn" :title="t('statistics.close')" @click="close">
              <X :size="20" />
            </button>
          </div>

          <div class="stats-content">
            <!-- Overview Tab -->
            <div v-show="activeTab === 'overview'" class="
              stats-tab-content active
            ">
              <div class="stats-section">
                <h3>{{ t('statistics.recordingOverview') }}</h3>
                <div class="stats-grid stats-grid-4">
                  <div class="stats-card">
                    <span class="stats-card-value">{{
                      stats?.totalEvents || 0
                    }}</span>
                    <span class="stats-card-label">{{
                      t('statistics.totalEvents')
                    }}</span>
                  </div>
                  <div class="stats-card">
                    <span class="stats-card-value">{{
                      stats?.totalClips || 0
                    }}</span>
                    <span class="stats-card-label">{{
                      t('statistics.totalClips')
                    }}</span>
                  </div>
                  <div class="stats-card">
                    <span class="stats-card-value">{{
                      stats?.formattedDuration || '0m'
                    }}</span>
                    <span class="stats-card-label">{{
                      t('statistics.recordingTime')
                    }}</span>
                  </div>
                  <div class="stats-card">
                    <span class="stats-card-value">{{
                      stats?.storage?.displayValue || '0 MB'
                    }}</span>
                    <span class="stats-card-label">{{
                      t('statistics.estStorage')
                    }}</span>
                  </div>
                </div>
              </div>
 
                             <div class="stats-section">
                <h3>{{ t('statistics.eventTypes') }}</h3>
                <div class="stats-types">
                  <div v-for="item in stats?.eventsByType" :key="item.type" class="
                    stats-type-item
                  ">
                    <div class="stats-type-bar" :style="{
                      width: `${item.percent}%`,
                      background: item.color,
                    }"></div>
                    <span class="stats-type-label">
                      {{ item.name }}: {{ item.count }} ({{ item.percent }}%)
                    </span>
                  </div>
                  <p v-if="!stats?.eventsByType?.length" class="stats-empty">
                    {{ t('statistics.noEventData') }}
                  </p>
                </div>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.triggerReasons') }}</h3>
                <div class="stats-bars">
                  <div v-for="trig in stats?.triggerReasons" :key="trig.reason" class="
                    stats-bar-row
                  ">
                    <span class="stats-bar-label">{{ trig.reason }}</span>
                    <div class="stats-bar-track">
                      <div class="stats-bar-fill" :style="{ width: `${trig.percent}%` }"></div>
                    </div>
                    <span class="stats-bar-value">{{ trig.count }} ({{ trig.percent }}%)</span>
                  </div>
                  <p v-if="!stats?.triggerReasons?.length" class="stats-empty">
                    {{ t('statistics.noTrendData') }}
                  </p>
                </div>
              </div>

              <div v-if="stats?.earliestEvent" class="stats-section">
                <h3>{{ t('statistics.dateRange') }}</h3>
                <p class="stats-date-range">
                  <Calendar :size="14" class="stats-inline-icon" />
                  {{ new Date(stats.earliestEvent).toLocaleDateString() }}
                  -
                  {{
                    stats.latestEvent
                      ? new Date(stats.latestEvent).toLocaleDateString()
                      : ''
                  }}
                </p>
              </div>
            </div>

            <!-- Timeline Tab -->
            <div v-show="activeTab === 'timeline'" class="
              stats-tab-content active
            ">
              <div class="stats-section">
                <h3>{{ t('statistics.eventsLast14Days') }}</h3>
                <div v-if="hasTimelineEvents">
                  <BaseChart :data="timelineChartData" :height="140" />
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noEventsLast14Days') }}
                </p>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.eventTrends') }}</h3>
                <div class="stats-trends-toggle">
                  <button class="stats-trend-btn" :class="{ active: trendMode === 'weekly' }"
                    @click="trendMode = 'weekly'">
                    {{ t('statistics.weekly') }}
                  </button>
                  <button class="stats-trend-btn" :class="{ active: trendMode === 'monthly' }"
                    @click="trendMode = 'monthly'">
                    {{ t('statistics.monthly') }}
                  </button>
                </div>
                <div v-if="hasTrendData">
                  <BaseChart :data="trendChartData" :height="140" />
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noTrendData') }}
                </p>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.dayVsNight') }}</h3>
                <div v-if="
                  (stats?.dayVsNight?.day || 0) +
                  (stats?.dayVsNight?.night || 0) >
                  0
                " class="stats-day-night">
                  <div class="stats-day-night-visual">
                    <div class="stats-dn-donut" :style="{
                      '--day-percent': stats?.dayVsNight?.dayPercent || 0,
                    }">
                      <div class="stats-dn-center">
                        <Sun :size="20" color="#ffc107" />
                      </div>
                    </div>
                  </div>
                  <div class="stats-day-night-legend">
                    <div class="stats-dn-item">
                      <span class="stats-dn-color stats-dn-swatch-day"></span>
                      <span class="stats-dn-label">Day (6am-8pm)</span>
                      <span class="stats-dn-value">{{ stats?.dayVsNight?.day }} ({{
                        stats?.dayVsNight?.dayPercent
                        }}%)</span>
                    </div>
                    <div class="stats-dn-item">
                      <span class="stats-dn-color stats-dn-swatch-night"></span>
                      <span class="stats-dn-label">Night (8pm-6am)</span>
                      <span class="stats-dn-value">{{ stats?.dayVsNight?.night }} ({{
                        stats?.dayVsNight?.nightPercent
                        }}%)</span>
                    </div>
                  </div>
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noEventData') }}
                </p>
              </div>
            </div>

            <!-- Locations Tab -->
            <div v-show="activeTab === 'locations'" class="
              stats-tab-content active
            ">
              <div class="stats-section">
                <h3>{{ t('statistics.topLocations') }}</h3>
                <div class="stats-locations">
                  <div v-for="(item, idx) in stats?.topLocations" :key="item.location" class="
                    stats-location-row
                  ">
                    <span class="stats-location-rank">{{ idx + 1 }}.</span>
                    <span class="stats-location-name">{{ item.location }}</span>
                    <span class="stats-location-count">{{ item.count }} {{ t('statistics.events') }}</span>
                  </div>
                  <p v-if="!stats?.topLocations?.length" class="stats-empty">
                    {{ t('statistics.noLocationData') }}
                  </p>
                </div>
              </div>
              <div v-if="stats?.sentryLocations?.length" class="stats-section">
                <h3>{{ t('statistics.topSentryLocations') }}</h3>
                <div class="stats-locations">
                  <div v-for="(item, idx) in stats?.sentryLocations" :key="item.location" class="
                    stats-location-row
                  ">
                    <span class="stats-location-rank">{{ idx + 1 }}.</span>
                    <span class="stats-location-name">{{ item.location }}</span>
                    <span class="stats-location-count">{{ item.count }} {{ t('statistics.events') }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sentry Tab -->
            <div v-if="hasSentryData" v-show="activeTab === 'sentry'" class="
              stats-tab-content active
            ">
              <div class="stats-section">
                <h3>{{ t('statistics.sentryByTimeOfDay') }}</h3>
                <div v-if="hasSentryHourData">
                  <BaseChart :data="sentryHourChartData" :height="140" />
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noSentryEvents') }}
                </p>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.sentryByDayOfWeek') }}</h3>
                <div v-if="hasSentryDowData">
                  <BaseChart :data="sentryDowChartData" :height="140" />
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noSentryEvents') }}
                </p>
              </div>

              <div v-if="stats?.cameraDistribution?.length" class="
                stats-section
              ">
                <h3>{{ t('statistics.triggeringCamera') }}</h3>
                <div class="stats-camera-distribution">
                  <div v-for="cam in stats?.cameraDistribution" :key="cam.camera" class="
                    stats-camera-row
                  ">
                    <span class="stats-camera-label" :style="{ color: cam.color }">{{ cam.camera }}</span>
                    <div class="stats-camera-bar-track">
                      <div class="stats-camera-bar-fill" :style="{
                        width: `${cam.percent}%`,
                        background: cam.color,
                      }"></div>
                    </div>
                    <span class="stats-camera-value">{{ cam.count }} ({{ cam.percent }}%)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quality Tab -->
            <div v-show="activeTab === 'quality'" class="
              stats-tab-content active
            ">
              <div class="stats-section">
                <h3>{{ t('statistics.dataQuality') }}</h3>
                <div id="telemetryVerifyContainer">
                  <div class="stats-telemetry-check">
                    <p class="stats-section-note">
                      Telemetry data is embedded in Tesla videos (2019+
                      vehicles). Click below to scan your events and verify
                      which have telemetry data.
                    </p>
                    <button id="verifyTelemetryBtn" class="stats-verify-btn" @click="handleVerifyTelemetry">
                      <CheckCircle2 :size="16" class="icon-mr-1-5" />
                      Verify Telemetry Data
                    </button>
                  </div>
                  <div v-if="isVerifying" id="telemetryProgress" class="
                    stats-telemetry-progress
                  ">
                    <div class="stats-progress-bar">
                      <div class="stats-progress-fill" :style="{ width: `${telemetryProgress}%` }"></div>
                    </div>
                    <p class="stats-progress-text">{{ telemetryText }}</p>
                  </div>
                  <div v-if="telemetryResults" id="telemetryResults" class="
                    stats-grid stats-grid-2
                  ">
                    <div class="stats-card stats-card-small">
                      <span class="stats-card-value">{{
                        telemetryResults.withCount
                      }}</span>
                      <span class="stats-card-label">{{
                        t('statistics.eventsWithTelemetry')
                      }}</span>
                      <span class="stats-card-percent">{{ telemetryResults.withPercent }}%</span>
                    </div>
                    <div class="stats-card stats-card-small">
                      <span class="stats-card-value">{{
                        telemetryResults.withoutCount
                      }}</span>
                      <span class="stats-card-label">{{
                        t('statistics.eventsWithoutTelemetry')
                      }}</span>
                      <span class="stats-card-percent">{{ telemetryResults.withoutPercent }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  Sun,
  X,
} from '@lucide/vue';
import type { ChartData } from 'chart.js';
import { computed, ref, watch } from 'vue';
import { eventsStore } from '../composables/useEvents';
import { useI18n } from '../composables/useI18n';
import { useModals } from '../composables/useModals';
import type { StatisticsData, TrendDataPoint } from '../types';
import BaseChart from './BaseChart.vue';

const {
  isStatisticsOpen: isOpen,
  statisticsData,
  statisticsModal,
} = useModals();
const { t } = useI18n();
const activeTab = ref('overview');
const trendMode = ref<'weekly' | 'monthly'>('weekly');

const isVerifying = ref(false);
const telemetryProgress = ref(0);
const telemetryText = ref('Checking events...');
const telemetryResults = ref<{
  withCount: number;
  withPercent: number;
  withoutCount: number;
  withoutPercent: number;
} | null>(null);

const stats = ref<StatisticsData | null>(null);

watch(
  statisticsData,
  (data) => {
    if (data) {
      stats.value = data as unknown as StatisticsData;
      activeTab.value = 'overview';
    }
  },
  { immediate: true }
);

const currentSectionTitle = computed<string>(() => {
  return t(`statistics.tabs.${activeTab.value}`);
});

const hasSentryData = computed<boolean>(() => {
  return (
    (stats.value?.eventsByType?.find((e) => e.type === 'sentry')?.count ?? 0) >
    0
  );
});

const hasTimelineEvents = computed<boolean>(() => {
  return (stats.value?.timelineData || []).some((d) => d.count > 0);
});

const hasSentryHourData = computed<boolean>(() => {
  return (stats.value?.timeOfDay || []).some((h) => h.count > 0);
});

const hasSentryDowData = computed<boolean>(() => {
  return (stats.value?.dayOfWeek || []).some((d) => d.count > 0);
});

const activeTrendData = computed<TrendDataPoint[]>(() => {
  if (!stats.value) return [];
  return trendMode.value === 'weekly'
    ? stats.value.weeklyTrends || []
    : stats.value.monthlyTrends || [];
});

const hasTrendData = computed<boolean>(() => {
  return activeTrendData.value.some((d) => d.count > 0);
});

const timelineChartData = computed<ChartData<'bar'>>(() => {
  const items = stats.value?.timelineData || [];
  return {
    labels: items.map((d) => d.label),
    datasets: [
      {
        label: t('statistics.events'),
        data: items.map((d) => d.count || 0),
        backgroundColor: '#00d4ff',
        borderRadius: 4,
      },
    ],
  };
});

const trendChartData = computed<ChartData<'bar'>>(() => {
  const items = activeTrendData.value || [];
  return {
    labels: items.map((d) => d.label),
    datasets: [
      {
        label: t('statistics.events'),
        data: items.map((d) => d.count || 0),
        backgroundColor: '#00e676',
        borderRadius: 4,
      },
    ],
  };
});

const sentryHourChartData = computed<ChartData<'bar'>>(() => {
  const items = stats.value?.timeOfDay || [];
  return {
    labels: items.map((h) => h.label),
    datasets: [
      {
        label: t('statistics.events'),
        data: items.map((h) => h.count || 0),
        backgroundColor: items.map((h) => h.color || '#ff9100'),
        borderRadius: 3,
      },
    ],
  };
});

const sentryDowChartData = computed<ChartData<'bar'>>(() => {
  const items = stats.value?.dayOfWeek || [];
  return {
    labels: items.map((d) => d.label),
    datasets: [
      {
        label: t('statistics.events'),
        data: items.map((d) => d.count || 0),
        backgroundColor: items.map((d) => d.color || '#4a9eff'),
        borderRadius: 4,
      },
    ],
  };
});

function open(data: Record<string, unknown>): void {
  statisticsModal.open(data);
}

function close(): void {
  statisticsModal.close();
}

async function handleVerifyTelemetry(): Promise<void> {
  isVerifying.value = true;
  telemetryProgress.value = 0;
  telemetryText.value = 'Scanning events for telemetry...';

  try {
    const events = eventsStore.allEvents;
    let withCount = 0;
    let withoutCount = 0;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.metadata?.est_lat && ev.metadata?.est_lon) {
        withCount++;
      } else {
        withoutCount++;
      }
      telemetryProgress.value = Math.round(((i + 1) / events.length) * 100);
      telemetryText.value = `Checked ${i + 1} of ${events.length} events...`;
    }

    const total = withCount + withoutCount;
    telemetryResults.value = {
      withCount,
      withPercent: total ? Math.round((withCount / total) * 100) : 0,
      withoutCount,
      withoutPercent: total ? Math.round((withoutCount / total) * 100) : 0,
    };
  } finally {
    isVerifying.value = false;
  }
}

defineExpose({
  open,
  close,
  isOpen,
});
</script>

<style scoped>
@reference "tailwindcss";

/* ==================== STATISTICS MODAL ==================== */

.stats-modal {
  @apply fixed inset-0 z-10000 flex items-center justify-center;
}

.stats-overlay {
  @apply absolute inset-0 bg-black/80 backdrop-blur-xs;
}

.stats-panel {
  @apply relative flex max-h-[85vh] w-[90%] max-w-200 flex-col overflow-hidden rounded-xl border border-(--border) bg-(--bg-secondary) shadow-(--shadow-lg);
}

/* Stats sidebar layout */
.stats-layout {
  @apply flex min-h-0 flex-1 overflow-hidden;
}

.stats-sidebar {
  @apply flex w-45 shrink-0 flex-col border-r border-(--border) bg-(--bg-tertiary);
}

.stats-sidebar-header {
  @apply border-b border-(--border) p-4;
}

.stats-sidebar-header h2 {
  @apply flex items-center gap-2 text-base font-semibold text-(--text-primary);
}

.stats-sidebar-header h2 svg {
  @apply size-4.5 text-(--accent);
}

.stats-nav {
  @apply flex-1 overflow-y-auto p-2;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.stats-nav-item {
  @apply mb-0.5 flex w-full cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-3 py-2.5 text-left text-[0.8rem] text-(--text-secondary) transition-all duration-150;
}

.stats-nav-item:hover {
  @apply bg-(--bg-elevated) text-(--text-primary);
}

.stats-nav-item.active {
  background: var(--accent-subtle);
  @apply text-(--accent);
}

.stats-nav-item svg {
  @apply size-4 shrink-0 opacity-70;
}

.stats-nav-item.active svg {
  @apply opacity-100;
}

.stats-main {
  @apply flex min-w-0 flex-1 flex-col overflow-hidden;
}

.stats-main-header {
  @apply flex items-center justify-between border-b border-(--border) bg-(--bg-tertiary) px-5 py-3.5;
}

.stats-section-title {
  @apply text-[0.9rem] font-semibold text-(--text-primary);
}

.stats-tab-content {
  @apply hidden;
}

.stats-tab-content.active {
  @apply block;
}

/* Mobile responsive - stack sidebar on top */
@media only screen and (max-width: 600px) {
  .stats-panel {
    @apply max-w-[95%];
  }

  .stats-layout {
    @apply flex-col;
  }

  .stats-sidebar {
    @apply w-full border-r-0 border-b border-(--border);
    max-height: none;
  }

  .stats-sidebar-header {
    @apply hidden;
  }

  .stats-nav {
    @apply flex flex-nowrap gap-1 overflow-x-auto p-2;
  }

  .stats-nav-item {
    @apply shrink-0 px-3 py-2 text-xs whitespace-nowrap;
  }

  .stats-nav-item svg {
    @apply size-3.5;
  }
}

.stats-header {
  @apply hidden;
  /* Hidden - using sidebar header instead */
}

.stats-close-btn {
  @apply cursor-pointer rounded border-none bg-transparent p-1 text-(--text-secondary) transition-all duration-200;
}

.stats-close-btn:hover {
  @apply bg-(--bg-elevated) text-(--text-primary);
}

.stats-content {
  @apply flex-1 overflow-y-auto px-6 py-5;
}

.stats-section {
  @apply mb-6;
}

.stats-section:last-child {
  @apply mb-0;
}

.stats-section h3 {
  @apply mb-3 text-xs tracking-[0.08em] text-(--text-muted) uppercase;
}

/* Stats Cards Grid */
.stats-grid {
  @apply grid grid-cols-3 gap-3;
}

.stats-card {
  @apply rounded-lg border border-(--border) bg-(--bg-tertiary) p-3.5 text-center;
}

.stats-card-value {
  @apply block font-mono text-2xl font-bold text-(--accent);
}

.stats-card-label {
  @apply mt-1 block text-[0.7rem] tracking-wider text-(--text-muted) uppercase;
}

/* Event Types Bars */
.stats-types {
  @apply flex flex-col gap-2;
}

.stats-type-item {
  @apply relative h-7 overflow-hidden rounded bg-(--bg-tertiary);
}

.stats-type-bar {
  @apply absolute top-0 left-0 h-full opacity-60 transition-[width] duration-300;
}

.stats-type-label {
  @apply relative z-1 flex h-full items-center px-3 text-[0.85rem] text-(--text-primary);
}

/* Trigger Bars */
.stats-bars {
  @apply flex flex-col gap-2.5;
}

.stats-bar-row {
  @apply grid grid-cols-[100px_1fr_80px] items-center gap-3;
}

.stats-bar-label {
  @apply text-[0.8rem] text-(--text-secondary);
}

.stats-bar-track {
  @apply h-2 overflow-hidden rounded bg-(--bg-tertiary);
}

.stats-bar-fill {
  @apply h-full rounded transition-[width] duration-300;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
}

.stats-bar-value {
  @apply text-right font-mono text-xs text-(--text-muted);
}

/* Locations */
.stats-locations {
  @apply flex flex-col gap-2;
}

.stats-location-row {
  @apply flex items-center gap-2.5 border-b border-(--border) py-2;
}

.stats-location-row:last-child {
  @apply border-b-0;
}

.stats-location-rank {
  @apply w-6 text-[0.8rem] text-(--text-muted);
}

.stats-location-name {
  @apply flex-1 text-[0.85rem] text-(--text-primary);
}

.stats-location-count {
  @apply font-mono text-xs text-(--text-muted);
}

.stats-empty {
  @apply p-4 text-center text-[0.85rem] text-(--text-muted);
}

.stats-date-range {
  @apply font-mono text-[0.9rem] text-(--text-secondary);
}

/* Stats Grid - 4 columns */
.stats-grid-4 {
  @apply grid-cols-4;
}

@media only screen and (max-width: 500px) {
  .stats-grid-4 {
    @apply grid-cols-2;
  }
}

/* Stats type label with icon */
.stats-type-label svg {
  @apply mr-1.5 align-middle;
}

/* Camera Distribution Chart */
.stats-camera-distribution {
  @apply flex flex-col gap-2;
}

.stats-camera-row {
  @apply grid grid-cols-[100px_1fr_80px] items-center gap-3;
}

.stats-camera-label {
  @apply text-[0.8rem] font-medium;
}

.stats-camera-bar-track {
  @apply h-3 overflow-hidden rounded-md bg-[--c-overlay-white-10];
}

.stats-camera-bar-fill {
  @apply h-full rounded-md transition-[width] duration-500;
}

.stats-camera-value {
  @apply text-right text-xs text-(--text-muted);
}

/* Day vs Night Chart */
.stats-day-night {
  @apply flex items-center gap-8 py-4;
}

.stats-day-night-visual {
  @apply shrink-0;
}

.stats-dn-donut {
  @apply relative flex size-20 items-center justify-center rounded-full;
  background: conic-gradient(var(--c-day-swatch) 0deg,
      var(--c-day-swatch) calc(var(--day-percent) * 3.6deg),
      var(--c-night-swatch) calc(var(--day-percent) * 3.6deg),
      var(--c-night-swatch) 360deg);
}

.stats-dn-center {
  @apply flex size-12.5 items-center justify-center rounded-full;
  background: var(--panel-bg);
}

.stats-day-night-legend {
  @apply flex flex-1 flex-col gap-3;
}

.stats-dn-item {
  @apply flex items-center gap-3;
}

.stats-dn-color {
  @apply size-4 shrink-0 rounded-[3px];
}

.stats-dn-label {
  @apply flex-1 text-[0.85rem];
}

.stats-dn-value {
  @apply text-[0.85rem] font-medium text-(--text);
}

/* Stats Grid 2-column */
.stats-grid-2 {
  @apply grid-cols-2;
}

/* Small stats card */
.stats-card-small {
  padding: 0.75rem !important;
}

.stats-card-small .stats-card-value {
  @apply text-2xl;
}

.stats-card-small .stats-card-label {
  @apply text-[0.7rem];
}

.stats-card-percent {
  @apply mt-1 block text-[0.7rem] text-(--accent);
}

/* Weekly/Monthly Trends Chart */
.stats-trends-toggle {
  @apply mb-3 flex gap-2;
}

.stats-trend-btn {
  @apply cursor-pointer rounded border border-(--border) bg-(--bg-tertiary) px-3.5 py-1.5 text-[0.8rem] text-(--text-secondary) transition-all duration-200;
}

.stats-trend-btn:hover {
  @apply border-(--accent) text-(--text-primary);
}

.stats-trend-btn.active {
  @apply border-(--accent) bg-(--accent) text-white;
}

/* Export Buttons */
.stats-export-section {
  @apply mt-2 border-t border-(--border) pt-4;
}

.stats-export-buttons {
  @apply flex flex-wrap gap-3;
}

.stats-export-btn {
  @apply inline-flex cursor-pointer items-center gap-2 rounded-md border border-(--border) bg-(--bg-tertiary) px-4 py-2.5 text-[0.85rem] text-(--text-primary) transition-all duration-200;
}

.stats-export-btn:hover {
  @apply border-(--accent) bg-(--accent) text-white;
}

.stats-export-btn svg {
  @apply size-4;
}

/* Telemetry Verification UI */
.stats-telemetry-check {
  @apply py-4 text-center;
}

.stats-verify-btn {
  @apply inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-(--accent) px-6 py-3 text-[0.9rem] font-medium text-white transition-all duration-200;
}

.stats-verify-btn:hover {
  @apply bg-(--accent-hover) -translate-y-px;
}

.stats-verify-btn svg {
  @apply size-4;
}

.stats-telemetry-progress {
  @apply py-4;
}

.stats-progress-bar {
  @apply mb-3 h-2 overflow-hidden rounded bg-(--bg-tertiary);
}

.stats-progress-fill {
  @apply h-full w-0 rounded bg-(--accent) transition-[width] duration-300;
}

.stats-progress-text {
  @apply m-0 text-center text-[0.85rem] text-(--text-secondary);
}

.stats-inline-icon {
  @apply mr-1 align-middle;
}

.stats-dn-swatch-day {
  background: var(--c-day-swatch);
}

.stats-dn-swatch-night {
  background: var(--c-night-swatch);
}

.stats-section-note {
  @apply mb-4 text-(--text-secondary);
}
</style>
