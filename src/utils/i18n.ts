/**
 * Internationalization (i18n) Module
 * Provides translation support for TeslaCamViewer
 * Config: 9 locales, 300+ strings
 */

class I18n {
  public locale: string = 'en';
  public fallbackLocale: string = 'en';
  public messages: Record<string, any> = {};
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
   * @param {string} preferredLocale - Optional preferred locale
   */
  async init(preferredLocale = null) {
    // Priority: saved preference > browser language > fallback
    const savedLocale = localStorage.getItem('tcv_locale');
    const browserLocale = this.detectBrowserLocale();

    this.locale =
      preferredLocale || savedLocale || browserLocale || this.fallbackLocale;

    // Always load fallback first
    await this.loadLocale(this.fallbackLocale);

    // Load preferred locale if different
    if (this.locale !== this.fallbackLocale) {
      await this.loadLocale(this.locale);
    }

    console.log(`i18n initialized: ${this.locale}`);
    return this;
  }

  /**
   * Detect browser's preferred language
   * @returns {string} Locale code
   */
  detectBrowserLocale() {
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
   * @param {string} locale - Locale code (e.g., 'en', 'es')
   */
  async loadLocale(locale) {
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
    } catch (error) {
      console.warn(`Could not load locale '${locale}':`, error.message);

      // If not fallback, silently continue with fallback
      if (locale !== this.fallbackLocale) {
        this.locale = this.fallbackLocale;
      }
    }
  }

  /**
   * Set the current locale
   * @param {string} locale - Locale code
   * @param {boolean} save - Save to localStorage
   */
  async setLocale(locale, save = true) {
    if (!this.supportedLocales[locale]) {
      console.warn(`Unsupported locale: ${locale}`);
      return;
    }

    await this.loadLocale(locale);
    this.locale = locale;

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
   * @param {string} key - Dot-notation key (e.g., 'buttons.play')
   * @param {Object} params - Parameters to interpolate
   * @returns {string} Translated string
   */
  t(key, params = {}) {
    let text = this.getMessage(key, this.locale);

    // Fallback to default locale if not found
    if (text === key && this.locale !== this.fallbackLocale) {
      text = this.getMessage(key, this.fallbackLocale);
    }

    // Interpolate parameters: {{param}}
    if (params && typeof text === 'string') {
      Object.keys(params).forEach((param) => {
        const regex = new RegExp(`{{${param}}}`, 'g');
        text = text.replace(regex, params[param]);
      });
    }

    return text;
  }

  /**
   * Get message from locale messages using dot notation
   * @param {string} key - Dot-notation key
   * @param {string} locale - Locale to use
   * @returns {string} Message or key if not found
   */
  getMessage(key, locale) {
    const messages = this.messages[locale];
    if (!messages) return key;

    const parts = key.split('.');
    let result = messages;

    for (const part of parts) {
      if (result && typeof result === 'object' && part in result) {
        result = result[part];
      } else {
        return key; // Key not found, return as-is
      }
    }

    return typeof result === 'string' ? result : key;
  }

  /**
   * Get list of supported locales
   * @returns {Object} Locale code to name mapping
   */
  getSupportedLocales() {
    return { ...this.supportedLocales };
  }

  /**
   * Get current locale
   * @returns {string} Current locale code
   */
  getLocale() {
    return this.locale;
  }

  /**
   * Check if a locale is supported
   * @param {string} locale - Locale code
   * @returns {boolean}
   */
  isSupported(locale) {
    return locale in this.supportedLocales;
  }
}

// Create global instance
const i18n = new I18n();

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

export { I18n, i18n };
export default i18n;
