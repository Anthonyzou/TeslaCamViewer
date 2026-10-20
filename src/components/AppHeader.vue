<template>
  <header class="app-header">
    <button
      id="menuToggleBtn"
      class="menu-toggle-btn"
      aria-label="Toggle sidebar menu"
      @click="emit('toggleSidebar')"
    >
      <Menu :size="24" />
    </button>
    <div class="header-brand">
      <svg class="brand-icon" width="36" height="36" viewBox="0 0 64 64">
        <defs>
          <linearGradient
            id="brandGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" style="stop-color: #00d4ff" />
            <stop offset="100%" style="stop-color: #0099cc" />
          </linearGradient>
        </defs>
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="url(#brandGradient)"
          opacity="0.15"
        />
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="url(#brandGradient)"
          stroke-width="2"
        />
        <rect x="18" y="24" width="28" height="20" rx="3" fill="#e8eaed" />
        <circle cx="32" cy="34" r="7" fill="#0a0c12" />
        <circle cx="32" cy="34" r="4" fill="#161a24" />
        <circle cx="30" cy="32" r="1.5" fill="#00d4ff" opacity="0.8" />
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
        <span data-i18n="header.github">{{ t('header.github') }}</span>
      </a> -->
      <button
        id="statsBtn"
        class="header-btn"
        data-i18n-title="header.statistics"
        :title="t('header.statistics')"
        @click="emit('openStats')"
      >
        <BarChart3 :size="20" />
      </button>
      <button
        id="helpBtn"
        class="header-btn"
        data-i18n-title="header.keyboardShortcuts"
        :title="t('header.keyboardShortcuts')"
        @click="emit('openHelp')"
      >
        <HelpCircle :size="20" />
      </button>
      <button
        id="settingsBtn"
        class="header-btn"
        data-i18n-title="header.settings"
        :title="t('header.settings')"
        @click="emit('openSettings')"
      >
        <Settings :size="20" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { BarChart3, HelpCircle, Menu, Settings } from 'lucide-vue-next';
import { useI18n } from '../composables/useI18n';

const emit = defineEmits<{
  (e: 'toggleSidebar'): void;
  (e: 'openStats'): void;
  (e: 'openHelp'): void;
  (e: 'openSettings'): void;
}>();

const { t } = useI18n();
</script>

<style scoped>
/* ==================== HEADER ==================== */
.app-header {
  background: linear-gradient(
    180deg,
    var(--bg-secondary) 0%,
    var(--bg-primary) 100%
  );
  padding: 0.875rem 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 100;
}

/* Subtle glow line under header */
.app-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--accent) 20%,
    var(--accent) 80%,
    transparent 100%
  );
  opacity: 0.3;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
}

.brand-icon {
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px var(--accent-glow));
  transition: filter 0.3s ease;
}

.brand-icon:hover {
  filter: drop-shadow(0 0 12px var(--accent));
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.app-header h1 {
  font-family: var(--font-ui);
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0;
  line-height: 1;
  letter-spacing: -0.02em;
  background: linear-gradient(
    135deg,
    var(--text-primary) 0%,
    var(--accent) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 1;
  min-width: 0;
  /* Allow shrinking below content size */
}

.header-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-btn:hover {
  color: var(--accent);
  background-color: var(--bg-elevated);
  border-color: var(--border-accent);
  box-shadow: 0 0 15px var(--accent-glow);
}

.header-btn svg {
  width: 20px;
  height: 20px;
}

/* Session button - free tier (red) */
.session-btn {
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #ff4d6d 0%, #c9184a 100%);
  color: white !important;
  border: 1px solid rgba(255, 77, 109, 0.3) !important;
  border-radius: 20px;
  font-family: var(--font-ui);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  transition: all 0.25s ease;
  cursor: pointer;
}

.session-btn:hover {
  background: linear-gradient(135deg, #ff6b88 0%, #e01b5e 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(201, 24, 74, 0.4);
  color: white !important;
}

.session-btn svg {
  width: 16px;
  height: 16px;
}

.primary-btn {
  background: linear-gradient(135deg, var(--accent) 0%, #0099cc 100%);
  color: var(--bg-void);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 0 20px var(--accent-glow);
}

.primary-btn:hover {
  background: linear-gradient(
    135deg,
    var(--accent-hover) 0%,
    var(--accent) 100%
  );
  transform: translateY(-2px);
  box-shadow: 0 4px 30px var(--accent-glow);
}

.primary-btn:active {
  transform: translateY(0);
}

/* Menu Toggle Button (mobile only) */
.menu-toggle-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.menu-toggle-btn:hover {
  background: var(--bg-tertiary);
  color: var(--accent);
}
</style>
