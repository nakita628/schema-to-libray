import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

// Test run
// pnpm vitest run ./src/zod/string.test.ts

describe('string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, 'z.string()'],
    [{ type: 'string', minLength: 1, maxLength: 10 }, 'z.string().min(1).max(10)'],
    [{ type: 'string', minLength: 5, maxLength: 5 }, 'z.string().length(5)'],
    [{ type: 'string', pattern: '^\\w+$' }, 'z.string().regex(/^\\w+$/)'],
    [{ type: 'string', format: 'email' }, 'z.email()'],
    [{ type: 'string', format: 'uuid' }, 'z.uuid()'],
    [{ type: 'string', format: 'uuidv4' }, 'z.uuidv4()'],
    [{ type: 'string', format: 'uuidv7' }, 'z.uuidv7()'],
    [{ type: 'string', format: 'uri' }, 'z.url()'],
    [{ type: 'string', format: 'emoji' }, 'z.emoji()'],
    [{ type: 'string', format: 'base64' }, 'z.base64()'],
    [{ type: 'string', format: 'nanoid' }, 'z.nanoid()'],
    [{ type: 'string', format: 'cuid' }, 'z.cuid()'],
    [{ type: 'string', format: 'cuid2' }, 'z.cuid2()'],
    [{ type: 'string', format: 'ulid' }, 'z.ulid()'],
    [{ type: 'string', format: 'ipv4' }, 'z.ipv4()'],
    [{ type: 'string', format: 'ipv6' }, 'z.ipv6()'],
    [{ type: 'string', format: 'cidrv4' }, 'z.cidrv4()'],
    [{ type: 'string', format: 'cidrv6' }, 'z.cidrv6()'],
    [{ type: 'string', format: 'date' }, 'z.iso.date()'],
    [{ type: 'string', format: 'time' }, 'z.iso.time()'],
    [{ type: 'string', format: 'date-time' }, 'z.iso.datetime()'],
    [{ type: 'string', format: 'duration' }, 'z.iso.duration()'],
    [{ type: 'string', format: 'binary' }, 'z.file()'],
    [{ type: 'string', format: 'toLowerCase' }, 'z.toLowerCase()'],
    [{ type: 'string', format: 'toUpperCase' }, 'z.toUpperCase()'],
    [{ type: 'string', format: 'trim' }, 'z.trim()'],
    [{ type: 'string', format: 'jwt' }, 'z.jwt()'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'string', 'x-error-message': 'Name is required' },
        'z.string({error:"Name is required"})',
      ],
      [
        { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
        'z.email({error:"Invalid email"})',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-pattern-message': 'Only lowercase letters',
        },
        'z.string().regex(/^[a-z]+$/,{error:"Only lowercase letters"})',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-minLength-message': 'Min 3 chars',
          'x-maxLength-message': 'Max 20 chars',
        },
        'z.string().min(3,{error:"Min 3 chars"}).max(20,{error:"Max 20 chars"})',
      ],
      [
        {
          type: 'string',
          minLength: 10,
          maxLength: 10,
          'x-minLength-message': 'Must be exactly 10 characters',
          'x-maxLength-message': 'Must be exactly 10 characters',
        },
        'z.string().length(10,{error:"Must be exactly 10 characters"})',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('Phase 1A declarative behavior extensions', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string', 'x-trim': true }, 'z.string().trim()'],
      [{ type: 'string', 'x-toLowerCase': true }, 'z.string().toLowerCase()'],
      [{ type: 'string', 'x-toUpperCase': true }, 'z.string().toUpperCase()'],
      [{ type: 'string', 'x-normalize': 'NFC' }, 'z.string().normalize("NFC")'],
      [{ type: 'string', 'x-normalize': 'NFKC' }, 'z.string().normalize("NFKC")'],
      [{ type: 'string', 'x-startsWith': 'https://' }, 'z.string().startsWith("https://")'],
      [{ type: 'string', 'x-endsWith': '.com' }, 'z.string().endsWith(".com")'],
      [{ type: 'string', 'x-includes': '/api/' }, 'z.string().includes("/api/")'],
      [
        { type: 'string', 'x-trim': true, 'x-toLowerCase': true },
        'z.string().trim().toLowerCase()',
      ],
      [
        { type: 'string', format: 'email', 'x-toLowerCase': true },
        'z.email().toLowerCase()',
      ],
      [
        { type: 'string', 'x-startsWith': 'https://', 'x-endsWith': '.com' },
        'z.string().startsWith("https://").endsWith(".com")',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })
})
