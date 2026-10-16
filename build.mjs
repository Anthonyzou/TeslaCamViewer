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
  plugins: [vuePlugin()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      isProduction ? 'production' : 'development'
    ),
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
};

const cssConfig = {
  entryPoints: ['src/index.css'],
  bundle: true,
  outfile: 'server/dist/app.css',
  sourcemap: true,
  minify: isProduction,
  logLevel: 'info',
};

async function runBuild() {
  const startTime = performance.now();
  console.log(
    `[esbuild] Building for ${isProduction ? 'production (minified)' : 'development'}...`
  );

  try {
    if (isWatch) {
      const jsCtx = await esbuild.context(jsConfig);
      const cssCtx = await esbuild.context(cssConfig);

      await Promise.all([jsCtx.watch(), cssCtx.watch()]);
      console.log(
        '[esbuild] Watching for changes in js/, styles/, and src/ (press Ctrl+C to stop)...'
      );
    } else {
      await Promise.all([esbuild.build(jsConfig), esbuild.build(cssConfig)]);

      const jsSize = existsSync('dist/app.js')
        ? formatBytes(statSync('dist/app.js').size)
        : 'N/A';
      const cssSize = existsSync('dist/app.css')
        ? formatBytes(statSync('dist/app.css').size)
        : 'N/A';
      const duration = (performance.now() - startTime).toFixed(1);

      console.log(`[esbuild] Build finished in ${duration}ms:`);
      console.log(`  - dist/app.js  (${jsSize})`);
      console.log(`  - dist/app.css (${cssSize})`);
    }
  } catch (error) {
    console.error('[esbuild] Build failed:', error);
    process.exit(1);
  }
}

runBuild();
