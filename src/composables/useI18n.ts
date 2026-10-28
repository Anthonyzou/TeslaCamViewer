/**
 * Internationalization (i18n) Module
 * Provides translation support for TeslaCamViewer
 * Config: 9 locales, 300+ strings
 */
import { computed, ref, type Ref } from 'vue';

export type TranslationParams = Record<string, string | number>;

class I18n {
  public locale: string = 'en';
  public fallbackLocale: string = 'en';
  public messages: Record<string, Record<string, unknown>> = {};
  public loadedLocales: Set<string> = new Set();

  public supportedLocales: Record<string, string> = {
    en: 'English',
    es: 'Español',
    de: 'Deutsch',
    fr: 'Français',
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    nl: 'Nederlands',
    no: 'Norsk',
  };

  /**
   * Initialize i18n system
   * @param preferredLocale - Optional preferred locale
   */
  async init(preferredLocale: string | null = null): Promise<this> {
    // Priority: saved preference > browser language > fallback
    const savedLocale = localStorage.getItem('tcv_locale');
    const browserLocale = this.detectBrowserLocale();

    this.locale =
      preferredLocale || savedLocale || browserLocale || this.fallbackLocale;
    syncLocale();

    const localesToLoad = [...new Set([this.fallbackLocale, this.locale])];
    await Promise.all(localesToLoad.map((locale) => this.loadLocale(locale)));

    console.log(`i18n initialized: ${this.locale}`);
    return this;
  }

  /**
   * Detect browser's preferred language
   * @returns Locale code
   */
  detectBrowserLocale(): string {
    const browserLang = navigator.language || 'en';
    const shortLang = browserLang.split('-')[0].toLowerCase();

    // Check if we support this language
    if (this.supportedLocales[shortLang]) {
      return shortLang;
    }

    return this.fallbackLocale;
  }

  /**
   * Load a locale file
   * @param locale - Locale code (e.g., 'en', 'es')
   */
  async loadLocale(locale: string): Promise<void> {
    if (this.loadedLocales.has(locale)) {
      return;
    }

    try {
      const response = await fetch(`locales/${locale}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load locale: ${locale}`);
      }

      const messages = await response.json();
      this.messages[locale] = messages;
      this.loadedLocales.add(locale);
      syncLocale();
    } catch (error) {
      console.warn(
        `Could not load locale '${locale}':`,
        error instanceof Error ? error.message : error
      );

      // If not fallback, silently continue with fallback
      if (locale !== this.fallbackLocale) {
        this.locale = this.fallbackLocale;
        syncLocale();
      }
    }
  }

  /**
   * Set the current locale
   * @param locale - Locale code
   * @param save - Save to localStorage
   */
  async setLocale(locale: string, save = true): Promise<void> {
    if (!this.supportedLocales[locale]) {
      console.warn(`Unsupported locale: ${locale}`);
      return;
    }

    await this.loadLocale(locale);
    this.locale = locale;
    syncLocale();

    if (save) {
      localStorage.setItem('tcv_locale', locale);
    }

    // Dispatch event for components to update
    if (
      typeof window !== 'undefined' &&
      typeof window.dispatchEvent === 'function'
    ) {
      window.dispatchEvent(
        new CustomEvent('localeChanged', { detail: { locale } })
      );
    }
  }

  /**
   * Get translation for a key
   * @param key - Dot-notation key (e.g., 'buttons.play')
   * @param params - Parameters to interpolate
   * @returns Translated string
   */
  t(key: string, params: TranslationParams = {}): string {
    let text = this.getMessage(key, this.locale);

    // Fallback to default locale if not found
    if (text === key && this.locale !== this.fallbackLocale) {
      text = this.getMessage(key, this.fallbackLocale);
    }

    // Interpolate parameters: {{param}}
    if (params && typeof text === 'string') {
      Object.keys(params).forEach((param) => {
        const regex = new RegExp(`{{${param}}}`, 'g');
        text = text.replace(regex, String(params[param]));
      });
    }

    return text;
  }

  /**
   * Get message from locale messages using dot notation
   * @param key - Dot-notation key
   * @param locale - Locale to use
   * @returns Message or key if not found
   */
  getMessage(key: string, locale: string): string {
    const messages = this.messages[locale];
    if (!messages) return key;

    let result: unknown = messages;

    for (const part of key.split('.')) {
      if (result && typeof result === 'object' && part in result) {
        result = (result as Record<string, unknown>)[part];
      } else {
        return key; // Key not found, return as-is
      }
    }

    return typeof result === 'string' ? result : key;
  }

  /**
   * Get list of supported locales
   * @returns Locale code to name mapping
   */
  getSupportedLocales(): Record<string, string> {
    return { ...this.supportedLocales };
  }

  /**
   * Get current locale
   * @returns Current locale code
   */
  getLocale(): string {
    return this.locale;
  }

  /**
   * Check if a locale is supported
   * @param locale - Locale code
   * @returns Whether the locale is supported
   */
  isSupported(locale: string): boolean {
    return locale in this.supportedLocales;
  }
}

// Create global instance
const i18n = new I18n();

// Reactive locale tracker singleton, shared by every useI18n() consumer
const currentLocale: Ref<string> = ref(i18n.locale);
const localeTick: Ref<number> = ref(0);

function syncLocale(): void {
  currentLocale.value = i18n.locale;
  localeTick.value++;
}

// Expose to window for global access
if (typeof window !== 'undefined') {
  window.i18n = i18n;
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
  } else {
    // DOM already loaded, init immediately
    i18n.init();
  }
}

/**
 * useI18n - Reactive composable for internationalization
 */
export function useI18n() {
  function t(key: string, params?: TranslationParams): string {
    // Read reactive refs so Vue templates automatically re-render when locale changes
    void localeTick.value;
    void currentLocale.value;

    return i18n.t(key, params);
  }

  async function setLocale(locale: string, save = true): Promise<void> {
    await i18n.setLocale(locale, save);
  }

  const supportedLocales = computed<Record<string, string>>(
    () => i18n.supportedLocales
  );

  return {
    t,
    currentLocale,
    setLocale,
    supportedLocales,
  };
}

export { I18n, i18n };
export default useI18n;
