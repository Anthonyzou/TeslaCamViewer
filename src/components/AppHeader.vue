<template>
  <header class="app-header">
    <button id="menuToggleBtn" class="menu-toggle-btn" aria-label="Toggle sidebar menu" @click="emit('toggleSidebar')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
      </svg>
    </button>
    <div class="header-brand">
      <svg class="brand-icon" width="36" height="36" viewBox="0 0 64 64">
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#00d4ff" />
            <stop offset="100%" style="stop-color:#0099cc" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#brandGradient)" opacity="0.15" />
        <circle cx="32" cy="32" r="30" fill="none" stroke="url(#brandGradient)" stroke-width="2" />
        <rect x="18" y="24" width="28" height="20" rx="3" fill="#e8eaed" />
        <circle cx="32" cy="34" r="7" fill="#0a0c12" />
        <circle cx="32" cy="34" r="4" fill="#161a24" />
        <circle cx="30" cy="32" r="1.5" fill="#00d4ff" opacity="0.8" />
        <circle cx="44" cy="27" r="2" fill="#ff3b3b" />
        <rect x="30" y="20" width="4" height="4" rx="1" fill="#161a24" />
      </svg>
      <div class="brand-text">
        <h1>TeslaCamViewer.com</h1>
        <span class="brand-tagline"></span>
      </div>
    </div>
    <div class="header-actions">
      <a
        href="https://github.com/NateMccomb/TeslaCamViewer"
        target="_blank"
        rel="noopener noreferrer"
        class="header-btn github-btn"
        title="View on GitHub"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg>
        <span data-i18n="header.github">{{ t('header.github') }}</span>
      </a>
      <button
        id="statsBtn"
        class="header-btn"
        data-i18n-title="header.statistics"
        :title="t('header.statistics')"
        @click="emit('openStats')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
        </svg>
      </button>
      <button
        id="helpBtn"
        class="header-btn"
        data-i18n-title="header.keyboardShortcuts"
        :title="t('header.keyboardShortcuts')"
        @click="emit('openHelp')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"
          />
        </svg>
      </button>
      <button
        id="settingsBtn"
        class="header-btn"
        data-i18n-title="header.settings"
        :title="t('header.settings')"
        @click="emit('openSettings')"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (e: 'toggleSidebar'): void;
  (e: 'openStats'): void;
  (e: 'openHelp'): void;
  (e: 'openSettings'): void;
}>();

const localeTick = ref(0);

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

function onLocaleChanged(): void {
  localeTick.value++;
}

onMounted(() => {
  window.addEventListener('localeChanged', onLocaleChanged);
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
});
</script>
