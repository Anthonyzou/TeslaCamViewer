import { computed, ref, type Ref } from 'vue';
import { i18n } from '../utils/i18n';

// Reactive locale tracker singleton
const currentLocale: Ref<string> = ref(i18n?.locale || 'en');
const localeTick: Ref<number> = ref(0);

// Global event listener for locale changes, registered once for the entire app
if (typeof window !== 'undefined') {
  window.addEventListener('localeChanged', (event: any) => {
    const newLocale = event.detail?.locale || i18n?.locale || 'en';
    currentLocale.value = newLocale;
    localeTick.value++;
  });
}

/**
 * useI18n - Reactive composable for internationalization
 */
export function useI18n() {
  function t(key: string, params?: Record<string, any>): string {
    // Read reactive refs so Vue templates automatically re-render when locale changes
    void localeTick.value;
    void currentLocale.value;

    if (typeof window !== 'undefined' && window.i18n) {
      return window.i18n.t(key, params);
    }
    return i18n ? i18n.t(key, params) : key.split('.').pop() || '';
  }

  async function setLocale(locale: string, save = true): Promise<void> {
    if (typeof window !== 'undefined' && window.i18n) {
      await window.i18n.setLocale(locale, save);
    } else if (i18n) {
      await i18n.setLocale(locale, save);
    }
    currentLocale.value = locale;
    localeTick.value++;
  }

  const supportedLocales = computed(() => {
    return (
      (typeof window !== 'undefined' && window.i18n?.supportedLocales) ||
      i18n?.supportedLocales ||
      {}
    );
  });

  return {
    t,
    currentLocale,
    setLocale,
    supportedLocales,
  };
}

export default useI18n;
