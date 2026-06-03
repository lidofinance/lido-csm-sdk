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
  },
});
