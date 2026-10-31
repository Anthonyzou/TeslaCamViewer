<template>
  <header class="app-header">
    <button id="menuToggleBtn" class="menu-toggle-btn" aria-label="Toggle sidebar menu" @click="emit('toggleSidebar')">
      <Menu :size="24" />
    </button>
    <div class="header-brand">
      <svg class="brand-icon" width="36" height="36" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" class="brand-gradient-start" />
            <stop offset="100%" class="brand-gradient-end" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#brandGradient)" opacity="0.15" />
        <circle cx="32" cy="32" r="30" fill="none" stroke="url(#brandGradient)" stroke-width="2" />
        <rect x="18" y="24" width="28" height="20" rx="3" fill="#e8eaed" />
        <circle cx="32" cy="34" r="7" fill="#0a0c12" />
        <circle cx="32" cy="34" r="4" fill="#161a24" />
        <circle cx="30" cy="32" r="1.5" class="brand-dot" opacity="0.8" />
        <circle cx="44" cy="27" r="2" fill="#ff3b3b" />
        <rect x="30" y="20" width="4" height="4" rx="1" fill="#161a24" />
      </svg>
      <!-- <div class="brand-text">
        <h1>TeslaCamViewer.com</h1>
      </div> -->
    </div>
    <div class="header-actions">
      <!-- <a
        href="https://github.com/NateMccomb/TeslaCamViewer"
        target="_blank"
        rel="noopener noreferrer"
        class="header-btn github-btn"
        title="View on GitHub"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg>
        <span>{{ t('header.github') }}</span>
      </a> -->
      <div class="traffic-rates" :title="trafficTooltip">
        <span class="traffic-rate traffic-rate-down">
          <ArrowDown :size="12" />{{ formatRate(downloadRate) }}
        </span>
        <span class="traffic-rate traffic-rate-up">
          <ArrowUp :size="12" />{{ formatRate(uploadRate) }}
        </span>
      </div>
      <button id="statsBtn" class="header-btn" :title="t('header.statistics')" @click="emit('openStats')">
        <BarChart3 :size="20" />
      </button>
      <button id="helpBtn" class="header-btn" :title="t('header.keyboardShortcuts')" @click="emit('openHelp')">
        <HelpCircle :size="20" />
      </button>
      <button id="settingsBtn" class="header-btn" :title="t('header.settings')" @click="emit('openSettings')">
        <Settings :size="20" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp, BarChart3, HelpCircle, Menu, Settings } from '@lucide/vue';
import { computed, onMounted } from 'vue';
import { useI18n } from '../composables/useI18n';
import { useNetworkTraffic } from '../composables/useNetworkTraffic';
import { formatBytes, formatRate } from '../utils/networkTraffic';

const emit = defineEmits<{
  (e: 'toggleSidebar'): void;
  (e: 'openStats'): void;
  (e: 'openHelp'): void;
  (e: 'openSettings'): void;
}>();

const { t } = useI18n();

const { snapshot, uploadRate, downloadRate, error, start } = useNetworkTraffic();

const trafficTooltip = computed<string>(() => {
  if (error.value) return t('statistics.trafficUnavailable');
  return [
    `${t('statistics.totalDownloaded')}: ${formatBytes(snapshot.value?.downloadBytes ?? 0)}`,
    `${t('statistics.totalUploaded')}: ${formatBytes(snapshot.value?.uploadBytes ?? 0)}`,
  ].join('\n');
});

onMounted(start);
</script>

<style scoped>
@reference "tailwindcss";

/* ==================== HEADER ==================== */
.app-header {
  @apply relative z-100 flex items-center justify-between px-6 py-3.5 border-b border-(--border);
  background: linear-gradient(180deg,
      var(--bg-secondary) 0%,
      var(--bg-primary) 100%);
}

/* Subtle glow line under header */
.app-header::after {
  @apply absolute bottom-0 left-0 right-0 h-px opacity-30;
  content: '';
  background: linear-gradient(90deg,
      transparent 0%,
      var(--accent) 20%,
      var(--accent) 80%,
      transparent 100%);
}

.header-brand {
  @apply flex min-w-0 shrink items-center gap-4 overflow-hidden;
}

.brand-icon {
  @apply shrink-0 transition-[filter] duration-300 ease-in-out;
  filter: drop-shadow(0 0 8px var(--accent-glow));
}

.brand-icon:hover {
  filter: drop-shadow(0 0 12px var(--accent));
}

.brand-text {
  @apply flex flex-col gap-[0.15rem];
}

.app-header h1 {
  @apply m-0 font-(family-name:--font-ui) text-[1.35rem] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap overflow-hidden text-ellipsis;
  background: linear-gradient(135deg,
      var(--text-primary) 0%,
      var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  @apply flex min-w-0 shrink items-center gap-2;
  /* Allow shrinking below content size */
}

.traffic-rates {
  @apply flex flex-col items-end font-mono text-[0.65rem] leading-tight whitespace-nowrap text-(--text-muted);
}

.traffic-rate {
  @apply flex items-center gap-0.5;
}

.traffic-rate-down {
  color: var(--accent);
}

.traffic-rate-up {
  color: var(--text-secondary);
}

.header-btn {
  @apply flex cursor-pointer items-center justify-center rounded-lg border border-(--border) bg-(--bg-tertiary) p-2 text-(--text-secondary) transition-all duration-200;
}

.header-btn:hover {
  @apply border-(--border-accent) bg-(--bg-elevated) text-(--accent);
  box-shadow: 0 0 15px var(--accent-glow);
}

.header-btn svg {
  @apply size-5;
}

/* Session button - free tier (red) */
.session-btn {
  @apply flex cursor-pointer items-center gap-1.5 rounded-[20px] px-4 py-2 font-(family-name:--font-ui) text-[0.8rem] font-medium tracking-[0.02em] transition-all duration-250 ease-in-out;
  background: linear-gradient(135deg, var(--c-session-start) 0%, var(--c-session-end) 100%);
  color: white !important;
  border: 1px solid color-mix(in srgb, var(--c-session-start) 30%, transparent) !important;
}

.session-btn:hover {
  background: linear-gradient(135deg, var(--c-session-hover-start) 0%, var(--c-session-hover-end) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--c-session-end) 40%, transparent);
  color: white !important;
}

.session-btn svg {
  @apply size-4;
}

.primary-btn {
  @apply flex cursor-pointer items-center gap-2 rounded-lg border-none px-6 py-3 font-(family-name:--font-ui) text-[0.9rem] font-semibold tracking-[0.02em] text-(--bg-void) transition-all duration-250 ease-in-out;
  background: linear-gradient(135deg, var(--accent) 0%, var(--c-brand-end) 100%);
  box-shadow: 0 0 20px var(--accent-glow);
}

.primary-btn:hover {
  background: linear-gradient(135deg,
      var(--accent-hover) 0%,
      var(--accent) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 30px var(--accent-glow);
}

.primary-btn:active {
  transform: translateY(0);
}

/* Menu Toggle Button (mobile only) */
.menu-toggle-btn {
  @apply hidden cursor-pointer rounded-md border-none bg-transparent p-2 text-(--text-primary) transition-all duration-200;
}

.menu-toggle-btn:hover {
  @apply bg-(--bg-tertiary) text-(--accent);
}

.brand-gradient-start {
  stop-color: var(--accent);
}

.brand-gradient-end {
  stop-color: var(--c-brand-end);
}

.brand-dot {
  fill: var(--accent);
}
</style>
