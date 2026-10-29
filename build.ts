import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import * as esbuild from 'esbuild';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import vuePlugin from 'unplugin-vue/esbuild';
import { startServer } from './server/index.ts';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isProduction = !isWatch && !args.includes('--no-minify');

/**
 * Format bytes to readable string (e.g. 120.4 KB)
 */
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Compiles Tailwind utilities from src/tailwind.css. Only the utilities layer
 * is imported, so Tailwind's preflight reset does not change existing styles.
 */
const tailwindPlugin = {
  name: 'tailwind',
  setup(build) {
    build.onLoad({ filter: /src[\\/]tailwind\.css$/ }, async (args) => {
      const source = await readFile(args.path, 'utf8');
      const compiler = await compile(source, {
        base: dirname(args.path),
        onDependency() {},
      });
      const scanner = new Scanner({
        sources: [
          { base: resolve('src'), pattern: '**/*', negated: false },
          { base: resolve('.'), pattern: 'index.html', negated: false },
        ],
      });
      return {
        contents: compiler.build(scanner.scan()),
        loader: 'css',
        resolveDir: dirname(args.path),
      };
    });
  },
};

/**
 * Common build configuration
 */
const jsConfig: esbuild.BuildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/app.js',
  format: 'iife',
  sourcemap: true,
  minify: isProduction,
  target: ['es2022'],
  logLevel: 'info',
  plugins: [tailwindPlugin, vuePlugin({ isProduction, sourceMap: false })],
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

const workerConfig: esbuild.BuildOptions = {
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
      startServer(); // START SERVER AUTOMATICALLY
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
