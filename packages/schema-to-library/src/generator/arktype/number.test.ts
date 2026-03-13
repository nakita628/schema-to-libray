import { describe, expect, it } from 'vitest'
import type { JSONSchema } from '../../types/index.js'
import { number } from './number.js'

describe('arktype number', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'number' }, '"number"'],
    [{ type: 'number', minimum: 0 }, '"number >= 0"'],
    [{ type: 'number', maximum: 100 }, '"number <= 100"'],
    [{ type: 'number', minimum: 0, maximum: 100 }, '"number >= 0 <= 100"'],
    [{ type: 'number', exclusiveMinimum: 0 }, '"number > 0"'],
    [{ type: 'number', exclusiveMaximum: 100 }, '"number < 100"'],
    [{ type: 'number', multipleOf: 0.5 }, '"number % 0.5"'],
  ])('number(%o) → %s', (input, expected) => {
    expect(number(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'number', 'x-error-message': 'Must be a number' },
        'type("number").describe("Must be a number")',
      ],
      [
        {
          type: 'number',
          minimum: 0,
          maximum: 100,
          'x-error-message': 'Must be 0-100',
        },
        'type("number >= 0 <= 100").describe("Must be 0-100")',
      ],
      [
        {
          type: 'number',
          multipleOf: 5,
          'x-error-message': 'Multiple of 5',
        },
        'type("number % 5").describe("Multiple of 5")',
      ],
      [
        {
          type: 'number',
          exclusiveMinimum: 0,
          'x-error-message': 'Must be positive',
        },
        'type("number > 0").describe("Must be positive")',
      ],
    ])('number(%o) → %s', (input, expected) => {
      expect(number(input)).toBe(expected)
    })
  })
})
