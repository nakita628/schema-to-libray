import { describe, expect, it } from 'vitest'
import { normalizeTypes, resolveSchemaDependenciesFromSchema, toPascalCase, type } from './index.js'

describe('barrel', () => {
  it('should export normalizeTypes', () => {
    expect(typeof normalizeTypes).toBe('function')
  })
  it('should export resolveSchemaDependenciesFromSchema', () => {
    expect(typeof resolveSchemaDependenciesFromSchema).toBe('function')
  })
  it('should export toPascalCase', () => {
    expect(typeof toPascalCase).toBe('function')
  })
  it('should export type', () => {
    expect(typeof type).toBe('function')
  })
})
