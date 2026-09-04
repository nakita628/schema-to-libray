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
      'z.object({foo:z.string(),bar:z.number().exactOptional()})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' } },
      },
      'z.object({foo:z.string().exactOptional()})',
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
      ).toBe('z.object({a:z.string()}).refine((val)=>Object.keys(val).length>=2)')
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
      ).toBe('z.object({a:z.string()}).refine((val)=>Object.keys(val).length<=5)')
    })

    it('emits both with x-minProperties-message / x-maxProperties-message', () => {
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
        'z.object({a:z.string()}).refine((val)=>Object.keys(val).length>=1,{error:"too few"}).refine((val)=>Object.keys(val).length<=3,{error:"too many"})',
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
        'z.object({a:z.string()}).refine((val)=>Object.keys(val).every((key)=>new RegExp("^[a-z]+$").test(key)))',
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
        'z.object({a:z.string()}).refine((val)=>Object.keys(val).every((key)=>["a","b","c"].includes(key)))',
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
        'z.object({a:z.string()}).refine((val)=>Object.keys(val).every((key)=>new RegExp("^[a-z]+$").test(key)),{error:"lowercase only"})',
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
        'z.object({a:z.string()}).refine((val)=>Object.entries(val).every(([key,value])=>!new RegExp("^x-").test(key)||z.string().safeParse(value).success))',
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
        'z.record(z.string(),z.string()).refine((val)=>Object.entries(val).every(([key,value])=>!new RegExp("^id_").test(key)||z.number().safeParse(value).success))',
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
        "z.object({card:z.string(),billing:z.string().exactOptional()}).refine((val)=>!('card' in val)||('billing' in val))",
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
        "z.object({a:z.string().exactOptional(),b:z.string().exactOptional(),c:z.string().exactOptional()}).refine((val)=>!('a' in val)||('b' in val&&'c' in val),{error:\"a needs b and c\"})",
      )
    })
  })

  describe('x-properties-message', () => {
    it('wraps object with a check that rewrites property-level messages', () => {
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
      ).toBe(
        '(()=>{const Schema=z.object({a:z.string()});return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){if(issue.path.length>0){ctx.issues.push({...issue,message:"bad props"})}else{ctx.issues.push(issue)}}}}).pipe(Schema)})()',
      )
    })

    it('accepts arrow expression message', () => {
      expect(
        object(
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            required: ['a'],
            'x-properties-message': '(issue) => `bad ${issue.path[0]}`',
          },
          'Schema',
          false,
        ),
      ).toBe(
        '(()=>{const Schema=z.object({a:z.string()});return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){if(issue.path.length>0){ctx.issues.push({...issue,message:((issue) => `bad ${issue.path[0]}`)(issue)})}else{ctx.issues.push(issue)}}}}).pipe(Schema)})()',
      )
    })

    it('composes with refines for minProperties / maxProperties', () => {
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
      ).toBe(
        '(()=>{const Schema=z.object({a:z.string()});return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){if(issue.path.length>0){ctx.issues.push({...issue,message:"bad props"})}else{ctx.issues.push(issue)}}}}).pipe(Schema)})().refine((val)=>Object.keys(val).length>=1)',
      )
    })
  })

  // Note: `.readonly()` is appended by the dispatcher (`zod.ts:readonly`),
  // not by `object()`. End-to-end readonly behavior is covered by zod.test.ts /
  // index.test.ts.
})
