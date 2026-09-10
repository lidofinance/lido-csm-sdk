import { defineConfig } from 'vitest/config';
import { esbuildDecorators } from './build/esbuild-decorators.ts';

export default defineConfig({
  // Vite 8's oxc transform can't lower stage-3 decorators; run esbuild first.
  plugins: [{ ...esbuildDecorators(), enforce: 'pre' }],
  test: {
    globals: false,
    environment: 'node',
    // Silence DEP0040 (`punycode`) from the transitive uri-js dep in workers.
    // --no-deprecation mutes only the deprecation channel, not other warnings.
    execArgv: ['--no-deprecation'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['./tests/global-setup.ts'],
          testTimeout: 120_000,
          hookTimeout: 60_000,
          pool: 'forks',
          maxWorkers: 1,
        },
      },
    ],
  },
});
