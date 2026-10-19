<template>
  <div
    :class="[
      'event-item',
      {
        active: isSelected,
        'event-empty': event.isEmpty,
      },
    ]"
    :data-event-name="event.name"
    :data-event-key="event.compoundKey || event.name"
    @click="handleClick"
  >
    <!-- Thumbnail or Placeholder -->
    <img
      v-if="thumbnailUrl"
      loading="lazy"
      :src="thumbnailUrl"
      alt="Event thumbnail"
      class="event-thumbnail"
    />
    <div v-else class="event-thumbnail-placeholder">
      <span class="placeholder-icon">🎥</span>
      <span class="placeholder-text">{{ clipCount }} Clips</span>
      <span v-if="timeRange" class="placeholder-time">{{ timeRange }}</span>
    </div>

    <!-- Header -->
    <div class="event-item-header">
      <span
        v-if="event.driveLabel"
        class="drive-badge"
        :style="{ background: event.driveColor || 'var(--accent)' }"
        :title="event.driveLabel"
      >
        {{ event.driveLabel }}
      </span>
      <span :class="['event-type', typeClass]">{{ typeClass }}</span>
      <span
        v-if="health.status !== 'healthy'"
        :class="['health-badge', `health-${health.status}`]"
        :title="healthTooltip"
      >
        {{ health.icon }}
      </span>
      <span class="event-item-date">{{ dateStr }}</span>
    </div>

    <!-- Event details -->
    <div class="event-item-time">{{ timeStr }}</div>
    <div v-if="location" class="event-item-location">{{ location }}</div>
    <div v-if="gpsText" class="event-gps">{{ gpsText }}</div>
    <div v-if="reason" class="event-item-reason">{{ reason }}</div>
    <div v-if="weatherText" class="event-item-weather">{{ weatherText }}</div>
    <div class="event-item-clips">
      <span v-if="event.isEmpty" class="empty-warning">⚠ No video clips</span>
      <template v-else>
        {{ clipCount }} clips (~{{ durationMinutes }} min)
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  computeRecordingHealth,
  getTimeRangeFromClips,
} from '../services/eventBrowser';
import { settingsManager } from '../services/settingsManager';
import type { TeslaCamEvent } from '../types';
import { formatReason } from '../utils/teslaCamFormat';
import weatherService from '../utils/weatherService';

const props = defineProps<{
  event: TeslaCamEvent;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', event: TeslaCamEvent): void;
}>();

const weatherText = ref('');
const thumbnailUrl = ref(props.event.thumbnailUrl || '');

async function resolveThumbnail(): Promise<void> {
  if (props.event.thumbnailUrl) {
    thumbnailUrl.value = props.event.thumbnailUrl;
    return;
  }
  if (props.event.thumbnailFile) {
    try {
      const file = await props.event.thumbnailFile.getFile();
      const url = URL.createObjectURL(file);
      thumbnailUrl.value = url;
    } catch (e) {
      console.warn('[EventCard] Failed to load thumbnail:', e);
    }
  }
}

watch(
  [() => props.event.thumbnailUrl, () => props.event.thumbnailFile],
  () => {
    resolveThumbnail();
  },
  { immediate: true }
);

const typeClass = computed(() => {
  return (props.event.type || '').toLowerCase().replace('clips', '');
});

const clipCount = computed(() => {
  return props.event.clipGroups?.length || 0;
});

const durationMinutes = computed(() => {
  return ((clipCount.value * 60) / 60).toFixed(1);
});

const timeRange = computed(() => {
  return getTimeRangeFromClips(props.event);
});

const health = computed(() => {
  return computeRecordingHealth(props.event);
});

const healthTooltip = computed(() => {
  if (health.value.issues.length === 0) return '';
  return `Recording health issues:\n• ${health.value.issues.join('\n• ')}`;
});

const date = computed(() => new Date(props.event.timestamp));

