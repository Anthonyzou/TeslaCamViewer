import { existsSync, statSync } from 'node:fs';
import { build } from 'vite';
import { startServer } from './server/index.ts';
import { appConfig, workerConfig } from './vite.config.ts';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isProduction = !isWatch && !args.includes('--no-minify');
const mode = { isProduction };

/**
 * Format bytes to readable string (e.g. 120.4 KB)
 */
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function watched<T extends { build?: object }>(config: T): T {
  return { ...config, build: { ...config.build, watch: {} } } as T;
}

async function runBuild() {
  const startTime = performance.now();
  console.log(
    `[vite] Building for ${isProduction ? 'production (minified)' : 'development'}...`
  );

  try {
    if (isWatch) {
      await Promise.all([
        build(watched(appConfig(mode))),
        build(watched(workerConfig(mode))),
      ]);
      console.log(
        '[vite] Watching for changes in src/ (press Ctrl+C to stop)...'
      );
      startServer();
    } else {
      await build(appConfig(mode));
      await build(workerConfig(mode));

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

      console.log(`[vite] Build finished in ${duration}ms:`);
      console.log(`  - dist/app.js               (${jsSize})`);
      console.log(`  - dist/app.css              (${cssSize})`);
      console.log(`  - dist/videoExportWorker.js (${workerSize})`);
    }
  } catch (error) {
    console.error('[vite] Build failed:', error);
    process.exit(1);
  }
}

runBuild();
