<template>
  <div v-if="isOpen" class="stats-modal" @keydown.esc="close">
    <div
      class="stats-overlay"
      @mousedown="onOverlayMouseDown"
      @click="onOverlayClick"
    ></div>
    <div class="stats-panel">
      <div class="stats-layout">
        <!-- Sidebar Navigation -->
        <div class="stats-sidebar">
          <div class="stats-sidebar-header">
            <h2>
              <BarChart3 :size="20" style="margin-right: 8px" />
              {{ t('statistics.title') }}
            </h2>
          </div>
          <nav class="stats-nav">
            <button
              class="stats-nav-item"
              :class="{ active: activeTab === 'overview' }"
              @click="activeTab = 'overview'"
            >
              <BarChart3 :size="18" />
              {{ t('statistics.tabs.overview') }}
            </button>
            <button
              class="stats-nav-item"
              :class="{ active: activeTab === 'timeline' }"
              @click="activeTab = 'timeline'"
            >
              <Clock :size="18" />
              {{ t('statistics.tabs.timeline') }}
            </button>
            <button
              class="stats-nav-item"
              :class="{ active: activeTab === 'locations' }"
              @click="activeTab = 'locations'"
            >
              <MapPin :size="18" />
              {{ t('statistics.tabs.locations') }}
            </button>
            <button
              v-if="hasSentryData"
              class="stats-nav-item"
              :class="{ active: activeTab === 'sentry' }"
              @click="activeTab = 'sentry'"
            >
              <Shield :size="18" />
              {{ t('statistics.tabs.sentry') }}
            </button>
            <button
              class="stats-nav-item"
              :class="{ active: activeTab === 'quality' }"
              @click="activeTab = 'quality'"
            >
              <CheckCircle2 :size="18" />
              {{ t('statistics.tabs.quality') }}
            </button>
          </nav>
        </div>

        <!-- Main Content Area -->
        <div class="stats-main">
          <div class="stats-main-header">
            <h3 class="stats-section-title">{{ currentSectionTitle }}</h3>
            <button
              class="stats-close-btn"
              :title="t('statistics.close')"
              @click="close"
            >
              <X :size="20" />
            </button>
          </div>

          <div class="stats-content">
            <!-- Overview Tab -->
            <div
              v-show="activeTab === 'overview'"
              class="stats-tab-content active"
            >
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
                  <div
                    v-for="item in stats?.eventsByType"
                    :key="item.type"
                    class="stats-type-item"
                  >
                    <div
                      class="stats-type-bar"
                      :style="{
                        width: `${item.percent}%`,
                        background: item.color,
                      }"
                    ></div>
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
                  <div
                    v-for="trig in stats?.triggerReasons"
                    :key="trig.reason"
                    class="stats-bar-row"
                  >
                    <span class="stats-bar-label">{{ trig.reason }}</span>
                    <div class="stats-bar-track">
                      <div
                        class="stats-bar-fill"
                        :style="{ width: `${trig.percent}%` }"
                      ></div>
                    </div>
                    <span class="stats-bar-value"
                      >{{ trig.count }} ({{ trig.percent }}%)</span
                    >
                  </div>
                  <p v-if="!stats?.triggerReasons?.length" class="stats-empty">
                    {{ t('statistics.noTrendData') }}
                  </p>
                </div>
              </div>

              <div v-if="stats?.earliestEvent" class="stats-section">
                <h3>{{ t('statistics.dateRange') }}</h3>
                <p class="stats-date-range">
                  <Calendar
                    :size="14"
                    style="vertical-align: middle; margin-right: 4px"
                  />
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
            <div
              v-show="activeTab === 'timeline'"
              class="stats-tab-content active"
            >
              <div class="stats-section">
                <h3>{{ t('statistics.eventsLast14Days') }}</h3>
                <div v-if="hasTimelineEvents">
                  <BaseChart
                    :data="timelineChartData"
                    :height="140"
                  />
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noEventsLast14Days') }}
                </p>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.eventTrends') }}</h3>
                <div class="stats-trends-toggle">
                  <button
                    class="stats-trend-btn"
                    :class="{ active: trendMode === 'weekly' }"
                    @click="trendMode = 'weekly'"
                  >
                    {{ t('statistics.weekly') }}
                  </button>
                  <button
                    class="stats-trend-btn"
                    :class="{ active: trendMode === 'monthly' }"
                    @click="trendMode = 'monthly'"
                  >
                    {{ t('statistics.monthly') }}
                  </button>
                </div>
                <div v-if="hasTrendData">
                  <BaseChart
                    :data="trendChartData"
                    :height="140"
                  />
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noTrendData') }}
                </p>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.dayVsNight') }}</h3>
                <div
                  v-if="
                    (stats?.dayVsNight?.day || 0) +
                      (stats?.dayVsNight?.night || 0) >
                    0
                  "
                  class="stats-day-night"
                >
                  <div class="stats-day-night-visual">
                    <div
                      class="stats-dn-donut"
                      :style="{
                        '--day-percent': stats?.dayVsNight?.dayPercent || 0,
                      }"
                    >
                      <div class="stats-dn-center">
                        <Sun :size="20" color="#ffc107" />
                      </div>
                    </div>
                  </div>
                  <div class="stats-day-night-legend">
                    <div class="stats-dn-item">
                      <span
                        class="stats-dn-color"
                        style="background: #ffc107"
                      ></span>
                      <span class="stats-dn-label">Day (6am-8pm)</span>
                      <span class="stats-dn-value"
                        >{{ stats?.dayVsNight?.day }} ({{
                          stats?.dayVsNight?.dayPercent
                        }}%)</span
                      >
                    </div>
                    <div class="stats-dn-item">
                      <span
                        class="stats-dn-color"
                        style="background: #1a237e"
                      ></span>
                      <span class="stats-dn-label">Night (8pm-6am)</span>
                      <span class="stats-dn-value"
                        >{{ stats?.dayVsNight?.night }} ({{
                          stats?.dayVsNight?.nightPercent
                        }}%)</span
                      >
                    </div>
                  </div>
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noEventData') }}
                </p>
              </div>
            </div>

            <!-- Locations Tab -->
            <div
              v-show="activeTab === 'locations'"
              class="stats-tab-content active"
            >
              <div class="stats-section">
                <h3>{{ t('statistics.topLocations') }}</h3>
                <div class="stats-locations">
                  <div
                    v-for="(item, idx) in stats?.topLocations"
                    :key="item.location"
                    class="stats-location-row"
                  >
                    <span class="stats-location-rank">{{ idx + 1 }}.</span>
                    <span class="stats-location-name">{{ item.location }}</span>
                    <span class="stats-location-count"
                      >{{ item.count }} {{ t('statistics.events') }}</span
                    >
                  </div>
                  <p v-if="!stats?.topLocations?.length" class="stats-empty">
                    {{ t('statistics.noLocationData') }}
                  </p>
                </div>
              </div>
              <div v-if="stats?.sentryLocations?.length" class="stats-section">
                <h3>{{ t('statistics.topSentryLocations') }}</h3>
                <div class="stats-locations">
                  <div
                    v-for="(item, idx) in stats?.sentryLocations"
                    :key="item.location"
                    class="stats-location-row"
                  >
                    <span class="stats-location-rank">{{ idx + 1 }}.</span>
                    <span class="stats-location-name">{{ item.location }}</span>
                    <span class="stats-location-count"
                      >{{ item.count }} {{ t('statistics.events') }}</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Sentry Tab -->
            <div
              v-if="hasSentryData"
              v-show="activeTab === 'sentry'"
              class="stats-tab-content active"
            >
              <div class="stats-section">
                <h3>{{ t('statistics.sentryByTimeOfDay') }}</h3>
                <div v-if="hasSentryHourData">
                  <BaseChart
                    :data="sentryHourChartData"
                    :height="140"
                  />
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noSentryEvents') }}
                </p>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.sentryByDayOfWeek') }}</h3>
                <div v-if="hasSentryDowData">
                  <BaseChart
                    :data="sentryDowChartData"
                    :height="140"
                  />
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noSentryEvents') }}
                </p>
              </div>

              <div
                v-if="stats?.cameraDistribution?.length"
                class="stats-section"
              >
                <h3>{{ t('statistics.triggeringCamera') }}</h3>
                <div class="stats-camera-distribution">
                  <div
                    v-for="cam in stats?.cameraDistribution"
                    :key="cam.camera"
                    class="stats-camera-row"
                  >
                    <span
                      class="stats-camera-label"
                      :style="{ color: cam.color }"
                      >{{ cam.camera }}</span
                    >
                    <div class="stats-camera-bar-track">
                      <div
                        class="stats-camera-bar-fill"
                        :style="{
                          width: `${cam.percent}%`,
                          background: cam.color,
                        }"
                      ></div>
                    </div>
                    <span class="stats-camera-value"
                      >{{ cam.count }} ({{ cam.percent }}%)</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Quality Tab -->
            <div
              v-show="activeTab === 'quality'"
              class="stats-tab-content active"
            >
              <div class="stats-section">
                <h3>{{ t('statistics.dataQuality') }}</h3>
                <div id="telemetryVerifyContainer">
                  <div class="stats-telemetry-check">
                    <p
                      style="color: var(--text-secondary); margin-bottom: 1rem"
                    >
                      Telemetry data is embedded in Tesla videos (2019+
                      vehicles). Click below to scan your events and verify
                      which have telemetry data.
                    </p>
                    <button
                      id="verifyTelemetryBtn"
                      class="stats-verify-btn"
                      @click="handleVerifyTelemetry"
                    >
                      <CheckCircle2 :size="16" style="margin-right: 6px" />
                      Verify Telemetry Data
                    </button>
                  </div>
                  <div
                    v-if="isVerifying"
                    id="telemetryProgress"
                    class="stats-telemetry-progress"
                  >
                    <div class="stats-progress-bar">
                      <div
                        class="stats-progress-fill"
                        :style="{ width: `${telemetryProgress}%` }"
                      ></div>
                    </div>
                    <p class="stats-progress-text">{{ telemetryText }}</p>
                  </div>
                  <div
                    v-if="telemetryResults"
                    id="telemetryResults"
                    class="stats-grid stats-grid-2"
                  >
                    <div class="stats-card stats-card-small">
                      <span class="stats-card-value">{{
                        telemetryResults.withCount
                      }}</span>
                      <span class="stats-card-label">{{
                        t('statistics.eventsWithTelemetry')
                      }}</span>
                      <span class="stats-card-percent"
                        >{{ telemetryResults.withPercent }}%</span
                      >
                    </div>
                    <div class="stats-card stats-card-small">
                      <span class="stats-card-value">{{
                        telemetryResults.withoutCount
                      }}</span>
                      <span class="stats-card-label">{{
                        t('statistics.eventsWithoutTelemetry')
                      }}</span>
                      <span class="stats-card-percent"
                        >{{ telemetryResults.withoutPercent }}%</span
                      >
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
} from 'lucide-vue-next';
import type { ChartData } from 'chart.js';
import { computed, ref, watch } from 'vue';
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
let mouseDownOnOverlay = false;

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

