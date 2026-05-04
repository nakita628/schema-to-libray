import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

// Test run
// pnpm vitest run ./src/zod/object.test.ts

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'z.object({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'z.object({foo:z.string()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'z.object({foo:z.string(),bar:z.number().optional()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' } },
      },
      'z.object({foo:z.string()}).partial()',
    ],
    [
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        required: ['test'],
        additionalProperties: false,
      },
      'z.strictObject({test:z.string()})',
    ],
    [
      {
        type: 'object',
        properties: { test: { type: 'string' } },
        required: ['test'],
        additionalProperties: true,
      },
      'z.looseObject({test:z.string()})',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      'z.record(z.string(),z.string())',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  describe('minProperties / maxProperties', () => {
    it('emits .refine for minProperties', () => {
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
      ).toBe('z.object({a:z.string()}).refine((o)=>Object.keys(o).length>=2)')
    })

    it('emits .refine for maxProperties', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            maxProperties: 5,
          },
          'Schema',
          false,
        ),
      ).toBe('z.object({a:z.string()}).refine((o)=>Object.keys(o).length<=5)')
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
        'z.object({a:z.string()}).refine((o)=>Object.keys(o).length>=1,{error:"too few"}).refine((o)=>Object.keys(o).length<=3,{error:"too many"})',
      )
    })
  })

  describe('propertyNames', () => {
    it('emits pattern-based refine', () => {
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
        'z.object({a:z.string()}).refine((o)=>Object.keys(o).every((k)=>new RegExp("^[a-z]+$").test(k)))',
      )
    })

    it('emits enum-based refine', () => {
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
        'z.object({a:z.string()}).refine((o)=>Object.keys(o).every((k)=>["a","b","c"].includes(k)))',
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
        'z.object({a:z.string()}).refine((o)=>Object.keys(o).every((k)=>new RegExp("^[a-z]+$").test(k)),{error:"lowercase only"})',
      )
    })
  })

  describe('patternProperties', () => {
    it('emits per-pattern refine', () => {
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
        'z.object({a:z.string()}).refine((o)=>Object.entries(o).every(([k,v])=>!new RegExp("^x-").test(k)||z.string().safeParse(v).success))',
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
        'z.record(z.string(),z.string()).refine((o)=>Object.entries(o).every(([k,v])=>!new RegExp("^id_").test(k)||z.number().safeParse(v).success))',
      )
    })
  })

  describe('dependentRequired', () => {
    it('emits .refine per key', () => {
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
        "z.object({card:z.string(),billing:z.string().optional()}).refine((o)=>!('card' in o)||('billing' in o))",
      )
    })

    it('combines multiple dependent keys', () => {
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
        "z.object({a:z.string(),b:z.string(),c:z.string()}).partial().refine((o)=>!('a' in o)||('b' in o&&'c' in o),{error:\"a needs b and c\"})",
      )
    })
  })

  // Note: `.readonly()` is appended by the dispatcher (`zod.ts:readonly`),
  // not by `object()`. End-to-end readonly behavior is covered by zod.test.ts /
  // index.test.ts.
})
