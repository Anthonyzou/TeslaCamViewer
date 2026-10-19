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
                      payload.stats?.totalEvents || 0
                    }}</span>
                    <span class="stats-card-label">{{
                      t('statistics.totalEvents')
                    }}</span>
                  </div>
                  <div class="stats-card">
                    <span class="stats-card-value">{{
                      payload.stats?.totalClips || 0
                    }}</span>
                    <span class="stats-card-label">{{
                      t('statistics.totalClips')
                    }}</span>
                  </div>
                  <div class="stats-card">
                    <span class="stats-card-value">{{
                      payload.stats?.formattedDuration || '0m'
                    }}</span>
                    <span class="stats-card-label">{{
                      t('statistics.recordingTime')
                    }}</span>
                  </div>
                  <div class="stats-card">
                    <span class="stats-card-value">{{
                      payload.storage?.displayValue || '0 B'
                    }}</span>
                    <span class="stats-card-label">{{
                      t('statistics.estStorage')
                    }}</span>
                  </div>
                </div>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.eventTypes') }}</h3>
                <div class="stats-types" v-html="payload.typesHTML"></div>
              </div>

              <div class="stats-section">
                <h3>{{ t('statistics.triggerReasons') }}</h3>
                <div
                  class="stats-bars"
                  v-html="
                    payload.triggerHTML ||
                    `<p class='stats-empty'>${t('statistics.noTrendData')}</p>`
                  "
                ></div>
              </div>

              <div v-if="payload.stats?.earliestEvent" class="stats-section">
                <h3>{{ t('statistics.dateRange') }}</h3>
                <p class="stats-date-range">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style="vertical-align: middle; margin-right: 4px"
                  >
                    <path
                      d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"
                    />
                  </svg>
                  {{
                    new Date(payload.stats.earliestEvent).toLocaleDateString()
                  }}
                  -
                  {{ new Date(payload.stats.latestEvent).toLocaleDateString() }}
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
                <div v-html="payload.charts?.timeline"></div>
              </div>
              <div class="stats-section">
                <h3>{{ t('statistics.eventTrends') }}</h3>
                <div v-html="payload.charts?.trends"></div>
              </div>
              <div class="stats-section">
                <h3>{{ t('statistics.dayVsNight') }}</h3>
                <div v-html="payload.charts?.dayNight"></div>
              </div>
            </div>

            <!-- Locations Tab -->
            <div
              v-show="activeTab === 'locations'"
              class="stats-tab-content active"
            >
              <div class="stats-section">
                <h3>{{ t('statistics.topLocations') }}</h3>
                <div
                  class="stats-locations"
                  v-html="payload.locationsHTML"
                ></div>
              </div>
              <div v-if="payload.sentryLocationsHTML" class="stats-section">
                <h3>{{ t('statistics.topSentryLocations') }}</h3>
                <div
                  class="stats-locations"
                  v-html="payload.sentryLocationsHTML"
                ></div>
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
                <div v-html="payload.charts?.timeOfDay"></div>
              </div>
              <div v-if="payload.charts?.dayOfWeek" class="stats-section">
                <h3>{{ t('statistics.sentryByDayOfWeek') }}</h3>
                <div v-html="payload.charts?.dayOfWeek"></div>
              </div>
              <div
                v-if="payload.charts?.cameraDistribution"
                class="stats-section"
              >
                <h3>{{ t('statistics.triggeringCamera') }}</h3>
                <div v-html="payload.charts?.cameraDistribution"></div>
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
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l4.59-4.59L16 11l-6 6z"
                        />
                      </svg>
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
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  X,
} from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';
import { useModals } from '../composables/useModals';

const { isStatisticsOpen: isOpen, statisticsData, statisticsModal } =
  useModals();
const { t } = useI18n();
const activeTab = ref('overview');
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

const payload = ref<Record<string, any>>({});

watch(
  statisticsData,
  (data) => {
    if (data) {
      payload.value = data;
      activeTab.value = 'overview';
    }
  },
  { immediate: true }
);

const currentSectionTitle = computed<string>(() => {
  return t(`statistics.tabs.${activeTab.value}`);
});

const hasSentryData = computed<boolean>(() => {
  return (payload.value.stats?.eventsByType?.sentry ?? 0) > 0;
});

function open(data: Record<string, any>): void {
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

function _handleExport(format: 'json' | 'csv'): void {
  if (typeof payload.value.manager?.exportStats === 'function') {
    payload.value.manager.exportStats(format);
  }
}

async function handleVerifyTelemetry(): Promise<void> {
  const mgr = payload.value.manager;
  if (!mgr) return;
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
