import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { _enum } from './enum.js'

describe('effect enum', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ enum: ['A', 'B'] }, 'Schema.Literal("A","B")'],
    [{ enum: ['active'] }, 'Schema.Literal("active")'],
    [{ enum: [1, 2], type: 'number' }, 'Schema.Union(Schema.Literal(1),Schema.Literal(2))'],
    [
      { enum: [true, false], type: 'boolean' },
      'Schema.Union(Schema.Literal(true),Schema.Literal(false))',
    ],
    [{ enum: [null] }, 'Schema.Literal(null)'],
    [
      { enum: [[1, 2, 3]], type: 'array' },
      'Schema.Tuple(Schema.Literal(1),Schema.Literal(2),Schema.Literal(3))',
    ],
    [
      { enum: [1, 'a', true] },
      'Schema.Union(Schema.Literal(1),Schema.Literal("a"),Schema.Literal(true))',
    ],
    [
      { enum: ['a', null, 42] },
      'Schema.Union(Schema.Literal("a"),Schema.Literal(null),Schema.Literal(42))',
    ],
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
        'Schema.Literal("red","green","blue").annotations({message:()=>"Invalid color"})',
      ],
      [
        {
          enum: ['active'],
          'x-error-message': 'Must be active',
        },
        'Schema.Literal("active").annotations({message:()=>"Must be active"})',
      ],
      [
        {
          type: 'number',
          enum: [1, 2, 3],
          'x-error-message': 'Invalid number',
        },
        'Schema.Union(Schema.Literal(1),Schema.Literal(2),Schema.Literal(3)).annotations({message:()=>"Invalid number"})',
      ],
    ])('_enum(%o) → %s', (input, expected) => {
      expect(_enum(input)).toBe(expected)
    })
  })

  describe('additional branches', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ enum: [42], type: 'number' }, 'Schema.Literal(42)'],
      [{ enum: [true], type: 'boolean' }, 'Schema.Literal(true)'],
      [
        {
          enum: [
            [1, 2],
            [3, 4],
          ],
          type: 'array',
        },
        'Schema.Union(Schema.Tuple(Schema.Literal(1),Schema.Literal(2)),Schema.Tuple(Schema.Literal(3),Schema.Literal(4)))',
      ],
      [
        {
          enum: ['a', 'b'],
          'x-enum-error-messages': { a: 'is a', b: 'is b' },
        },
        'Schema.Union(Schema.Literal("a"),Schema.Literal("b"))',
      ],
    ])('_enum(%o) → %s', (input, expected) => {
      expect(_enum(input)).toBe(expected)
    })
  })
})
