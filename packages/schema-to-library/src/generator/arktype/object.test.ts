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
            'x-minProperties-message': 'too few',
            'x-maxProperties-message': 'too many',
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

  describe('x-properties-message', () => {
    it('attaches .describe to the object type', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            'x-properties-message': 'bad props',
          },
          'Schema',
          false,
        ),
      ).toBe('type({a:"string"}).describe("bad props")')
    })

    it('composes with narrows from minProperties', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            minProperties: 1,
            'x-properties-message': 'bad props',
          },
          'Schema',
          false,
        ),
      ).toBe('type({a:"string"}).narrow((o) => Object.keys(o).length >= 1).describe("bad props")')
    })
  })
})

describe('object dependent / unevaluated / conditional keywords', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      {
        type: 'object',
        properties: { a: { type: 'string' }, b: { type: 'string' } },
        dependentRequired: { a: ['b'] },
      },
      `type({"a?":"string","b?":"string"}).narrow((o) => !('a' in o) || ('b' in o))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' }, b: { type: 'string' } },
        dependentRequired: { a: ['b'] },
        'x-dependentRequired-message': 'need b',
      },
      `type({"a?":"string","b?":"string"}).narrow((o, ctx) => !('a' in o) || ('b' in o) || ctx.mustBe("need b"))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        dependentSchemas: { a: { properties: { b: { type: 'number' } }, required: ['b'] } },
      },
      `type({"a?":"string"}).narrow((o) => !('a' in o) || type({b:"number"}).allows(o))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        additionalProperties: false,
        'x-additionalProperties-message': 'no extras',
      },
      'type({"a?":"string","+":"reject"}).narrow((o, ctx) => Object.keys(o).every((k) => ["a"].includes(k)) || ctx.mustBe("no extras"))',
    ],
    [
      { type: 'object', properties: { a: { type: 'string' } }, additionalProperties: false },
      'type({"a?":"string","+":"reject"})',
    ],
    [
      { type: 'object', properties: { a: { type: 'string' } }, unevaluatedProperties: false },
      'type({"a?":"string"}).narrow((o) => Object.keys(o).every((k) => ["a"].includes(k)))',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        unevaluatedProperties: { type: 'string' },
      },
      'type({"a?":"string"}).narrow((o) => Object.entries(o).filter(([k]) => !["a"].includes(k)).every(([,val]) => type("string").allows(val)))',
    ],
    [
      { type: 'object', properties: { a: { type: 'string' } }, unevaluatedProperties: true },
      'type({"a?":"string"})',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        if: { properties: { a: { const: 'x' } } },
        // eslint-disable-next-line unicorn/no-thenable -- JSON Schema `then` keyword, not a Promise thenable
        then: { required: ['a'] },
      },
      `type({"a?":"string"}).narrow((o) => !type({"a?":"'x'"}).allows(o) || type("unknown").allows(o))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        if: { properties: { a: { const: 'x' } } },
        else: { required: ['a'] },
      },
      `type({"a?":"string"}).narrow((o) => type({"a?":"'x'"}).allows(o) || type("unknown").allows(o))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        if: { properties: { a: { const: 'x' } } },
        // eslint-disable-next-line unicorn/no-thenable -- JSON Schema `then` keyword, not a Promise thenable
        then: { required: ['a'] },
        else: { properties: { a: { type: 'string' } } },
        'x-if-message': 'iff',
      },
      `type({"a?":"string"}).narrow((o, ctx) => !type({"a?":"'x'"}).allows(o) || type("unknown").allows(o) || ctx.mustBe("iff")).narrow((o, ctx) => type({"a?":"'x'"}).allows(o) || type({"a?":"string"}).allows(o) || ctx.mustBe("iff"))`,
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        if: { properties: { a: { const: 'x' } } },
      },
      'type({"a?":"string"})',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        propertyNames: { pattern: '^[a-z]+$' },
      },
      'type({"a?":"string"}).narrow((o) => Object.keys(o).every((k) => new RegExp("^[a-z]+$").test(k)))',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        propertyNames: { enum: ['a', 'b'] },
      },
      'type({"a?":"string"}).narrow((o) => Object.keys(o).every((k) => ["a","b"].includes(k)))',
    ],
    [
      {
        type: 'object',
        properties: { a: { type: 'string' } },
        patternProperties: { '^x-': { type: 'number' } },
      },
      'type({"a?":"string"}).narrow((o) => Object.entries(o).every(([k, val]) => !new RegExp("^x-").test(k) || type("number").allows(val)))',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
        propertyNames: { pattern: '^x' },
      },
      'type({"[string]":"string"}).narrow((o) => Object.keys(o).every((k) => new RegExp("^x").test(k)))',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  it('wraps with .describe for x-properties-message', () => {
    expect(
      object(
        {
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
          'x-properties-message': 'P',
        },
        'Schema',
        false,
      ),
    ).toBe('type({a:"string"}).describe("P")')
  })

  it('wraps bare literal with type() for x-properties-message when isArktype', () => {
    expect(
      object(
        {
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
          'x-properties-message': 'P',
        },
        'Schema',
        true,
      ),
    ).toBe('type({a:"string"}).describe("P")')
  })
})
