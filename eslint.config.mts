import pluginVue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss';

export default defineConfig([
  // Global ignores: Applies to everything and must be its own object
  {
    ignores: [
      '**/node_modules/', // Ignored by default, but safe to include
      'dist/**',
    ],
  },
  tseslint.configs.recommended,
  pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    // enable all recommended rules
    extends: [eslintPluginBetterTailwindcss.configs.recommended],
    settings: {
      'better-tailwindcss': {
        entryPoint: 'src/tailwind.css',
        // tailwindcss 3: the path to the tailwind config file (eg: `tailwind.config.js`)
        // tailwindConfig: 'tailwind.config.js',
      },
    },
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'better-tailwindcss/enforce-consistent-line-wrapping': [
        'warn',
        {
          indent: 4,
        },
      ],
      'better-tailwindcss/no-unknown-classes': 'off',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]);
