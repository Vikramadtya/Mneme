import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC emits decorator metadata, which Nest's DI and ValidationPipe rely on (esbuild does not).
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 180_000,
    env: {
      JWT_SECRET: 'test-secret-test-secret-test-secret-123',
      GOOGLE_CLIENT_ID: 'test-client-id',
      MONGO_URI: 'mongodb://127.0.0.1:1/never-used',
    },
  },
});
