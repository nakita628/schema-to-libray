import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

// Test run
// pnpm vitest run ./src/generator/arktype/object.test.ts

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'type({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'type({foo:"string"})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'type({foo:"string","bar?":"number"})',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      'type({"[string]":"string"})',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  describe('minProperties / maxProperties', () => {
    it('emits .narrow for minProperties', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            minProperties: 2,
          },
          'Schema',
          false,
        ),
      ).toBe('type({a:"string"}).narrow((o) => Object.keys(o).length >= 2)')
    })

    it('emits both with x-minimum-message / x-maximum-message via ctx.mustBe', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            minProperties: 1,
            maxProperties: 3,
            'x-minimum-message': 'too few',
            'x-maximum-message': 'too many',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'type({a:"string"}).narrow((o, ctx) => Object.keys(o).length >= 1 || ctx.mustBe("too few")).narrow((o, ctx) => Object.keys(o).length <= 3 || ctx.mustBe("too many"))',
      )
    })
  })

  describe('propertyNames', () => {
    it('emits pattern-based narrow', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            propertyNames: { pattern: '^[a-z]+$' },
          },
          'Schema',
          false,
        ),
      ).toBe(
        'type({a:"string"}).narrow((o) => Object.keys(o).every((k) => new RegExp("^[a-z]+$").test(k)))',
      )
    })

    it('emits enum-based narrow', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            propertyNames: { enum: ['a', 'b', 'c'] },
          },
          'Schema',
          false,
        ),
      ).toBe(
        'type({a:"string"}).narrow((o) => Object.keys(o).every((k) => ["a","b","c"].includes(k)))',
      )
    })

    it('uses x-propertyNames-message', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            propertyNames: { pattern: '^[a-z]+$' },
            'x-propertyNames-message': 'lowercase only',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'type({a:"string"}).narrow((o, ctx) => Object.keys(o).every((k) => new RegExp("^[a-z]+$").test(k)) || ctx.mustBe("lowercase only"))',
      )
    })
  })

  describe('patternProperties', () => {
    it('emits per-pattern narrow with .allows()', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            patternProperties: { '^x-': { type: 'string' } },
          },
          'Schema',
          false,
        ),
      ).toBe(
        'type({a:"string"}).narrow((o) => Object.entries(o).every(([k, val]) => !new RegExp("^x-").test(k) || type("string").allows(val)))',
      )
    })

    it('combines with record (additionalProperties: schema)', () => {
      expect(
        object(
          {
            type: 'object',
            additionalProperties: { type: 'string' },
            patternProperties: { '^id_': { type: 'number' } },
          },
          'Schema',
          false,
        ),
      ).toBe(
        'type({"[string]":"string"}).narrow((o) => Object.entries(o).every(([k, val]) => !new RegExp("^id_").test(k) || type("number").allows(val)))',
      )
    })
  })

  describe('dependentRequired', () => {
    it('emits narrow per key', () => {
      expect(
        object(
          {
            type: 'object',
            properties: {
              card: { type: 'string' },
              billing: { type: 'string' },
            },
            required: ['card'],
            dependentRequired: { card: ['billing'] },
          },
          'Schema',
          false,
        ),
      ).toBe(
        'type({card:"string","billing?":"string"}).narrow((o) => !(\'card\' in o) || (\'billing\' in o))',
      )
    })

    it('combines multiple dependent keys with x-dependentRequired-message', () => {
      expect(
        object(
          {
            type: 'object',
            properties: {
              a: { type: 'string' },
              b: { type: 'string' },
              c: { type: 'string' },
            },
            dependentRequired: { a: ['b', 'c'] },
            'x-dependentRequired-message': 'a needs b and c',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'type({"a?":"string","b?":"string","c?":"string"}).narrow((o, ctx) => !(\'a\' in o) || (\'b\' in o && \'c\' in o) || ctx.mustBe("a needs b and c"))',
      )
    })
  })
})
