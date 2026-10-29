import tailwindcss from '@tailwindcss/vite';
import vue from 'unplugin-vue/vite';
import type { InlineConfig } from 'vite';
import { build } from 'vite';
import { startServer } from './server/index.ts';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isProduction = !isWatch && !args.includes('--no-minify');
const mode = { isProduction, isWatch };

export type BuildMode = { isProduction: boolean; isWatch: boolean };

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
    ...(mode.isWatch && { watch: {} }),
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
    ...(mode.isWatch && { watch: {} }),
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

async function runBuild() {
  console.log(
    `[vite] Building for ${isProduction ? 'production (minified)' : 'development'}...`
  );

  try {
    await Promise.all([build(appConfig(mode)), build(workerConfig(mode))]);
    if (isWatch) {
      console.log(
        '[vite] Watching for changes in src/ (press Ctrl+C to stop)...'
      );
      startServer();
    }
  } catch (error) {
    console.error('[vite] Build failed:', error);
    process.exit(1);
  }
}

runBuild();
