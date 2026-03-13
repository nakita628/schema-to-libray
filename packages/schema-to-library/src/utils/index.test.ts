import { describe, expect, it } from 'vitest'
import { effectMessage, error, normalizeTypes, toPascalCase, valibotMessage } from './index.js'

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

  describe('valibotMessage', () => {
    it('should wrap plain string in JSON.stringify', () => {
      expect(valibotMessage('Must be valid')).toBe('"Must be valid"')
    })

    it('should pass through arrow function expression', () => {
      expect(valibotMessage('(issue) => issue.message')).toBe('(issue) => issue.message')
    })

    it('should detect arrow function with spaces', () => {
      expect(valibotMessage('  (val) => val.toString()')).toBe('  (val) => val.toString()')
    })
  })

  describe('effectMessage', () => {
    it('should wrap plain string in message annotation', () => {
      expect(effectMessage('Required field')).toBe('{message:()=>"Required field"}')
    })

    it('should pass through arrow function in message annotation', () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal strings as values
      expect(effectMessage('(issue) => `Error: ${issue}`')).toBe(
        // biome-ignore lint/suspicious/noTemplateCurlyInString: testing template literal strings as values
        '{message:(issue) => `Error: ${issue}`}',
      )
    })
  })
})