const dateStr = computed(() => {
  if (isNaN(date.value.getTime())) return '';
  return date.value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
});

const timeStr = computed(() => {
  if (isNaN(date.value.getTime())) return '';
  return date.value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
});

const location = computed(() => {
  if (!props.event.metadata) return '';
  const city = props.event.metadata.city || '';
  const street = props.event.metadata.street || '';
  if (city && street) return `${street}, ${city}`;
  return city || street || '';
});

const gpsText = computed(() => {
  if (!props.event.metadata?.est_lat || !props.event.metadata?.est_lon) return '';
  const lat = parseFloat(String(props.event.metadata.est_lat));
  const lon = parseFloat(String(props.event.metadata.est_lon));
  if (!isNaN(lat) && !isNaN(lon)) {
    return `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
  return '';
});

const reason = computed(() => {
  if (!props.event.metadata?.reason) return '';
  return formatReason(props.event.metadata.reason);
});

async function loadWeather(): Promise<void> {
  const metadata = props.event.metadata;
  if (!metadata?.est_lat || !metadata?.est_lon || !props.event.timestamp) return;

  const lat = parseFloat(String(metadata.est_lat));
  const lng = parseFloat(String(metadata.est_lon));
  if (isNaN(lat) || isNaN(lng)) return;

  try {
    const weather = await weatherService.getWeather(
      lat,
      lng,
      date.value
    );
    if (weather) {
      weatherText.value = `${weather.icon} ${weather.temperature}${weather.temperatureUnit} ${weather.description}`;
    }
  } catch (_err) {
    // Weather is supplementary
  }
}

let unsubSettings: (() => void) | null = null;

onMounted(() => {
  loadWeather();
  unsubSettings = settingsManager.onChange(() => {
    loadWeather();
  });
});

onUnmounted(() => {
  if (unsubSettings) unsubSettings();
});

watch(
  () => [props.event.metadata?.est_lat, props.event.metadata?.est_lon],
  () => {
    loadWeather();
  }
);

function handleClick(): void {
  if (props.event.isEmpty) {
    const dateFormatted = !isNaN(date.value.getTime())
      ? date.value.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'selected event';
    if (window.app?.showToast) {
      window.app.showToast(
        `No video clips available for event on ${dateFormatted}`,
        'warning'
      );
    } else {
      console.warn(`No video clips available for event on ${dateFormatted}`);
    }
  } else {
    emit('select', props.event);
  }
}
</script>

<style scoped>
/* Event Cards */
.event-item {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.875rem;
    margin-bottom: 0.625rem;
    cursor: pointer;
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
}

/* Subtle gradient overlay */
.event-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
    pointer-events: none;
}

.event-item:hover {
    background: var(--bg-elevated);
    border-color: var(--border-accent);
    transform: translateX(4px);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.1);
}

.event-item.active {
    background: linear-gradient(135deg, var(--accent-subtle) 0%, var(--bg-elevated) 100%);
    border-color: var(--accent);
    box-shadow: 0 0 25px var(--accent-glow), inset 0 0 30px rgba(0, 212, 255, 0.05);
}

.event-item.active .event-item-location,
.event-item.active .event-item-reason,
.event-item.active .event-item-weather,
.event-item.active .event-gps {
    color: var(--text-secondary);
}

.event-thumbnail {
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: 6px;
    margin-bottom: 0.625rem;
    background: var(--bg-void);
    display: block;
    border: 1px solid var(--border);
}

/* Placeholder for events without thumbnails (e.g., RecentClips) */
.event-thumbnail-placeholder {
    width: 100%;
    height: 120px;
    border-radius: 6px;
    margin-bottom: 0.625rem;
    background: linear-gradient(135deg, var(--bg-void) 0%, var(--bg-tertiary) 100%);
    border: 1px dashed var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
}

.event-thumbnail-placeholder .placeholder-icon {
    font-size: 1.75rem;
    opacity: 0.6;
}

.event-thumbnail-placeholder .placeholder-text {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.event-thumbnail-placeholder .placeholder-time {
    font-size: 0.7rem;
    color: var(--text-muted);
}

/* Preview video overlay for hover */
.preview-video {
    position: absolute;
    top: 0.875rem;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 1.75rem);
    height: 120px;
    object-fit: cover;
    border-radius: 6px;
    background: var(--bg-void);
    border: 1px solid var(--accent);
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 5;
    pointer-events: none;
}

.event-item:hover .preview-video {
    opacity: 1;
}

/* Hide thumbnail when preview is playing */
.event-item:hover .preview-video+.event-thumbnail,
.event-item:hover .event-thumbnail:has(+ .preview-video) {
    opacity: 0;
}

.event-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.375rem;
    gap: 0.5rem;
}

.event-type {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.625rem;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    /* Explicit text color — previously inherited --text-muted (#5c6370),
     * which rendered nearly invisible against the dark gradient fills. */
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.event-type.saved {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 0 10px rgba(37, 99, 235, 0.3);
}

.event-type.sentry {
    background: linear-gradient(135deg, var(--danger) 0%, #cc2929 100%);
    box-shadow: 0 0 10px var(--danger-glow);
}

.event-type.recent {
    /* Slightly lighter gradient + brighter text — the original gray-on-gray
     * combo was the worst offender for legibility. */
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

/* Drive badge for multi-drive support */
.drive-badge {
    display: inline-block;
    padding: 0.125rem 0.4rem;
    border-radius: 3px;
    font-size: 0.6rem;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    flex-shrink: 0;
    margin-right: 0.375rem;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.nearmiss-indicator {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 0.25rem;
    text-shadow: none;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.nearmiss-indicator:hover {
    transform: scale(1.1);
}

.nearmiss-indicator:active {
    transform: scale(0.95);
}

.nearmiss-indicator.critical {
    background: rgba(255, 59, 59, 0.9);
    color: white;
    box-shadow: 0 0 8px rgba(255, 59, 59, 0.5);
}

.nearmiss-indicator.critical:hover {
    box-shadow: 0 0 12px rgba(255, 59, 59, 0.8);
}

.nearmiss-indicator.warning {
    background: rgba(255, 145, 0, 0.9);
    color: white;
    box-shadow: 0 0 8px rgba(255, 145, 0, 0.5);
}

.nearmiss-indicator.warning:hover {
    box-shadow: 0 0 12px rgba(255, 145, 0, 0.8);
}

.nearmiss-indicator.caution {
    background: rgba(255, 193, 7, 0.9);
    color: #1a1a1a;
    box-shadow: 0 0 8px rgba(255, 193, 7, 0.4);
}

.nearmiss-indicator.caution:hover {
    box-shadow: 0 0 12px rgba(255, 193, 7, 0.7);
}

.event-item-date {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-secondary);
}

.event-item-time {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.event-item-location {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
}

.event-gps {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
    opacity: 0.8;
}

.event-item-reason {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
}

.event-item-weather {
    font-size: 0.75rem;
    color: var(--text-secondary);
}

.event-item-weather:empty {
    display: none;
}

.event-item-clips {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--accent);
    margin-top: 0.375rem;
    opacity: 0.8;
}

/* Empty events (no usable video clips) */
.event-item.event-empty {
    opacity: 0.5;
    position: relative;
}

.event-item.event-empty::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(-45deg,
            transparent,
            transparent 8px,
            rgba(255, 59, 59, 0.05) 8px,
            rgba(255, 59, 59, 0.05) 16px);
    pointer-events: none;
    border-radius: 6px;
}

.event-item.event-empty:hover {
    opacity: 0.6;
}

.event-item.event-empty .event-item-clips .empty-warning {
    color: var(--danger);
    opacity: 1;
}

/* Empty event toast notification */
.empty-event-toast {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--bg-elevated);
    border: 1px solid var(--danger);
    border-radius: 8px;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    box-shadow: 0 4px 20px rgba(255, 59, 59, 0.3);
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
    font-size: 0.875rem;
}

.empty-event-toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

.empty-event-toast .toast-icon {
    font-size: 1.25rem;
    color: var(--danger);
}

.empty-event-toast .toast-message {
    color: var(--text-primary);
}

/* ==================== Recording Health Badge ==================== */
.health-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1;
    cursor: help;
    margin-left: 2px;
}

.health-badge.health-minor {
    background: rgba(255, 184, 0, 0.2);
    color: #ffb800;
    border: 1px solid rgba(255, 184, 0, 0.5);
}

.health-badge.health-warning {
    background: rgba(248, 113, 113, 0.2);
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.55);
}

/* ==================== Intervention Severity Badge ==================== */
.severity-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.3;
    cursor: help;
    margin-left: 3px;
    text-transform: uppercase;
}

.severity-badge.severity-moderate {
    background: rgba(250, 204, 21, 0.18);
    color: #facc15;
    border: 1px solid rgba(250, 204, 21, 0.55);
}

.severity-badge.severity-severe {
    background: rgba(251, 146, 60, 0.22);
    color: #fb923c;
    border: 1px solid rgba(251, 146, 60, 0.6);
}

.severity-badge.severity-critical {
    background: rgba(248, 113, 113, 0.25);
    color: #f87171;
    border: 1px solid rgba(248, 113, 113, 0.7);
    animation: pulse-critical 1.6s ease-in-out infinite;
}

@keyframes pulse-critical {

    0%,
    100% {
        box-shadow: 0 0 3px rgba(248, 113, 113, 0.5);
    }

    50% {
        box-shadow: 0 0 10px rgba(248, 113, 113, 0.9);
    }
}

.severity-badge.clickable {
    cursor: pointer;
}

.severity-badge.clickable:hover {
    filter: brightness(1.2);
}

/* ==================== Launch / Full-Throttle Badge ==================== */
/* Only rendered when an event has at least one detected launch. Pill
   shape matches the severity badge for visual rhythm; checker-flag
   emoji + green ink reads as "performance highlight" without
   competing with the warning palette used by severity/health. */
.launch-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 0.64rem;
    font-weight: 700;
    line-height: 1.4;
    letter-spacing: 0.02em;
    background: rgba(74, 222, 128, 0.16);
    color: #4ade80;
    border: 1px solid rgba(74, 222, 128, 0.45);
}

/* Popover listing each detected severity moment */
.severity-popover {
    position: fixed;
    z-index: 10000;
    background: #2d2d2d;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
    padding: 4px;
    min-width: 220px;
    max-width: 320px;
    font-size: 0.75rem;
    color: #e0e0e0;
}

.severity-popover-row {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 8px;
    align-items: center;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
}

.severity-popover-row:hover {
    background: #3a3a3a;
}

.severity-popover-row .sev-tier {
    font-weight: 700;
    font-size: 0.65rem;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 8px;
}

.severity-popover-row.sev-moderate .sev-tier {
    color: #facc15;
    background: rgba(250, 204, 21, 0.15);
    border: 1px solid rgba(250, 204, 21, 0.4);
}

.severity-popover-row.sev-severe .sev-tier {
    color: #fb923c;
    background: rgba(251, 146, 60, 0.2);
    border: 1px solid rgba(251, 146, 60, 0.5);
}

.severity-popover-row.sev-critical .sev-tier {
    color: #f87171;
    background: rgba(248, 113, 113, 0.22);
    border: 1px solid rgba(248, 113, 113, 0.6);
}

.severity-popover-row .sev-kind {
    color: #e0e0e0;
}

.severity-popover-row .sev-g {
    color: #9ca3af;
    font-variant-numeric: tabular-nums;
}

.severity-popover-row .sev-time {
    color: #4a9eff;
    font-variant-numeric: tabular-nums;
}
</style>
