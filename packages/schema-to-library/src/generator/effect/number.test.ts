import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../helper/index.js'
import { number } from './number.js'

describe('effect number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, 'Schema.Number'],
    [{ type: 'number', minimum: 0 }, 'Schema.Number.pipe(Schema.greaterThanOrEqualTo(0))'],
    [{ type: 'number', maximum: 100 }, 'Schema.Number.pipe(Schema.lessThanOrEqualTo(100))'],
    [
      { type: 'number', minimum: 0, maximum: 100 },
      'Schema.Number.pipe(Schema.greaterThanOrEqualTo(0),Schema.lessThanOrEqualTo(100))',
    ],
    [{ type: 'number', multipleOf: 0.5 }, 'Schema.Number.pipe(Schema.multipleOf(0.5))'],
    [{ type: 'number', exclusiveMinimum: 0 }, 'Schema.Number.pipe(Schema.greaterThan(0))'],
    [{ type: 'number', exclusiveMaximum: 100 }, 'Schema.Number.pipe(Schema.lessThan(100))'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'number', 'x-error-message': 'Must be a number' },
        'Schema.Number.annotations({message:()=>"Must be a number"})',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          'x-minimum-message': 'Must be non-negative',
        },
        'Schema.Number.pipe(Schema.greaterThanOrEqualTo(0,{message:()=>"Must be non-negative"}))',
      ],
      [
        {
          type: 'number',
          maximum: 100,
          'x-maximum-message': 'Must be at most 100',
        },
        'Schema.Number.pipe(Schema.lessThanOrEqualTo(100,{message:()=>"Must be at most 100"}))',
      ],
      [
        {
          type: 'number',
          multipleOf: 0.5,
          'x-multipleOf-message': 'Must be a multiple of 0.5',
        },
        'Schema.Number.pipe(Schema.multipleOf(0.5,{message:()=>"Must be a multiple of 0.5"}))',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          maximum: 100,
          'x-error-message': 'Invalid number',
          'x-minimum-message': 'Too small',
          'x-maximum-message': 'Too large',
        },
        'Schema.Number.pipe(Schema.greaterThanOrEqualTo(0,{message:()=>"Too small"}),Schema.lessThanOrEqualTo(100,{message:()=>"Too large"})).annotations({message:()=>"Invalid number"})',
      ],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })
})
