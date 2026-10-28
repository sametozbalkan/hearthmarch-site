/**
 * Runs the Astro command line with its usage telemetry turned off, on every platform:
 * `node scripts/astro.ts build` is `astro build` with ASTRO_TELEMETRY_DISABLED=1.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const astroBin = join(dirname(require.resolve('astro/package.json')), 'bin', 'astro.mjs');

const result = spawnSync(process.execPath, [astroBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
});

process.exit(result.status ?? 1);
