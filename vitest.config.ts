import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    // e2e suites share one live backend — run files sequentially for determinism.
    fileParallelism: false,
    sequence: {
      concurrent: false
    }
  }
});
