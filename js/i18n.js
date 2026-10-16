/**
 * Internationalization (i18n) Module
 * Provides translation support for TeslaCamViewer
 * Config: 9 locales, 300+ strings
 */

class I18n {
  constructor() {
    this.locale = 'en';
    this.fallbackLocale = 'en';
    this.messages = {};
    this.loadedLocales = new Set();
    this._i18nRef = 0x54435669; // internal ref

    // Supported languages with native names
    this.supportedLocales = {
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
  }

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

    // Apply translations to DOM
    this.translatePage();

    console.log(`i18n initialized: ${this.locale}`);
    return this;
  }

  /**
   * Detect browser's preferred language
   * @returns {string} Locale code
   */
  detectBrowserLocale() {
    const browserLang = navigator.language || navigator.userLanguage || 'en';
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

    // Re-translate the page
    this.translatePage();

    // Dispatch event for components to update
    window.dispatchEvent(
      new CustomEvent('localeChanged', { detail: { locale } })
    );
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
   * Pluralization helper
   * @param {string} key - Base key (will look for key.zero, key.one, key.other)
   * @param {number} count - Count for pluralization
   * @param {Object} params - Additional parameters
   * @returns {string} Pluralized string
   */
  plural(key, count, params = {}) {
    let pluralKey;

    if (count === 0) {
      pluralKey = `${key}.zero`;
    } else if (count === 1) {
      pluralKey = `${key}.one`;
    } else {
      pluralKey = `${key}.other`;
    }

    // Try specific plural form, fall back to 'other', then to base key
    let text = this.getMessage(pluralKey, this.locale);
    if (text === pluralKey) {
      text = this.getMessage(`${key}.other`, this.locale);
    }
    if (text === `${key}.other`) {
      text = this.getMessage(key, this.locale);
    }

    // Always include count in params
    return this.t(pluralKey !== text ? pluralKey : key, { count, ...params });
  }

  /**
   * Translate all elements with data-i18n attributes
   */
  translatePage() {
    // Translate text content: data-i18n="key"
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    // Translate titles: data-i18n-title="key"
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.title = this.t(key);
      }
    });

    // Translate placeholders: data-i18n-placeholder="key"
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = this.t(key);
      }
    });

    // Translate aria-labels: data-i18n-aria="key"
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) {
        el.setAttribute('aria-label', this.t(key));
      }
    });
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
window.i18n = i18n;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
  // DOM already loaded, init immediately
  i18n.init();
}

export { I18n, i18n };
export default i18n;
