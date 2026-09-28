import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Unit tests cover pure modules only (design tokens, text classes, view helpers).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
});
