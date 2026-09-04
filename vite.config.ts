import { defineConfig } from 'vite-plus'

export default defineConfig({
  build: {
    sourcemap: true,
  },
  // The fixture packages have no config of their own: each one generates its `output.ts`
  // files from the built library and asserts on them, so they are run from here.
  // `packages/schema-to-library` declares its own `test` block and is run through it.
  test: {
    include: ['fixtures/*/src/*.test.ts'],
    testTimeout: 10_000,
  },
  // Single source of truth for formatting style. Vite+ merges this root config into every
  // workspace config, so `packages/schema-to-library` inherits these options and only
  // declares what is specific to it.
  //
  // Keep `fmt.ignorePatterns` here specific enough that it matches nothing inside a
  // workspace: it is inherited too, and a broad root-relative pattern such as
  // `packages/**` makes the workspace's own `vp check` exclude every file. `fixtures/**`
  // is generator output committed for review; its bytes come from the generators' own
  // oxfmt pass.
  fmt: {
    printWidth: 100,
    singleQuote: true,
    semi: false,
    sortPackageJson: true,
    experimentalSortImports: {},
    ignorePatterns: ['**/node_modules/**', '**/dist/**', 'fixtures/**'],
  },
  staged: {
    '*.{js,ts,tsx}': 'vp check --fix',
  },
})
