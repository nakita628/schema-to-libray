import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

// Test run
// pnpm vitest run ./src/generator/valibot/object.test.ts

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'v.object({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'v.object({foo:v.string()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'v.object({foo:v.string(),bar:v.optional(v.number())})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' } },
      },
      'v.partial(v.object({foo:v.string()}))',
    ],
    [
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        required: ['test'],
        additionalProperties: false,
      },
      'v.strictObject({test:v.string()})',
    ],
    [
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        required: ['test'],
        additionalProperties: true,
      },
      'v.looseObject({test:v.string()})',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      'v.record(v.string(),v.string())',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  describe('minProperties / maxProperties', () => {
    it('emits v.pipe with v.check for minProperties', () => {
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
      ).toBe('v.pipe(v.object({a:v.string()}),v.check((o)=>Object.keys(o).length>=2))')
    })

    it('emits both with x-minimum-message / x-maximum-message', () => {
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
        'v.pipe(v.object({a:v.string()}),v.check((o)=>Object.keys(o).length>=1,"too few"),v.check((o)=>Object.keys(o).length<=3,"too many"))',
      )
    })
  })

  describe('propertyNames', () => {
    it('emits pattern-based check', () => {
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
        'v.pipe(v.object({a:v.string()}),v.check((o)=>Object.keys(o).every((k)=>new RegExp("^[a-z]+$").test(k))))',
      )
    })

    it('emits enum-based check', () => {
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
        'v.pipe(v.object({a:v.string()}),v.check((o)=>Object.keys(o).every((k)=>["a","b","c"].includes(k))))',
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
        'v.pipe(v.object({a:v.string()}),v.check((o)=>Object.keys(o).every((k)=>new RegExp("^[a-z]+$").test(k)),"lowercase only"))',
      )
    })
  })

  describe('patternProperties', () => {
    it('emits per-pattern v.check', () => {
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
        'v.pipe(v.object({a:v.string()}),v.check((o)=>Object.entries(o).every(([k,val])=>!new RegExp("^x-").test(k)||v.safeParse(v.string(),val).success)))',
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
        'v.pipe(v.record(v.string(),v.string()),v.check((o)=>Object.entries(o).every(([k,val])=>!new RegExp("^id_").test(k)||v.safeParse(v.number(),val).success)))',
      )
    })
  })

  describe('dependentRequired', () => {
    it('emits v.check per key', () => {
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
        "v.pipe(v.object({card:v.string(),billing:v.optional(v.string())}),v.check((o)=>!('card' in o)||('billing' in o)))",
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
        "v.pipe(v.partial(v.object({a:v.string(),b:v.string(),c:v.string()})),v.check((o)=>!('a' in o)||('b' in o&&'c' in o),\"a needs b and c\"))",
      )
    })
  })
})
