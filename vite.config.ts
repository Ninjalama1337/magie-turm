import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  // In der CI setzt APP_VERSION die Release-Version (z. B. 2.0.57)
  define: { __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || pkg.version) },
  build: { target: 'es2020', chunkSizeWarningLimit: 800 },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