function onOverlayMouseDown(e: MouseEvent): void {
  mouseDownOnOverlay = (e.target as HTMLElement).classList.contains(
    'stats-overlay'
  );
}

function onOverlayClick(e: MouseEvent): void {
  if (
    mouseDownOnOverlay &&
    (e.target as HTMLElement).classList.contains('stats-overlay')
  ) {
    close();
  }
}

async function handleVerifyTelemetry(): Promise<void> {
  isVerifying.value = true;
  telemetryProgress.value = 0;
  telemetryText.value = 'Scanning events for telemetry...';

  try {
    const events = window.app?.allEvents || [];
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
/* ==================== STATISTICS MODAL ==================== */

.stats-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
}

.stats-panel {
  position: relative;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

/* Stats sidebar layout */
.stats-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.stats-sidebar {
  width: 180px;
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.stats-sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}

.stats-sidebar-header h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats-sidebar-header h2 svg {
  width: 18px;
  height: 18px;
  color: var(--accent);
}

.stats-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.stats-nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.8rem;
  text-align: left;
  transition: all 0.15s ease;
  margin-bottom: 2px;
}

.stats-nav-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.stats-nav-item.active {
  background: var(--accent-subtle, rgba(74, 158, 255, 0.15));
  color: var(--accent);
}

.stats-nav-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}

