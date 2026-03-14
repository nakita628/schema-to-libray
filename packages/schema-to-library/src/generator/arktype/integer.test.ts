import { describe, expect, it } from 'vitest'
import type { JSONSchema } from '../../helper/index.js'
import { integer } from './integer.js'

describe('arktype integer', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'integer' }, '"number.integer"'],
    [{ type: 'integer', minimum: 0 }, '"number.integer >= 0"'],
    [{ type: 'integer', maximum: 100 }, '"number.integer <= 100"'],
    [{ type: 'integer', minimum: 0, maximum: 100 }, '"number.integer >= 0 <= 100"'],
    [{ type: 'integer', exclusiveMinimum: 50 }, '"number.integer > 50"'],
    [{ type: 'integer', exclusiveMaximum: 50 }, '"number.integer < 50"'],
    [{ type: 'integer', multipleOf: 2 }, '"number.integer % 2"'],
    [{ type: 'integer', format: 'bigint' }, '"bigint"'],
  ])('integer(%o) → %s', (input, expected) => {
    expect(integer(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'integer', 'x-error-message': 'Must be integer' },
        'type("number.integer").describe("Must be integer")',
      ],
      [
        {
          type: 'integer',
          minimum: 0,
          maximum: 100,
          'x-error-message': 'Must be 0-100',
        },
        'type("number.integer >= 0 <= 100").describe("Must be 0-100")',
      ],
      [
        {
          type: 'integer',
          format: 'bigint',
          'x-error-message': 'Must be bigint',
        },
        'type("bigint").describe("Must be bigint")',
      ],
      [
        {
          type: 'integer',
          multipleOf: 10,
          'x-error-message': 'Multiple of 10',
        },
        'type("number.integer % 10").describe("Multiple of 10")',
      ],
      [
        {
          type: 'integer',
          exclusiveMinimum: 0,
          'x-error-message': 'Must be positive',
        },
        'type("number.integer > 0").describe("Must be positive")',
      ],
    ])('integer(%o) → %s', (input, expected) => {
      expect(integer(input)).toBe(expected)
    })
  })
})
