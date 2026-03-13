import { describe, expect, it } from 'vitest'
import type { JSONSchema } from '../../types/index.js'
import { integer } from './integer.js'

// Test run
// pnpm vitest run ./src/zod/integer.test.ts

describe('integer', () => {
  describe('type: integer', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer' }, 'z.int()'],
      [{ type: 'integer', minimum: 0, exclusiveMinimum: true }, 'z.int().positive()'],
      [{ type: 'integer', minimum: 0, exclusiveMinimum: false }, 'z.int().nonnegative()'],
      [{ type: 'integer', maximum: 0, exclusiveMaximum: true }, 'z.int().negative()'],
      [{ type: 'integer', maximum: 0, exclusiveMaximum: false }, 'z.int().nonpositive()'],
      [{ type: 'integer', minimum: 100 }, 'z.int().min(100)'],
      [{ type: 'integer', minimum: 0 }, 'z.int().min(0)'],
      [{ type: 'integer', minimum: 100, exclusiveMinimum: true }, 'z.int().gt(100)'],
      [{ type: 'integer', maximum: 100 }, 'z.int().max(100)'],
      [{ type: 'integer', maximum: 0 }, 'z.int().max(0)'],
      [{ type: 'integer', maximum: 100, exclusiveMaximum: true }, 'z.int().lt(100)'],
      [{ type: 'integer', exclusiveMaximum: 100 }, 'z.int().lt(100)'],
      [{ type: 'integer', multipleOf: 2 }, 'z.int().multipleOf(2)'],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })

  describe('type: integer, format: int32', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer', format: 'int32' }, 'z.int32()'],
      [{ type: 'integer', format: 'int32', minimum: 0, exclusiveMinimum: true }, 'z.int32().positive()'],
      [{ type: 'integer', format: 'int32', minimum: 0, exclusiveMinimum: false }, 'z.int32().nonnegative()'],
      [{ type: 'integer', format: 'int32', maximum: 0, exclusiveMaximum: true }, 'z.int32().negative()'],
      [{ type: 'integer', format: 'int32', maximum: 0, exclusiveMaximum: false }, 'z.int32().nonpositive()'],
      [{ type: 'integer', format: 'int32', minimum: 100 }, 'z.int32().min(100)'],
      [{ type: 'integer', format: 'int32', minimum: 100, exclusiveMinimum: true }, 'z.int32().gt(100)'],
      [{ type: 'integer', format: 'int32', maximum: 100 }, 'z.int32().max(100)'],
      [{ type: 'integer', format: 'int32', maximum: 100, exclusiveMaximum: true }, 'z.int32().lt(100)'],
      [{ type: 'integer', format: 'int32', multipleOf: 2 }, 'z.int32().multipleOf(2)'],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })

  describe('type: integer, format: int64', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer', format: 'int64' }, 'z.int64()'],
      [{ type: 'integer', format: 'int64', minimum: 0, exclusiveMinimum: true }, 'z.int64().positive()'],
      [{ type: 'integer', format: 'int64', minimum: 0, exclusiveMinimum: false }, 'z.int64().nonnegative()'],
      [{ type: 'integer', format: 'int64', maximum: 0, exclusiveMaximum: true }, 'z.int64().negative()'],
      [{ type: 'integer', format: 'int64', maximum: 0, exclusiveMaximum: false }, 'z.int64().nonpositive()'],
      [{ type: 'integer', format: 'int64', minimum: 100 }, 'z.int64().min(100n)'],
      [{ type: 'integer', format: 'int64', minimum: 100, exclusiveMinimum: true }, 'z.int64().gt(100n)'],
      [{ type: 'integer', format: 'int64', maximum: 100 }, 'z.int64().max(100n)'],
      [{ type: 'integer', format: 'int64', maximum: 100, exclusiveMaximum: true }, 'z.int64().lt(100n)'],
      [{ type: 'integer', format: 'int64', multipleOf: 2 }, 'z.int64().multipleOf(2n)'],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })

  describe('type: integer, format: bigint', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer', format: 'bigint' }, 'z.bigint()'],
      [{ type: 'integer', format: 'bigint', minimum: 0, exclusiveMinimum: true }, 'z.bigint().positive()'],
      [{ type: 'integer', format: 'bigint', minimum: 0, exclusiveMinimum: false }, 'z.bigint().nonnegative()'],
      [{ type: 'integer', format: 'bigint', maximum: 0, exclusiveMaximum: true }, 'z.bigint().negative()'],
      [{ type: 'integer', format: 'bigint', maximum: 0, exclusiveMaximum: false }, 'z.bigint().nonpositive()'],
      [{ type: 'integer', format: 'bigint', minimum: 100 }, 'z.bigint().min(BigInt(100))'],
      [{ type: 'integer', format: 'bigint', minimum: 100, exclusiveMinimum: true }, 'z.bigint().gt(BigInt(100))'],
      [{ type: 'integer', format: 'bigint', maximum: 100 }, 'z.bigint().max(BigInt(100))'],
      [{ type: 'integer', format: 'bigint', maximum: 100, exclusiveMaximum: true }, 'z.bigint().lt(BigInt(100))'],
      [{ type: 'integer', format: 'bigint', multipleOf: 2 }, 'z.bigint().multipleOf(BigInt(2))'],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'integer', 'x-error-message': 'Must be an integer' },
        'z.int({error:"Must be an integer"})',
      ],
      [
        { type: 'integer', format: 'int32', 'x-error-message': 'Must be int32' },
        'z.int32({error:"Must be int32"})',
      ],
      [
        {
          type: 'integer',
          minimum: 1,
          maximum: 999,
          'x-minimum-message': 'Min 1',
          'x-maximum-message': 'Max 999',
        },
        'z.int().min(1,{error:"Min 1"}).max(999,{error:"Max 999"})',
      ],
      [
        {
          type: 'integer',
          multipleOf: 10,
          'x-multipleOf-message': 'Must be a multiple of 10',
        },
        'z.int().multipleOf(10,{error:"Must be a multiple of 10"})',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})
