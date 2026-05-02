import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { _enum } from './enum.js'

describe('valibot enum', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ enum: ['A', 'B'] }, 'v.picklist(["A","B"])'],
    [{ enum: ['active'] }, "v.literal('active')"],
    [{ enum: [1, 2], type: 'number' }, 'v.union([v.literal(1),v.literal(2)])'],
    [{ enum: [true, false], type: 'boolean' }, 'v.union([v.literal(true),v.literal(false)])'],
    [{ enum: [null] }, 'v.literal(null)'],
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
        'v.picklist(["red","green","blue"],"Invalid color")',
      ],
      [
        {
          enum: ['active'],
          'x-error-message': 'Must be active',
        },
        'v.literal(\'active\',"Must be active")',
      ],
      [
        {
          type: 'number',
          enum: [1, 2, 3],
          'x-error-message': 'Invalid number',
        },
        'v.union([v.literal(1,"Invalid number"),v.literal(2,"Invalid number"),v.literal(3,"Invalid number")],"Invalid number")',
      ],
      [
        {
          enum: ['red', 'green', 'blue'],
          'x-enum-error-messages': {
            red: 'Red is not allowed',
            green: 'Green is not allowed',
          },
        },
        "v.union([v.literal('red',\"Red is not allowed\"),v.literal('green',\"Green is not allowed\"),v.literal('blue')])",
      ],
    ])('_enum(%o) → %s', (input, expected) => {
      expect(_enum(input)).toBe(expected)
    })
  })
})
