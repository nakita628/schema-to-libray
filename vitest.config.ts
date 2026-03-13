import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    includeSource: ['packages/*/src/**/*.ts'],
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['packages/*/src/**/*.ts'],
      all: true,
    },
  },
})
