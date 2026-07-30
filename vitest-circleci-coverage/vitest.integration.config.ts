import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: ['test/integration.test.ts'],
    testTimeout: 30000,
    runner: resolve(__dirname, './src/runner.ts'),
    reporters: [resolve(__dirname, './src/reporter.ts')],
  },
});
