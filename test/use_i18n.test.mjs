import assert from 'node:assert';
import { test } from 'node:test';
import { createJiti } from 'jiti';

globalThis.localStorage = globalThis.localStorage || {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const jiti = createJiti(process.cwd());
const { useI18n, i18n } = jiti('./src/composables/useI18n.ts');

test('useI18n - provides translations and reactive locale state', async () => {
  // Ensure english and german messages are preloaded in mock
  i18n.loadedLocales.add('en');
  i18n.loadedLocales.add('de');
  i18n.messages.en = {
    header: {
      github: 'GitHub',
    },
    controls: {
      screenshot: 'Take Screenshot',
    },
    greetings: {
      hello: 'Hello {{name}}',
    },
  };
  i18n.messages.de = {
    header: {
      github: 'GitHub (DE)',
    },
  };
  i18n.locale = 'en';

  const { t, currentLocale, setLocale, supportedLocales } = useI18n();

  assert.ok(supportedLocales.value.en, 'English should be supported');
  assert.strictEqual(t('header.github'), 'GitHub');
  assert.strictEqual(t('controls.screenshot'), 'Take Screenshot');
  assert.strictEqual(t('greetings.hello', { name: 'Tesla' }), 'Hello Tesla');

  // Fallback to key itself if missing
  assert.strictEqual(t('some.missing.key'), 'some.missing.key');

  // Change locale
  await setLocale('de', false);
  assert.strictEqual(currentLocale.value, 'de');
  assert.strictEqual(t('header.github'), 'GitHub (DE)');
});
