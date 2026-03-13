import { describe, expect, it } from 'vitest'
import type { JSONSchema } from '../../types/index.js'
import { _enum } from './enum.js'

describe('arktype enum', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ enum: ['A', 'B'] }, `"'A' | 'B'"`],
    [{ enum: ['active'] }, `"'active'"`],
    [{ enum: [1, 2] }, '"1 | 2"'],
    [{ enum: [true, false] }, '"true | false"'],
    [{ enum: [null] }, '"null"'],
  ])('_enum(%o) → %s', (input, expected) => {
    expect(_enum(input)).toBe(expected)
  })

  describe('x-error-message', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          enum: ['red', 'green', 'blue'],
          'x-error-message': 'Invalid color',
        },
        `type("'red' | 'green' | 'blue'").describe("Invalid color")`,
      ],
      [
        {
          enum: ['active'],
          'x-error-message': 'Must be active',
        },
        `type("'active'").describe("Must be active")`,
      ],
      [
        {
          enum: [1, 2],
          'x-error-message': 'Pick a number',
        },
        'type("1 | 2").describe("Pick a number")',
      ],
    ])('_enum(%o) → %s', (input, expected) => {
      expect(_enum(input)).toBe(expected)
    })
  })
})
