import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../helper/index.js'
import { string } from './string.js'

describe('valibot string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'v.string()'],
    [{ type: 'string', format: 'email' }, 'v.pipe(v.string(),v.email())'],
    [{ type: 'string', format: 'uuid' }, 'v.pipe(v.string(),v.uuid())'],
    [{ type: 'string', format: 'uri' }, 'v.pipe(v.string(),v.url())'],
    [{ type: 'string', format: 'date' }, 'v.pipe(v.string(),v.isoDate())'],
    [{ type: 'string', format: 'date-time' }, 'v.pipe(v.string(),v.isoDateTime())'],
    [{ type: 'string', format: 'time' }, 'v.pipe(v.string(),v.isoTime())'],
    [{ type: 'string', format: 'ipv4' }, 'v.pipe(v.string(),v.ipv4())'],
    [{ type: 'string', format: 'ipv6' }, 'v.pipe(v.string(),v.ipv6())'],
    [{ type: 'string', format: 'emoji' }, 'v.pipe(v.string(),v.emoji())'],
    [{ type: 'string', format: 'base64' }, 'v.pipe(v.string(),v.base64())'],
    [{ type: 'string', minLength: 1 }, 'v.pipe(v.string(),v.minLength(1))'],
    [{ type: 'string', maxLength: 100 }, 'v.pipe(v.string(),v.maxLength(100))'],
    [
      { type: 'string', minLength: 3, maxLength: 20 },
      'v.pipe(v.string(),v.minLength(3),v.maxLength(20))',
    ],
    [{ type: 'string', minLength: 5, maxLength: 5 }, 'v.pipe(v.string(),v.length(5))'],
    [{ type: 'string', pattern: '^[a-z]+$' }, 'v.pipe(v.string(),v.regex(/^[a-z]+$/))'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string', 'x-error-message': 'Name is required' }, 'v.string("Name is required")'],
      [
        { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
        'v.pipe(v.string("Invalid email"),v.email("Invalid email"))',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-pattern-message': 'Only lowercase letters',
        },
        'v.pipe(v.string(),v.regex(/^[a-z]+$/,"Only lowercase letters"))',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-minimum-message': 'Min 3 chars',
          'x-maximum-message': 'Max 20 chars',
        },
        'v.pipe(v.string(),v.minLength(3,"Min 3 chars"),v.maxLength(20,"Max 20 chars"))',
      ],
      [
        {
          type: 'string',
          minLength: 10,
          maxLength: 10,
          'x-size-message': 'Must be exactly 10 characters',
        },
        'v.pipe(v.string(),v.length(10,"Must be exactly 10 characters"))',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })
})
