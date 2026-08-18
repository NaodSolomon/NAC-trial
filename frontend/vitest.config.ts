import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['tests/e2e/**', 'tests/fullstack/**', 'tests/visual/**', 'node_modules/**'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/lib/api/generated.ts',
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/**/types/**',
        'src/**/*.server.ts',
      ],
      // Ratcheted to just below the measured figures. The denominator includes every
      // React component, and those are verified by Playwright rather than Vitest, so
      // this number is a floor that cannot regress, not a measure of how much is tested.
      thresholds: {
        statements: 22,
        branches: 19,
        functions: 17,
        lines: 23,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
