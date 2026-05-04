import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { integer } from './integer.js'

describe('effect integer', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'integer' }, 'Schema.Number.pipe(Schema.int())'],
    [
      { type: 'integer', minimum: 0 },
      'Schema.Number.pipe(Schema.int(),Schema.greaterThanOrEqualTo(0))',
    ],
    [
      { type: 'integer', maximum: 100 },
      'Schema.Number.pipe(Schema.int(),Schema.lessThanOrEqualTo(100))',
    ],
    [
      { type: 'integer', minimum: 0, maximum: 100 },
      'Schema.Number.pipe(Schema.int(),Schema.greaterThanOrEqualTo(0),Schema.lessThanOrEqualTo(100))',
    ],
    [{ type: 'integer', multipleOf: 2 }, 'Schema.Number.pipe(Schema.int(),Schema.multipleOf(2))'],
    [{ type: 'integer', format: 'bigint' }, 'Schema.BigIntFromSelf'],
    [
      { type: 'integer', format: 'bigint', minimum: 0 },
      'Schema.BigIntFromSelf.pipe(Schema.greaterThanOrEqualToBigInt(BigInt(0)))',
    ],
    [
      { type: 'integer', exclusiveMinimum: 0 },
      'Schema.Number.pipe(Schema.int(),Schema.greaterThan(0))',
    ],
    [
      { type: 'integer', exclusiveMaximum: 100 },
      'Schema.Number.pipe(Schema.int(),Schema.lessThan(100))',
    ],
  ])('integer(%o) → %s', (input, expected) => {
    expect(integer(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'integer', 'x-error-message': 'Must be integer' },
        'Schema.Number.pipe(Schema.int({message:()=>"Must be integer"}))',
      ],
      [
        {
          type: 'integer',
          minimum: 0,
          'x-minimum-message': 'Must be non-negative',
        },
        'Schema.Number.pipe(Schema.int(),Schema.greaterThanOrEqualTo(0,{message:()=>"Must be non-negative"}))',
      ],
      [
        {
          type: 'integer',
          maximum: 100,
          'x-maximum-message': 'Must be at most 100',
        },
        'Schema.Number.pipe(Schema.int(),Schema.lessThanOrEqualTo(100,{message:()=>"Must be at most 100"}))',
      ],
      [
        {
          type: 'integer',
          multipleOf: 5,
          'x-multipleOf-message': 'Must be a multiple of 5',
        },
        'Schema.Number.pipe(Schema.int(),Schema.multipleOf(5,{message:()=>"Must be a multiple of 5"}))',
      ],
      [
        {
          type: 'integer',
          format: 'bigint',
          minimum: 0,
          'x-error-message': 'Must be bigint',
          'x-minimum-message': 'Must be non-negative',
        },
        'Schema.BigIntFromSelf.pipe(Schema.greaterThanOrEqualToBigInt(BigInt(0),{message:()=>"Must be non-negative"})).annotations({message:()=>"Must be bigint"})',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})
