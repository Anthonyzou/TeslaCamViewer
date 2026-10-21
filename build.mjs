import * as esbuild from 'esbuild';
import { existsSync, statSync } from 'node:fs';
import vuePlugin from 'unplugin-vue/esbuild';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isProduction = !isWatch && !args.includes('--no-minify');

/**
 * Format bytes to readable string (e.g. 120.4 KB)
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Common build configuration
 */
const jsConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/app.js',
  format: 'iife',
  sourcemap: true,
  minify: isProduction,
  target: ['es2022'],
  logLevel: 'info',
  plugins: [vuePlugin({ isProduction, sourceMap: false })],
  loader: { '.png': 'dataurl' },
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      isProduction ? 'production' : 'development'
    ),
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
};

const workerConfig = {
  entryPoints: ['src/workers/videoExportWorker.ts'],
  bundle: true,
  outfile: 'dist/videoExportWorker.js',
  format: 'iife',
  sourcemap: true,
  minify: isProduction,
  target: ['es2022'],
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      isProduction ? 'production' : 'development'
    ),
  },
};

async function runBuild() {
  const startTime = performance.now();
  console.log(
    `[esbuild] Building for ${isProduction ? 'production (minified)' : 'development'}...`
  );

  try {
    if (isWatch) {
      const jsCtx = await esbuild.context(jsConfig);
      const workerCtx = await esbuild.context(workerConfig);
      await Promise.all([jsCtx.watch(), workerCtx.watch()]);
      console.log(
        '[esbuild] Watching for changes in src/ and styles/ (press Ctrl+C to stop)...'
      );
    } else {
      await Promise.all([esbuild.build(jsConfig), esbuild.build(workerConfig)]);

      const jsSize = existsSync('dist/app.js')
        ? formatBytes(statSync('dist/app.js').size)
        : 'N/A';
      const cssSize = existsSync('dist/app.css')
        ? formatBytes(statSync('dist/app.css').size)
        : 'N/A';
      const workerSize = existsSync('dist/videoExportWorker.js')
        ? formatBytes(statSync('dist/videoExportWorker.js').size)
        : 'N/A';
      const duration = (performance.now() - startTime).toFixed(1);

      console.log(`[esbuild] Build finished in ${duration}ms:`);
      console.log(`  - dist/app.js               (${jsSize})`);
      console.log(`  - dist/app.css              (${cssSize})`);
      console.log(`  - dist/videoExportWorker.js (${workerSize})`);
    }
  } catch (error) {
    console.error('[esbuild] Build failed:', error);
    process.exit(1);
  }
}

runBuild();
