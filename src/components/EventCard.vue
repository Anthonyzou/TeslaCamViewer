<template>
  <div :class="[
    'event-item',
    {
      active: isSelected,
      'event-empty': event.isEmpty,
    },
  ]" :data-event-name="event.name" :data-event-key="event.compoundKey || event.name" @click="handleClick">
    <!-- Thumbnail or Placeholder -->
    <img v-if="thumbnailUrl" loading="lazy" :src="thumbnailUrl" alt="Event thumbnail" class="
      event-thumbnail
    " />
    <div v-else class="event-thumbnail-placeholder">
      <span class="placeholder-icon">🎥</span>
      <span class="placeholder-text">{{ clipCount }} Clips</span>
      <span v-if="timeRange" class="placeholder-time">{{ timeRange }}</span>
    </div>

    <!-- Header -->
    <div class="event-item-header">
      <span v-if="event.driveLabel" class="drive-badge" :style="{ background: event.driveColor || 'var(--accent)' }"
        :title="event.driveLabel">
        {{ event.driveLabel }}
      </span>
      <span :class="['event-type', typeClass]">{{ typeClass }}</span>
      <span v-if="health.status !== 'healthy'" :class="['health-badge', healthBadgeClass[health.status]]"
        :title="healthTooltip">
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
import { computed, onMounted, ref, watch } from 'vue';
import {
  computeRecordingHealth,
  getTimeRangeFromClips,
} from '../composables/useEventBrowser';
import { settingsStore } from '../composables/useSettings';
import type { RecordingHealth, TeslaCamEvent } from '../types';
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


const healthBadgeClass: Record<RecordingHealth['status'], string> = {
  healthy: '',
  minor: 'health-minor',
  warning: 'health-warning',
};

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
  if (!props.event.metadata?.est_lat || !props.event.metadata?.est_lon)
    return '';
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
  if (!metadata?.est_lat || !metadata?.est_lon || !props.event.timestamp)
    return;

  const lat = parseFloat(String(metadata.est_lat));
  const lng = parseFloat(String(metadata.est_lon));
  if (isNaN(lat) || isNaN(lng)) return;

  try {
    const weather = await weatherService.getWeather(lat, lng, date.value);
    if (weather) {
      weatherText.value = `${weather.icon} ${weather.temperature}${weather.temperatureUnit} ${weather.description}`;
    }
  } catch (_err) {
    // Weather is supplementary
  }
}

onMounted(() => {
  loadWeather();


});

watch(
  () => [
    props.event.metadata?.est_lat,
    props.event.metadata?.est_lon,
    settingsStore.settings.temperatureUnits,
  ],
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
    console.warn(`No video clips available for event on ${dateFormatted}`);
  } else {
    emit('select', props.event);
  }
}
</script>

<style scoped>
@reference "tailwindcss";

/* Event Cards */
.event-item {
  @apply relative cursor-pointer overflow-hidden rounded-[10px] border border-(--border) bg-(--bg-tertiary) p-3.5 mb-2.5 transition-all duration-250;
}

/* Subtle gradient overlay */
.event-item::before {
  @apply pointer-events-none absolute top-0 left-0 right-0 h-[60%];
  content: '';
  background: linear-gradient(180deg,
      color-mix(in srgb, #fff 2%, transparent) 0%,
      transparent 100%);
}

.event-item:hover {
  @apply translate-x-1 border-(--border-accent) bg-(--bg-elevated);
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 10%, transparent);
}

.event-item.active {
  @apply border-(--accent);
  background: linear-gradient(135deg,
      var(--accent-subtle) 0%,
      var(--bg-elevated) 100%);
  box-shadow:
    0 0 25px var(--accent-glow),
    inset 0 0 30px color-mix(in srgb, var(--accent) 5%, transparent);
}

.event-item.active .event-item-location,
.event-item.active .event-item-reason,
.event-item.active .event-item-weather,
.event-item.active .event-gps {
  @apply text-(--text-secondary);
}

.event-thumbnail {
  @apply mb-2.5 block h-30 w-full rounded-md border border-(--border) bg-(--bg-void) object-cover;
}

/* Placeholder for events without thumbnails (e.g., RecentClips) */
.event-thumbnail-placeholder {
  @apply mb-2.5 flex h-30 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-(--border);
  background: linear-gradient(135deg,
      var(--bg-void) 0%,
      var(--bg-tertiary) 100%);
}

.event-thumbnail-placeholder .placeholder-icon {
  @apply text-[1.75rem] opacity-60;
}

.event-thumbnail-placeholder .placeholder-text {
  @apply text-[0.8rem] font-semibold tracking-[0.05em] text-(--text-secondary) uppercase;
}

.event-thumbnail-placeholder .placeholder-time {
  @apply text-[0.7rem] text-(--text-muted);
}

/* Preview video overlay for hover */
.preview-video {
  @apply pointer-events-none absolute top-3.5 left-1/2 z-5 h-30 w-[calc(100%-1.75rem)] -translate-x-1/2 rounded-md border border-(--accent) bg-(--bg-void) object-cover opacity-0 transition-opacity duration-200;
}

