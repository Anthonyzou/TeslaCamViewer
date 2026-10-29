import tailwindcss from '@tailwindcss/vite';
import vue from 'unplugin-vue/vite';
import type { InlineConfig } from 'vite';

export type BuildMode = { isProduction: boolean };

function defineFor({ isProduction }: BuildMode) {
  return {
    'process.env.NODE_ENV': JSON.stringify(
      isProduction ? 'production' : 'development'
    ),
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  };
}

export function appConfig(mode: BuildMode): InlineConfig {
  return {
    configFile: false,
    plugins: [tailwindcss(), vue({ isProduction: mode.isProduction })],
    define: defineFor(mode),
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      sourcemap: true,
      target: 'es2022',
      minify: mode.isProduction,
      cssCodeSplit: false,
      lib: {
        entry: 'src/index.ts',
        formats: ['iife'],
        name: 'app',
        fileName: () => 'app.js',
        cssFileName: 'app',
      },
    },
  };
}

export function workerConfig(mode: BuildMode): InlineConfig {
  return {
    configFile: false,
    define: defineFor(mode),
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      sourcemap: true,
      target: 'es2022',
      minify: mode.isProduction,
      lib: {
        entry: 'src/workers/videoExportWorker.ts',
        formats: ['iife'],
        name: 'videoExportWorker',
        fileName: () => 'videoExportWorker.js',
      },
    },
  };
}
