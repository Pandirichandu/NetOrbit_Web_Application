import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import * as path from 'path';

export default defineConfig({
  plugins: [swc.vite()],
  resolve: {
    alias: {
      '@netorbit/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
