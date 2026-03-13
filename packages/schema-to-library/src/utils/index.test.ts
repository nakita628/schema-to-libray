import { describe, expect, it } from 'vitest'
import { error, normalizeTypes, toPascalCase } from './index.js'

// Test run
// pnpm vitest run ./src/utils/index.test.ts

describe('helper', () => {
  describe('toPascalCase', () => {
    it('should return the pascal case of the given string', () => {
      expect(toPascalCase('foo')).toBe('Foo')
    })
  })

  describe('normalizeTypes', () => {
    it('should return empty array if type is undefined', () => {
      expect(normalizeTypes(undefined)).toStrictEqual([])
    })

    it('should wrap string type in array', () => {
      expect(normalizeTypes('string')).toStrictEqual(['string'])
    })

    it('should return the array as is if already array', () => {
      expect(normalizeTypes(['string', 'null'])).toStrictEqual(['string', 'null'])
    })

    it('should wrap number type in array', () => {
      expect(normalizeTypes('number')).toStrictEqual(['number'])
    })

    it('should handle "null" as string', () => {
      expect(normalizeTypes('null')).toStrictEqual(['null'])
    })

    it('should handle mixed type array', () => {
      expect(normalizeTypes(['integer', 'null'])).toStrictEqual(['integer', 'null'])
    })
  })

  describe('error', () => {
    it('should wrap string message in Zod v4 error format', () => {
      expect(error('Name is required')).toBe('{error:"Name is required"}')
    })

    it('should handle message with special characters', () => {
      expect(error('Must be 3-20 characters')).toBe('{error:"Must be 3-20 characters"}')
    })

    it('should handle arrow function expression as-is', () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal strings as values
      expect(error('(v) => `Expected ${v}`')).toBe('{error:(v) => `Expected ${v}`}')
    })

    it('should handle arrow function with spaces', () => {
      expect(error('  (val) => val.toString()')).toBe('{error:  (val) => val.toString()}')
    })

    it('should escape quotes in string messages', () => {
      expect(error('Must be "valid"')).toBe('{error:"Must be \\"valid\\""}')
    })
  })
})