.stats-nav-item.active svg {
  opacity: 1;
}

.stats-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.stats-main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.stats-section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.stats-tab-content {
  display: none;
}

.stats-tab-content.active {
  display: block;
}

/* Mobile responsive - stack sidebar on top */
@media only screen and (max-width: 600px) {
  .stats-panel {
    max-width: 95%;
  }

  .stats-layout {
    flex-direction: column;
  }

  .stats-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
    max-height: none;
  }

  .stats-sidebar-header {
    display: none;
  }

  .stats-nav {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 0.5rem;
    gap: 0.25rem;
  }

  .stats-nav-item {
    flex-shrink: 0;
    padding: 0.5rem 0.75rem;
    white-space: nowrap;
    font-size: 0.75rem;
  }

  .stats-nav-item svg {
    width: 14px;
    height: 14px;
  }
}

.stats-header {
  display: none;
  /* Hidden - using sidebar header instead */
}

.stats-close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.stats-close-btn:hover {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

.stats-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}

.stats-section {
  margin-bottom: 1.5rem;
}

.stats-section:last-child {
  margin-bottom: 0;
}

.stats-section h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

/* Stats Cards Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.stats-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.875rem;
  text-align: center;
}

.stats-card-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  font-family: var(--font-mono);
}

.stats-card-label {
  display: block;
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Event Types Bars */
.stats-types {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stats-type-item {
  position: relative;
  height: 28px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.stats-type-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  opacity: 0.6;
  transition: width 0.3s ease;
}

.stats-type-label {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 0.75rem;
  font-size: 0.85rem;
  color: var(--text-primary);
}

/* Trigger Bars */
.stats-bars {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.stats-bar-row {
  display: grid;
  grid-template-columns: 100px 1fr 80px;
  gap: 0.75rem;
  align-items: center;
}

.stats-bar-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.stats-bar-track {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.stats-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.stats-bar-value {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: right;
  font-family: var(--font-mono);
}

/* Locations */
.stats-locations {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stats-location-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.stats-location-row:last-child {
  border-bottom: none;
}

.stats-location-rank {
  font-size: 0.8rem;
  color: var(--text-muted);
  width: 1.5rem;
}

.stats-location-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.stats-location-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.stats-empty {
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
  padding: 1rem;
}

.stats-date-range {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

/* Stats Grid - 4 columns */
.stats-grid-4 {
  grid-template-columns: repeat(4, 1fr);
}

@media only screen and (max-width: 500px) {
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Stats type label with icon */
.stats-type-label svg {
  margin-right: 6px;
  vertical-align: middle;
}

/* Camera Distribution Chart */
.stats-camera-distribution {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stats-camera-row {
  display: grid;
  grid-template-columns: 100px 1fr 80px;
  gap: 0.75rem;
  align-items: center;
}

.stats-camera-label {
  font-size: 0.8rem;
  font-weight: 500;
}

.stats-camera-bar-track {
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.stats-camera-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.stats-camera-value {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: right;
}

/* Day vs Night Chart */
.stats-day-night {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1rem 0;
}

.stats-day-night-visual {
  flex-shrink: 0;
}

.stats-dn-donut {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(
    #ffc107 0deg,
    #ffc107 calc(var(--day-percent) * 3.6deg),
    #1a237e calc(var(--day-percent) * 3.6deg),
    #1a237e 360deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.stats-dn-center {
  width: 50px;
  height: 50px;
  background: var(--panel-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-day-night-legend {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.stats-dn-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stats-dn-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
}

.stats-dn-label {
  font-size: 0.85rem;
  flex: 1;
}

.stats-dn-value {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
}

/* Stats Grid 2-column */
.stats-grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

/* Small stats card */
.stats-card-small {
  padding: 0.75rem !important;
}

.stats-card-small .stats-card-value {
  font-size: 1.5rem;
}

.stats-card-small .stats-card-label {
  font-size: 0.7rem;
}

.stats-card-percent {
  font-size: 0.7rem;
  color: var(--accent);
  margin-top: 0.25rem;
  display: block;
}

/* Weekly/Monthly Trends Chart */
.stats-trends-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.stats-trend-btn {
  padding: 0.4rem 0.8rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stats-trend-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.stats-trend-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

/* Export Buttons */
.stats-export-section {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  margin-top: 0.5rem;
}

.stats-export-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.stats-export-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stats-export-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.stats-export-btn svg {
  width: 16px;
  height: 16px;
}

/* Telemetry Verification UI */
.stats-telemetry-check {
  text-align: center;
  padding: 1rem 0;
}

.stats-verify-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stats-verify-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.stats-verify-btn svg {
  width: 16px;
  height: 16px;
}

.stats-telemetry-progress {
  padding: 1rem 0;
}

.stats-progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.stats-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  width: 0;
  transition: width 0.3s ease;
}

.stats-progress-text {
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}
</style>
