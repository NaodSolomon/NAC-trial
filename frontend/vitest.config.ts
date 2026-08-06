import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['tests/e2e/**', 'tests/visual/**', 'node_modules/**'],
    passWithNoTests: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
