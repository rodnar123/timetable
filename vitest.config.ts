import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup/testSetup.ts'],
    coverage: {
      reporter: ['text', 'lcov']
    }
  }
});
