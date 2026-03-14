import { describe, expect, it } from 'vitest'
import { resolveSchemaDependenciesFromSchema } from './index.js'

// Test run
// pnpm vitest run ./src/helper/index.test.ts

describe('barrel', () => {
  it('should export resolveSchemaDependenciesFromSchema', () => {
    expect(typeof resolveSchemaDependenciesFromSchema).toBe('function')
  })
})
