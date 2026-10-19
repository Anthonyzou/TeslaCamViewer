<template>
  <div id="eventInfo" class="event-info">
    <div class="event-info-content">
      <span id="eventDate" class="event-date" data-i18n="player.noEventLoaded"
        >No event loaded</span
      >
      <span id="eventLocation" class="event-location"></span>
      <span id="eventReason" class="event-reason"></span>
      <span id="eventWeather" class="event-weather"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
// EventInfoBar provides the persistent DOM container populated by TeslaCamViewerApp.updateEventInfo
</script>

<style scoped>
/* ==================== EVENT INFO BAR ==================== */
.event-info {
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    padding: 0.25rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.event-info-content {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    flex: 1;
}

.event-date {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--accent);
}

.event-location {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.event-reason {
    color: var(--text-muted);
    font-size: 0.8rem;
    font-style: italic;
}

.event-weather {
    color: var(--text-secondary);
    font-size: 0.8rem;
}

.event-weather:empty {
    display: none;
}

.event-insights {
    color: var(--text-secondary);
    font-size: 0.8rem;
    opacity: 0.85;
}

.event-insights:empty {
    display: none;
}

/* Scrub-preview thumbnail that appears on timeline hover. Appended to <body>
 * with position:fixed so no ancestor overflow:hidden can clip it. Positioned
 * entirely via translate3d so mouse-move updates stay on the compositor. */
.timeline-thumb-tooltip {
    position: fixed;
    top: 0;
    left: 0;
    width: 240px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid var(--border);
    border-radius: 6px;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.1s ease;
    z-index: 10000;
    will-change: transform;
}

.timeline-thumb-img {
    display: block;
    width: 232px;
    height: 174px;
    object-fit: cover;
    border-radius: 3px;
    background: #000;
}

.timeline-thumb-time {
    color: #fff;
    font-size: 0.75rem;
    font-family: monospace;
    text-align: center;
    padding: 4px 0 2px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
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
