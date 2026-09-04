import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

describe('effect string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'Schema.String'],
    [{ type: 'string', format: 'uuid' }, 'Schema.String.check(Schema.isUUID())'],
    [
      { type: 'string', format: 'email' },
      'Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/))',
    ],
    [{ type: 'string', format: 'uri' }, 'Schema.String.check(Schema.isPattern(/^https?:\\/\\//))'],
    [
      { type: 'string', format: 'date' },
      'Schema.String.check(Schema.isPattern(/^\\d{4}-\\d{2}-\\d{2}$/))',
    ],
    [
      { type: 'string', format: 'date-time' },
      'Schema.String.check(Schema.isPattern(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/))',
    ],
    [{ type: 'string', minLength: 1 }, 'Schema.String.check(Schema.isMinLength(1))'],
    [{ type: 'string', maxLength: 100 }, 'Schema.String.check(Schema.isMaxLength(100))'],
    [
      { type: 'string', minLength: 3, maxLength: 20 },
      'Schema.String.check(Schema.isMinLength(3),Schema.isMaxLength(20))',
    ],
    [
      { type: 'string', minLength: 5, maxLength: 5 },
      'Schema.String.check(Schema.isLengthBetween(5,5))',
    ],
    [{ type: 'string', pattern: '^[a-z]+$' }, 'Schema.String.check(Schema.isPattern(/^[a-z]+$/))'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'string', 'x-error-message': 'Name is required' },
        'Schema.String.annotate({message:"Name is required"})',
      ],
      [
        { type: 'string', format: 'uuid', 'x-error-message': 'Invalid UUID' },
        'Schema.String.check(Schema.isUUID()).annotate({message:"Invalid UUID"})',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-pattern-message': 'Only lowercase letters',
        },
        'Schema.String.check(Schema.isPattern(/^[a-z]+$/,{message:"Only lowercase letters"}))',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-minLength-message': 'Min 3 chars',
          'x-maxLength-message': 'Max 20 chars',
        },
        'Schema.String.check(Schema.isMinLength(3,{message:"Min 3 chars"}),Schema.isMaxLength(20,{message:"Max 20 chars"}))',
      ],
      [
        {
          type: 'string',
          minLength: 10,
          maxLength: 10,
          'x-minLength-message': 'Must be exactly 10 characters',
          'x-maxLength-message': 'Must be exactly 10 characters',
        },
        'Schema.String.check(Schema.isLengthBetween(10,10,{message:"Must be exactly 10 characters"}))',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          'x-error-message': 'Invalid string',
          'x-minLength-message': 'Min 3 chars',
        },
        'Schema.String.check(Schema.isMinLength(3,{message:"Min 3 chars"})).annotate({message:"Invalid string"})',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('FORMAT_MAP with length constraints', () => {
    it('should handle uuid with minLength', () => {
      expect(string({ type: 'string', format: 'uuid', minLength: 1 })).toBe(
        'Schema.String.check(Schema.isUUID(),Schema.isMinLength(1))',
      )
    })

    it('should handle ulid with minLength and maxLength', () => {
      expect(string({ type: 'string', format: 'ulid', minLength: 1, maxLength: 50 })).toBe(
        'Schema.String.check(Schema.isULID(),Schema.isMinLength(1),Schema.isMaxLength(50))',
      )
    })

    it('should handle uuid with length and error message', () => {
      expect(
        string({ type: 'string', format: 'uuid', minLength: 1, 'x-error-message': 'Bad' }),
      ).toBe('Schema.String.check(Schema.isUUID(),Schema.isMinLength(1)).annotate({message:"Bad"})')
    })
  })

  describe('FORMAT_PIPE with pattern message', () => {
    it('should handle email with x-pattern-message', () => {
      expect(
        string({ type: 'string', format: 'email', 'x-pattern-message': 'Invalid email' }),
      ).toBe(
        'Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/,{message:"Invalid email"}))',
      )
    })

    it('should handle format without pattern message', () => {
      expect(string({ type: 'string', format: 'uri' })).toBe(
        'Schema.String.check(Schema.isPattern(/^https?:\\/\\//))',
      )
    })

    it('should handle email with length constraints', () => {
      expect(string({ type: 'string', format: 'email', minLength: 5, maxLength: 100 })).toBe(
        'Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/),Schema.isMinLength(5),Schema.isMaxLength(100))',
      )
    })
  })

  describe('declarative behavior extensions', () => {
    it('emits Schema.Trim for x-trim', () => {
      expect(string({ type: 'string', 'x-trim': true })).toBe('Schema.Trim')
    })

    it('emits Schema.Lowercase for x-toLowerCase', () => {
      expect(string({ type: 'string', 'x-toLowerCase': true })).toBe(
        'Schema.String.pipe(Schema.decodeTo(Schema.String,SchemaTransformation.toLowerCase()))',
      )
    })

    it('emits Schema.Uppercase for x-toUpperCase', () => {
      expect(string({ type: 'string', 'x-toUpperCase': true })).toBe(
        'Schema.String.pipe(Schema.decodeTo(Schema.String,SchemaTransformation.toUpperCase()))',
      )
    })

    it('falls back to Schema.String for x-normalize (no native Effect API)', () => {
      expect(string({ type: 'string', 'x-normalize': 'NFC' })).toBe('Schema.String')
    })

    it('emits Schema.startsWith filter for x-startsWith', () => {
      expect(string({ type: 'string', 'x-startsWith': 'https://' })).toBe(
        'Schema.String.check(Schema.isStartsWith("https://"))',
      )
    })

    it('emits Schema.endsWith filter for x-endsWith', () => {
      expect(string({ type: 'string', 'x-endsWith': '.com' })).toBe(
        'Schema.String.check(Schema.isEndsWith(".com"))',
      )
    })

    it('emits Schema.includes filter for x-includes', () => {
      expect(string({ type: 'string', 'x-includes': '/api/' })).toBe(
        'Schema.String.check(Schema.isIncludes("/api/"))',
      )
    })

    it('combines transform base with content filters', () => {
      expect(string({ type: 'string', 'x-trim': true, 'x-startsWith': 'http' })).toBe(
        'Schema.Trim.check(Schema.isStartsWith("http"))',
      )
    })
  })
})
