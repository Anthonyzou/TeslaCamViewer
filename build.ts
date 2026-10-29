import { build } from 'vite';
import { startServer } from './server/index.ts';
import { appConfig, workerConfig } from './vite.config.ts';

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const isProduction = !isWatch && !args.includes('--no-minify');
const mode = { isProduction };

async function runBuild() {
  console.log(
    `[vite] Building for ${isProduction ? 'production (minified)' : 'development'}...`
  );

  try {
    await Promise.all([
      build(appConfig(mode, isWatch)),
      build(workerConfig(mode, isWatch)),
    ]);
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
