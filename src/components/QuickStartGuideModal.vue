<template>
  <div v-if="isOpen" class="quickstart-modal visible" @keydown.esc="close">
    <div
      class="quickstart-overlay"
      @mousedown="onOverlayMouseDown"
      @click="onOverlayClick"
    ></div>
    <div class="quickstart-panel">
      <button
        class="quickstart-skip"
        :title="t('quickstart.skip')"
        @click="close"
      >
        {{ t('quickstart.skip') }}
      </button>

      <div class="quickstart-icon">{{ currentStepData.icon }}</div>
      <h2 class="quickstart-title">{{ currentStepData.title }}</h2>

      <!-- Step Content -->
      <div class="quickstart-content">
        <!-- Step 0: Welcome -->
        <template v-if="currentStep === 0">
          <p>{{ t('quickstart.welcome.description') }}</p>
          <p style="color: var(--accent); margin-top: 1rem">
            <strong>{{ t('quickstart.welcome.noUpload') }}</strong> -
            {{ t('quickstart.welcome.videosStay') }}
          </p>
          <div
            class="quickstart-language-selector"
            style="
              margin-top: 1.5rem;
              padding-top: 1rem;
              border-top: 1px solid var(--border);
            "
          >
            <label
              for="quickstartLanguage"
              style="
                color: var(--text-secondary);
                font-size: 0.9rem;
                margin-right: 0.5rem;
              "
            >
              {{ t('quickstart.welcome.language') }}:
            </label>
            <select
              id="quickstartLanguage"
              class="quickstart-language-select"
              v-model="currentLocale"
              @change="onLanguageChange"
              style="
                background: var(--bg-tertiary);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: 6px;
                padding: 0.4rem 0.6rem;
                font-size: 0.9rem;
                cursor: pointer;
              "
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="nl">Nederlands</option>
              <option value="no">Norsk</option>
            </select>
          </div>
        </template>

        <!-- Step 1: Open Folder -->
        <template v-else-if="currentStep === 1">
          <p>{{ t('quickstart.step1.description') }}</p>
          <p style="margin-top: 0.5rem; color: var(--text-secondary)">
            {{ t('quickstart.step1.hint') }}
          </p>
        </template>

        <!-- Step 2: Event Types -->
        <template v-else-if="currentStep === 2">
          <p>{{ t('quickstart.step2.description') }}</p>
          <ul
            style="margin-top: 0.5rem; text-align: left; padding-left: 1.5rem"
          >
            <li>
              <strong>SavedClips</strong> - {{ t('quickstart.step2.saved') }}
            </li>
            <li>
              <strong>SentryClips</strong> - {{ t('quickstart.step2.sentry') }}
            </li>
            <li>
              <strong>RecentClips</strong> - {{ t('quickstart.step2.recent') }}
            </li>
          </ul>
        </template>

        <!-- Step 3: Multi-cam playback -->
        <template v-else-if="currentStep === 3">
          <p>{{ t('quickstart.step3.description') }}</p>
          <p style="margin-top: 0.5rem; color: var(--text-secondary)">
            <strong>{{ t('quickstart.step3.tip') }}:</strong>
            {{ t('quickstart.step3.tipText') }}
          </p>
        </template>

        <!-- Step 4: Shortcuts -->
        <template v-else-if="currentStep === 4">
          <div
            style="
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 0.5rem 1rem;
              text-align: left;
              max-width: 280px;
              margin: 0 auto;
            "
          >
            <kbd>Space</kbd
            ><span>{{ t('quickstart.shortcuts.playPause') }}</span>
            <kbd>← / →</kbd><span>{{ t('quickstart.shortcuts.seek') }}</span>
            <kbd>S</kbd><span>{{ t('quickstart.shortcuts.screenshot') }}</span>
            <kbd>I / O</kbd
            ><span>{{ t('quickstart.shortcuts.markInOut') }}</span> <kbd>E</kbd
            ><span>{{ t('quickstart.shortcuts.export') }}</span> <kbd>?</kbd
            ><span>{{ t('quickstart.shortcuts.showAll') }}</span>
          </div>
        </template>
      </div>

      <!-- Dots Progress -->
      <div class="quickstart-progress">
        <div
          v-for="(_, i) in totalSteps"
          :key="i"
          class="quickstart-dot"
          :class="{ active: i === currentStep }"
          @click="currentStep = i"
        ></div>
      </div>

      <!-- Buttons -->
      <div class="quickstart-buttons">
        <button
          class="quickstart-btn secondary"
          id="quickstartPrev"
          :style="{ visibility: currentStep === 0 ? 'hidden' : 'visible' }"
          @click="prevStep"
        >
          {{ t('quickstart.previous') }}
        </button>
        <button
          class="quickstart-btn primary"
          id="quickstartNext"
          @click="nextStep"
        >
          {{
            currentStep === totalSteps - 1
              ? t('quickstart.getStarted')
              : t('quickstart.next')
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useModals } from '../composables/useModals';

const STORAGE_KEY = 'teslacamviewer_quickstart_shown';
const totalSteps = 5;

const { isQuickStartGuideOpen: isOpen, quickStartGuideModal } = useModals();
const currentStep = ref(0);
const localeTick = ref(0);
const currentLocale = ref(window.i18n ? window.i18n.getLocale() : 'en');
let mouseDownOnOverlay = false;

function t(key: string): string {
  void localeTick.value;
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

const stepMeta = [
  { icon: '🚗', titleKey: 'quickstart.welcome.title' },
  { icon: '📁', titleKey: 'quickstart.step1.title' },
  { icon: '📋', titleKey: 'quickstart.step2.title' },
  { icon: '📹', titleKey: 'quickstart.step3.title' },
  { icon: '⌨️', titleKey: 'quickstart.shortcuts.title' },
];

const currentStepData = computed(() => {
  const meta = stepMeta[currentStep.value] || stepMeta[0];
  return {
    icon: meta.icon,
    title: t(meta.titleKey),
  };
});

function open(): void {
  currentStep.value = 0;
  quickStartGuideModal.open();
}

function close(): void {
  quickStartGuideModal.close();
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {}
}

function prevStep(): void {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function nextStep(): void {
  if (currentStep.value < totalSteps - 1) {
    currentStep.value++;
  } else {
    close();
  }
}

function onOverlayMouseDown(e: MouseEvent): void {
  mouseDownOnOverlay = (e.target as HTMLElement).classList.contains(
    'quickstart-overlay'
  );
}

function onOverlayClick(e: MouseEvent): void {
  if (
    mouseDownOnOverlay &&
    (e.target as HTMLElement).classList.contains('quickstart-overlay')
  ) {
    close();
  }
}

function onLanguageChange(e: Event): void {
  const newLocale = (e.target as HTMLSelectElement).value;
  if (window.i18n) {
    window.i18n.setLocale(newLocale);
  }
}

function onLocaleChanged(): void {
  localeTick.value++;
  if (window.i18n) {
    currentLocale.value = window.i18n.getLocale();
  }
}

function showIfFirstRun(): void {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      open();
    }
  } catch {}
}

onMounted(() => {
  window.addEventListener('localeChanged', onLocaleChanged);
});

onUnmounted(() => {
  window.removeEventListener('localeChanged', onLocaleChanged);
});

defineExpose({
  open,
  close,
  showIfFirstRun,
  isOpen,
});
</script>
