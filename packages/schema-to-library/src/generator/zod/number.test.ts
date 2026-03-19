import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../helper/index.js'
import { number } from './number.js'

// Test run
// pnpm vitest run ./src/zod/number.test.ts

describe('number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, 'z.number()'],
    [{ type: 'number', minimum: 0, exclusiveMinimum: true }, 'z.number().positive()'],
    [{ type: 'number', minimum: 0, exclusiveMinimum: false }, 'z.number().nonnegative()'],
    [{ type: 'number', maximum: 0, exclusiveMaximum: true }, 'z.number().negative()'],
    [{ type: 'number', maximum: 0, exclusiveMaximum: false }, 'z.number().nonpositive()'],
    [{ type: 'number', minimum: 100 }, 'z.number().min(100)'],
    [{ type: 'number', minimum: 0 }, 'z.number().min(0)'],
    [{ type: 'number', minimum: 100, exclusiveMinimum: true }, 'z.number().gt(100)'],
    [{ type: 'number', maximum: 100 }, 'z.number().max(100)'],
    [{ type: 'number', maximum: 0 }, 'z.number().max(0)'],
    [{ type: 'number', maximum: 100, exclusiveMaximum: true }, 'z.number().lt(100)'],
    [{ type: 'number', exclusiveMinimum: 50 }, 'z.number().gt(50)'],
    [{ type: 'number', exclusiveMaximum: 50 }, 'z.number().lt(50)'],
    [{ type: 'number', multipleOf: 2 }, 'z.number().multipleOf(2)'],
    [{ type: 'number', format: 'float' }, 'z.float32()'],
    [{ type: 'number', format: 'float32' }, 'z.float32()'],
    [{ type: 'number', format: 'float64' }, 'z.float64()'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'number', 'x-error-message': 'Must be a number' },
        'z.number({error:"Must be a number"})',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          maximum: 100,
          'x-minimum-message': 'Cannot be negative',
          'x-maximum-message': 'Cannot exceed 100',
        },
        'z.number().min(0,{error:"Cannot be negative"}).max(100,{error:"Cannot exceed 100"})',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true,
          'x-minimum-message': 'Must be positive',
        },
        'z.number().positive({error:"Must be positive"})',
      ],
      [
        {
          type: 'number',
          multipleOf: 5,
          'x-multipleOf-message': 'Must be a multiple of 5',
        },
        'z.number().multipleOf(5,{error:"Must be a multiple of 5"})',
      ],
      [
        {
          type: 'number',
          format: 'float32',
          'x-error-message': 'Must be a float',
        },
        'z.float32({error:"Must be a float"})',
      ],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })
})
