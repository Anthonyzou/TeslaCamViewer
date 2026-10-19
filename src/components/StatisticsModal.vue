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
                      :style="{ width: `${item.percent}%`, background: item.color }"
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
                  <div class="stats-timeline-chart">
                    <div
                      v-for="d in stats?.timelineData"
                      :key="d.date"
                      class="stats-timeline-bar"
                      :title="`${d.label}: ${d.count} events`"
                    >
                      <div
                        class="stats-timeline-fill"
                        :style="{
                          height: `${Math.max(d.percent, d.count > 0 ? 5 : 0)}%`,
                        }"
                      ></div>
                      <span class="stats-timeline-count">{{
                        d.count || ''
                      }}</span>
                    </div>
                  </div>
                  <div
                    v-if="stats?.timelineData?.length"
                    class="stats-timeline-labels"
                  >
                    <span>{{ stats.timelineData[0].label }}</span>
                    <span>{{
                      stats.timelineData[
                        Math.floor(stats.timelineData.length / 2)
                      ].label
                    }}</span>
                    <span>{{
                      stats.timelineData[stats.timelineData.length - 1].label
                    }}</span>
                  </div>
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
                  <div class="stats-trends-container">
                    <div class="stats-trends-chart">
                      <div
                        v-for="d in activeTrendData"
                        :key="d.label"
                        class="stats-trend-bar"
                        :title="`${d.label}: ${d.count} ${t('statistics.events')}`"
                      >
                        <div
                          class="stats-trend-fill"
                          :style="{
                            height: `${Math.max(d.percent, d.count > 0 ? 5 : 0)}%`,
                          }"
                        ></div>
                        <span class="stats-trend-count">{{
                          d.count || ''
                        }}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="activeTrendData?.length"
                    class="stats-trends-labels"
                  >
                    <span>{{ activeTrendData[0]?.label }}</span>
                    <span>{{
                      activeTrendData[
                        Math.floor(activeTrendData.length / 2)
                      ]?.label
                    }}</span>
                    <span>{{
                      activeTrendData[activeTrendData.length - 1]?.label
                    }}</span>
                  </div>
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noTrendData') }}
                </p>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.dayVsNight') }}</h3>
                <div
                  v-if="(stats?.dayVsNight?.day || 0) + (stats?.dayVsNight?.night || 0) > 0"
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
              <div
                v-if="stats?.sentryLocations?.length"
                class="stats-section"
              >
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
                  <div class="stats-hour-chart">
                    <div
                      v-for="h in stats?.timeOfDay"
                      :key="h.hour"
                      class="stats-hour-bar"
                      :title="`${h.label}: ${h.count} events`"
                    >
                      <div
                        class="stats-hour-fill"
                        :style="{
                          height: `${Math.max(h.percent, h.count > 0 ? 5 : 0)}%`,
                          background: h.color,
                        }"
                      ></div>
                    </div>
                  </div>
                  <div class="stats-hour-labels">
                    <span>12am</span>
                    <span>6am</span>
                    <span>12pm</span>
                    <span>6pm</span>
                    <span>12am</span>
                  </div>
                </div>
                <p v-else class="stats-empty">
                  {{ t('statistics.noSentryEvents') }}
                </p>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.sentryByDayOfWeek') }}</h3>
                <div v-if="hasSentryDowData">
                  <div class="stats-dow-chart">
                    <div
                      v-for="d in stats?.dayOfWeek"
                      :key="d.day"
                      class="stats-dow-bar"
                      :title="`${d.label}: ${d.count} events`"
                    >
                      <div
                        class="stats-dow-fill"
                        :style="{
                          height: `${Math.max(d.percent, d.count > 0 ? 5 : 0)}%`,
                          background: d.color,
                        }"
                      ></div>
                      <span class="stats-dow-label">{{ d.label }}</span>
                    </div>
                  </div>
                  <div class="stats-dow-legend">
                    <span class="stats-legend-item">
                      <span
                        class="stats-legend-color"
                        style="background: #4a9eff"
                      ></span>
                      Weekday
                    </span>
                    <span class="stats-legend-item">
                      <span
                        class="stats-legend-color"
                        style="background: #ff9800"
                      ></span>
                      Weekend
                    </span>
                  </div>
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
import { computed, ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';
import { useModals } from '../composables/useModals';
import type { StatisticsData, TrendDataPoint } from '../types';

const { isStatisticsOpen: isOpen, statisticsData, statisticsModal } =
  useModals();
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