.event-item:hover .preview-video {
  @apply opacity-100;
}

/* Hide thumbnail when preview is playing */
.event-item:hover .preview-video+.event-thumbnail,
.event-item:hover .event-thumbnail:has(+ .preview-video) {
  @apply opacity-0;
}

.event-item-header {
  @apply mb-1.5 flex items-center justify-between gap-2;
}

.event-type {
  @apply inline-flex items-center rounded px-2.5 py-1 font-(family-name:--font-mono) text-[0.65rem] font-semibold tracking-[0.08em] text-white uppercase;
  /* Explicit text color — previously inherited --text-muted (#5c6370),
     * which rendered nearly invisible against the dark gradient fills. */
  text-shadow: 0 1px 2px color-mix(in srgb, #000 35%, transparent);
}

.event-type.saved {
  background: linear-gradient(135deg, var(--c-type-saved) 0%, var(--c-type-saved-dark) 100%);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c-type-saved) 30%, transparent);
}

.event-type.sentry {
  background: linear-gradient(135deg, var(--danger) 0%, var(--c-type-sentry-dark) 100%);
  box-shadow: 0 0 10px var(--danger-glow);
}

.event-type.recent {
  /* Slightly lighter gradient + brighter text — the original gray-on-gray
     * combo was the worst offender for legibility. */
  background: linear-gradient(135deg, var(--c-type-recent) 0%, var(--c-type-recent-dark) 100%);
}

/* Drive badge for multi-drive support */
.drive-badge {
  @apply mr-1.5 inline-block max-w-[60px] shrink-0 overflow-hidden rounded-[3px] px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.02em] whitespace-nowrap text-ellipsis text-white uppercase;
}

.nearmiss-indicator {
  @apply ml-1 cursor-pointer rounded-[10px] px-1.5 py-0.5 text-[0.65rem] font-semibold transition-[transform,box-shadow] duration-150;
  text-shadow: none;
}

.nearmiss-indicator:hover {
  @apply scale-110;
}

.nearmiss-indicator:active {
  @apply scale-95;
}

.nearmiss-indicator.critical {
  @apply text-white;
  background-color: color-mix(in srgb, var(--c-nearmiss-critical) 90%, transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--c-nearmiss-critical) 50%, transparent);
}

.nearmiss-indicator.critical:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-nearmiss-critical) 80%, transparent);
}

.nearmiss-indicator.warning {
  @apply text-white;
  background-color: color-mix(in srgb, var(--c-nearmiss-warning) 90%, transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--c-nearmiss-warning) 50%, transparent);
}

.nearmiss-indicator.warning:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-nearmiss-warning) 80%, transparent);
}

.nearmiss-indicator.caution {
  color: var(--c-nearmiss-text-caution);
  background-color: color-mix(in srgb, var(--c-nearmiss-caution) 90%, transparent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--c-nearmiss-caution) 40%, transparent);
}

.nearmiss-indicator.caution:hover {
  box-shadow: 0 0 12px color-mix(in srgb, var(--c-nearmiss-caution) 70%, transparent);
}

.event-item-date {
  @apply font-(family-name:--font-mono) text-[0.8rem] font-medium text-(--text-secondary);
}

.event-item-time {
  @apply mb-1 font-(family-name:--font-mono) text-[0.85rem] font-medium text-(--text-primary);
}

.event-item-location {
  @apply mb-1 text-[0.8rem] text-(--text-muted);
}

.event-gps {
  @apply mb-1 font-(family-name:--font-mono) text-[0.7rem] text-(--text-muted) opacity-80;
}

.event-item-reason {
  @apply text-[0.75rem] text-(--text-muted) italic;
}

.event-item-weather {
  @apply text-[0.75rem] text-(--text-secondary);
}

.event-item-weather:empty {
  display: none;
}

.event-item-clips {
  @apply mt-1.5 font-(family-name:--font-mono) text-[0.7rem] text-(--accent) opacity-80;
}

/* Empty events (no usable video clips) */
.event-item.event-empty {
  @apply relative opacity-50;
}

.event-item.event-empty::after {
  @apply pointer-events-none absolute inset-0 rounded-md;
  content: '';
  background: repeating-linear-gradient(-45deg,
      transparent,
      transparent 8px,
      color-mix(in srgb, var(--c-nearmiss-critical) 5%, transparent) 8px,
      color-mix(in srgb, var(--c-nearmiss-critical) 5%, transparent) 16px);
}

.event-item.event-empty:hover {
  @apply opacity-60;
}

.event-item.event-empty .event-item-clips .empty-warning {
  @apply text-(--danger) opacity-100;
}

/* Empty event toast notification */
.empty-event-toast {
  @apply fixed bottom-[100px] left-1/2 z-10000 flex items-center gap-2.5 rounded-lg border border-(--danger) bg-(--bg-elevated) px-5 py-3 text-sm opacity-0 transition-[opacity,transform] duration-300;
  transform: translateX(-50%) translateY(20px);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--c-nearmiss-critical) 30%, transparent);
}

.empty-event-toast.show {
  @apply opacity-100;
  transform: translateX(-50%) translateY(0);
}

