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
      v-if="event.thumbnailUrl"
      loading="lazy"
      :src="event.thumbnailUrl"
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
  const lat = parseFloat(props.event.metadata.est_lat);
  const lon = parseFloat(props.event.metadata.est_lon);
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

  const lat = parseFloat(metadata.est_lat);
  const lng = parseFloat(metadata.est_lon);
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
