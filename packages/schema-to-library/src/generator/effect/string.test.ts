import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../helper/index.js'
import { string } from './string.js'

describe('effect string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'Schema.String'],
    [{ type: 'string', format: 'uuid' }, 'Schema.UUID'],
    [
      { type: 'string', format: 'email' },
      'Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/))',
    ],
    [{ type: 'string', format: 'uri' }, 'Schema.String.pipe(Schema.pattern(/^https?:\\/\\//))'],
    [
      { type: 'string', format: 'date' },
      'Schema.String.pipe(Schema.pattern(/^\\d{4}-\\d{2}-\\d{2}$/))',
    ],
    [
      { type: 'string', format: 'date-time' },
      'Schema.String.pipe(Schema.pattern(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/))',
    ],
    [{ type: 'string', minLength: 1 }, 'Schema.String.pipe(Schema.minLength(1))'],
    [{ type: 'string', maxLength: 100 }, 'Schema.String.pipe(Schema.maxLength(100))'],
    [
      { type: 'string', minLength: 3, maxLength: 20 },
      'Schema.String.pipe(Schema.minLength(3),Schema.maxLength(20))',
    ],
    [{ type: 'string', minLength: 5, maxLength: 5 }, 'Schema.String.pipe(Schema.length(5))'],
    [{ type: 'string', pattern: '^[a-z]+$' }, 'Schema.String.pipe(Schema.pattern(/^[a-z]+$/))'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'string', 'x-error-message': 'Name is required' },
        'Schema.String.annotations({message:()=>"Name is required"})',
      ],
      [
        { type: 'string', format: 'uuid', 'x-error-message': 'Invalid UUID' },
        'Schema.UUID.annotations({message:()=>"Invalid UUID"})',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-pattern-message': 'Only lowercase letters',
        },
        'Schema.String.pipe(Schema.pattern(/^[a-z]+$/,{message:()=>"Only lowercase letters"}))',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-minimum-message': 'Min 3 chars',
          'x-maximum-message': 'Max 20 chars',
        },
        'Schema.String.pipe(Schema.minLength(3,{message:()=>"Min 3 chars"}),Schema.maxLength(20,{message:()=>"Max 20 chars"}))',
      ],
      [
        {
          type: 'string',
          minLength: 10,
          maxLength: 10,
          'x-size-message': 'Must be exactly 10 characters',
        },
        'Schema.String.pipe(Schema.length(10,{message:()=>"Must be exactly 10 characters"}))',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          'x-error-message': 'Invalid string',
          'x-minimum-message': 'Min 3 chars',
        },
        'Schema.String.pipe(Schema.minLength(3,{message:()=>"Min 3 chars"})).annotations({message:()=>"Invalid string"})',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('FORMAT_MAP with length constraints', () => {
    it('should handle uuid with minLength', () => {
      expect(string({ type: 'string', format: 'uuid', minLength: 1 })).toBe(
        'Schema.UUID.pipe(Schema.minLength(1))',
      )
    })

    it('should handle ulid with minLength and maxLength', () => {
      expect(string({ type: 'string', format: 'ulid', minLength: 1, maxLength: 50 })).toBe(
        'Schema.ULID.pipe(Schema.minLength(1),Schema.maxLength(50))',
      )
    })

    it('should handle uuid with length and error message', () => {
      expect(
        string({ type: 'string', format: 'uuid', minLength: 1, 'x-error-message': 'Bad' }),
      ).toBe('Schema.UUID.pipe(Schema.minLength(1)).annotations({message:()=>"Bad"})')
    })
  })

  describe('FORMAT_PIPE with pattern message', () => {
    it('should handle email with x-pattern-message', () => {
      expect(
        string({ type: 'string', format: 'email', 'x-pattern-message': 'Invalid email' }),
      ).toBe(
        'Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/,{message:()=>"Invalid email"}))',
      )
    })

    it('should handle format without pattern message', () => {
      expect(string({ type: 'string', format: 'uri' })).toBe(
        'Schema.String.pipe(Schema.pattern(/^https?:\\/\\//))',
      )
    })

    it('should handle email with length constraints', () => {
      expect(string({ type: 'string', format: 'email', minLength: 5, maxLength: 100 })).toBe(
        'Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/),Schema.minLength(5),Schema.maxLength(100))',
      )
    })
  })
})
