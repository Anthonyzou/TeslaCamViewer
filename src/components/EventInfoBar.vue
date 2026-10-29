<template>
  <div id="eventInfo" class="event-info">
    <div class="event-info-content">
      <span id="eventDate" class="event-date"
        >{{ hasEvent ? '' : t('player.noEventLoaded') }}</span
      >
      <span id="eventLocation" class="event-location"></span>
      <span id="eventReason" class="event-reason"></span>
      <span id="eventWeather" class="event-weather"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../composables/useI18n';
import { useEvents } from '../composables/useEvents';

const { t } = useI18n();
const { hasEvent } = useEvents();
</script>

<style scoped>
@reference "tailwindcss";

/* ==================== EVENT INFO BAR ==================== */
.event-info {
  @apply flex items-center justify-between border-t border-(--border) bg-(--bg-secondary) px-4 py-1;
}

.event-info-content {
  @apply flex flex-1 items-center gap-6;
}

.event-date {
  @apply text-[0.85rem] font-semibold text-(--accent);
  font-family: var(--font-mono);
}

.event-location {
  @apply text-[0.85rem] text-(--text-secondary);
}

.event-reason {
  @apply text-[0.8rem] text-(--text-muted) italic;
}

.event-weather {
  @apply text-[0.8rem] text-(--text-secondary);
}

.event-weather:empty {
  display: none;
}

.event-insights {
  @apply text-[0.8rem] text-(--text-secondary) opacity-85;
}

.event-insights:empty {
  display: none;
}

/* Scrub-preview thumbnail that appears on timeline hover. Appended to <body>
 * with position:fixed so no ancestor overflow:hidden can clip it. Positioned
 * entirely via translate3d so mouse-move updates stay on the compositor. */
.timeline-thumb-tooltip {
  @apply pointer-events-none invisible fixed top-0 left-0 z-10000 w-60 rounded-md border border-(--border) bg-black/85 p-1 opacity-0 transition-opacity duration-100 ease-in-out will-change-transform;
}

.timeline-thumb-img {
  @apply block h-[174px] w-[232px] rounded-[3px] bg-black object-cover;
}

.timeline-thumb-time {
  @apply py-1 pt-1 pb-0.5 text-center text-[0.75rem] text-white;
  font-family: monospace;
  text-shadow: 0 1px 2px var(--c-overlay-black-80);
}

/* Drive refresh spinner */
.drive-action-btn.spinning svg {
  animation: tcv-spin 0.8s linear infinite;
}

@keyframes tcv-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