.empty-event-toast .toast-icon {
  @apply text-xl text-(--danger);
}

.empty-event-toast .toast-message {
  @apply text-(--text-primary);
}

/* ==================== Recording Health Badge ==================== */
.health-badge {
  @apply inline-flex size-4 cursor-help items-center justify-center rounded-full text-[0.7rem] leading-none font-bold ml-0.5;
}

.health-badge.health-minor {
  @apply border text-[var(--c-health-minor)];
  border-color: color-mix(in srgb, var(--c-health-minor) 50%, transparent);
  background-color: color-mix(in srgb, var(--c-health-minor) 20%, transparent);
}

.health-badge.health-warning {
  @apply border text-[var(--c-severity-critical)];
  border-color: color-mix(in srgb, var(--c-severity-critical) 55%, transparent);
  background-color: color-mix(in srgb, var(--c-severity-critical) 20%, transparent);
}

/* ==================== Intervention Severity Badge ==================== */
.severity-badge {
  @apply inline-flex cursor-help items-center justify-center rounded-[10px] px-[7px] py-px text-[0.64rem] font-bold tracking-[0.02em] leading-[1.3] ml-[3px] uppercase;
}

.severity-badge.severity-moderate {
  @apply border text-[var(--c-severity-moderate)];
  border-color: color-mix(in srgb, var(--c-severity-moderate) 55%, transparent);
  background-color: color-mix(in srgb, var(--c-severity-moderate) 18%, transparent);
}

.severity-badge.severity-severe {
  @apply border text-[var(--c-severity-severe)];
  border-color: color-mix(in srgb, var(--c-severity-severe) 60%, transparent);
  background-color: color-mix(in srgb, var(--c-severity-severe) 22%, transparent);
}

.severity-badge.severity-critical {
  @apply border text-[var(--c-severity-critical)];
  border-color: color-mix(in srgb, var(--c-severity-critical) 70%, transparent);
  background-color: color-mix(in srgb, var(--c-severity-critical) 25%, transparent);
  animation: pulse-critical 1.6s ease-in-out infinite;
}

@keyframes pulse-critical {

  0%,
  100% {
    box-shadow: 0 0 3px color-mix(in srgb, var(--c-severity-critical) 50%, transparent);
  }

  50% {
    box-shadow: 0 0 10px color-mix(in srgb, var(--c-severity-critical) 90%, transparent);
  }
}

.severity-badge.clickable {
  @apply cursor-pointer;
}

.severity-badge.clickable:hover {
  @apply brightness-120;
}

/* ==================== Launch / Full-Throttle Badge ==================== */
/* Only rendered when an event has at least one detected launch. Pill
   shape matches the severity badge for visual rhythm; checker-flag
   emoji + green ink reads as "performance highlight" without
   competing with the warning palette used by severity/health. */
.launch-badge {
  @apply inline-flex items-center justify-center gap-0.5 rounded-[10px] border px-[7px] py-px text-[0.64rem] font-bold tracking-[0.02em] leading-[1.4] text-[var(--c-launch)];
  border-color: color-mix(in srgb, var(--c-launch) 45%, transparent);
  background-color: color-mix(in srgb, var(--c-launch) 16%, transparent);
}

/* Popover listing each detected severity moment */
.severity-popover {
  @apply fixed z-10000 min-w-[220px] max-w-[320px] rounded-md border border-[var(--c-palette-border)] bg-[var(--c-palette-surface)] p-1 text-xs text-[var(--c-palette-kbd-bg)];
  box-shadow: 0 6px 24px var(--c-overlay-black-60);
}

.severity-popover-row {
  @apply grid cursor-pointer grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded px-2 py-1.5;
}

.severity-popover-row:hover {
  @apply bg-[var(--c-palette-border)];
}

.severity-popover-row .sev-tier {
  @apply rounded-lg px-1.5 py-px text-[0.65rem] font-bold uppercase;
}

.severity-popover-row.sev-moderate .sev-tier {
  @apply border text-[var(--c-severity-moderate)];
  border-color: color-mix(in srgb, var(--c-severity-moderate) 40%, transparent);
  background-color: color-mix(in srgb, var(--c-severity-moderate) 15%, transparent);
}

.severity-popover-row.sev-severe .sev-tier {
  @apply border text-[var(--c-severity-severe)];
  border-color: color-mix(in srgb, var(--c-severity-severe) 50%, transparent);
  background-color: color-mix(in srgb, var(--c-severity-severe) 20%, transparent);
}

.severity-popover-row.sev-critical .sev-tier {
  @apply border text-[var(--c-severity-critical)];
  border-color: color-mix(in srgb, var(--c-severity-critical) 60%, transparent);
  background-color: color-mix(in srgb, var(--c-severity-critical) 22%, transparent);
}

.severity-popover-row .sev-kind {
  @apply text-[var(--c-palette-kbd-bg)];
}

.severity-popover-row .sev-g {
  @apply text-[var(--c-type-recent)] tabular-nums;
}

.severity-popover-row .sev-time {
  @apply text-[var(--c-palette-accent)] tabular-nums;
}
</style>
