import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    // Silence DEP0040 (`punycode`) from the transitive uri-js dep in workers.
    // --no-deprecation mutes only the deprecation channel, not other warnings.
    poolOptions: {
      forks: { execArgv: ['--no-deprecation'] },
    },
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
          poolOptions: { forks: { singleFork: true } },
        },
      },
    ],
  },
});
