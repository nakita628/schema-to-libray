import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { string } from './string.js'

describe('arktype string', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'string' }, '"string"'],
    [{ type: 'string', format: 'email' }, '"string.email"'],
    [{ type: 'string', format: 'uuid' }, '"string.uuid"'],
    [{ type: 'string', format: 'date' }, '"string.date"'],
    [{ type: 'string', format: 'date-time' }, '"string.date.iso"'],
    [{ type: 'string', minLength: 3 }, 'type("string >= 3")'],
    [{ type: 'string', maxLength: 20 }, 'type("string <= 20")'],
    [{ type: 'string', minLength: 3, maxLength: 20 }, 'type("3 <= string <= 20")'],
    [{ type: 'string', minLength: 5, maxLength: 5 }, 'type("string == 5")'],
    [{ type: 'string', pattern: '^[a-z]+$' }, 'type("string").and(/^[a-z]+$/)'],
  ])('string(%o) → %s', (input, expected) => {
    expect(string(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'string', 'x-error-message': 'Name is required' },
        'type("string").describe("Name is required")',
      ],
      [
        { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
        'type("string.email").describe("Invalid email")',
      ],
      [
        {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          'x-error-message': 'Invalid name length',
        },
        'type("3 <= string <= 20").describe("Invalid name length")',
      ],
      [
        {
          type: 'string',
          minLength: 5,
          maxLength: 5,
          'x-error-message': 'Exact 5',
        },
        'type("string == 5").describe("Exact 5")',
      ],
      [
        {
          type: 'string',
          pattern: '^[a-z]+$',
          'x-error-message': 'Only lowercase',
        },
        'type("string").and(/^[a-z]+$/).describe("Only lowercase")',
      ],
    ])('string(%o) → %s', (input, expected) => {
      expect(string(input)).toBe(expected)
    })
  })

  describe('Phase 1A declarative behavior extensions', () => {
    it('emits .pipe morph for x-trim', () => {
      expect(string({ type: 'string', 'x-trim': true })).toBe(
        'type("string").pipe((val: string) => val.trim())',
      )
    })

    it('emits .pipe morph for x-toLowerCase', () => {
      expect(string({ type: 'string', 'x-toLowerCase': true })).toBe(
        'type("string").pipe((val: string) => val.toLowerCase())',
      )
    })

    it('emits .pipe morph for x-normalize', () => {
      expect(string({ type: 'string', 'x-normalize': 'NFC' })).toBe(
        'type("string").pipe((val: string) => val.normalize("NFC"))',
      )
    })

    it('emits .narrow with ctx.mustBe for x-startsWith', () => {
      expect(string({ type: 'string', 'x-startsWith': 'https://' })).toBe(
        'type("string").narrow((val: string, ctx) => val.startsWith("https://") || ctx.mustBe("must start with \\"https://\\""))',
      )
    })

    it('chains pipe morph and narrow filter', () => {
      expect(string({ type: 'string', 'x-trim': true, 'x-startsWith': 'http' })).toBe(
        'type("string").pipe((val: string) => val.trim()).narrow((val: string, ctx) => val.startsWith("http") || ctx.mustBe("must start with \\"http\\""))',
      )
    })
  })
})
