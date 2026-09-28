import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // All tests live in one place, so they never creep back next to source files.
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    globals: true,
    css: false,
  },
});
