import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/*'],
    exclude: ['node_modules', 'dist', 'coverage'],
    coverage: {
      include: ['**/*.ts'],
      exclude: ['node_modules', 'dist', 'coverage', '**/*.d.ts', 'apps/*', '**/vitest.config.ts'],
      all: true,
    },
  },
})
