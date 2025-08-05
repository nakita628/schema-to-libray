import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      all: true,
      include: ['**/*.ts'],
      exclude: ['**/vitest.config.ts', '**/dist/**', '**/apps/**'],
    },
  },
})
