import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { object } from './object.js'

// Test run
// pnpm vitest run ./src/generator/effect/object.test.ts

describe('object', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [{ type: 'object' }, 'Schema.Struct({})'],
    [
      { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
      'Schema.Struct({foo:Schema.String})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['foo'],
      },
      'Schema.Struct({foo:Schema.String,bar:Schema.optional(Schema.Number)})',
    ],
    [
      {
        type: 'object',
        properties: { foo: { type: 'string' } },
      },
      'Schema.partial(Schema.Struct({foo:Schema.String}))',
    ],
    [
      {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
      'Schema.Record({key:Schema.String,value:Schema.String})',
    ],
  ])('object(%o) → %s', (input, expected) => {
    expect(object(input, 'Schema', false)).toBe(expected)
  })

  describe('minProperties / maxProperties', () => {
    it('emits .pipe with Schema.filter for minProperties', () => {
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
      ).toBe('Schema.Struct({a:Schema.String}).pipe(Schema.filter((o)=>Object.keys(o).length>=2))')
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
            'x-minProperties-message': 'too few',
            'x-maxProperties-message': 'too many',
          },
          'Schema',
          false,
        ),
      ).toBe(
        'Schema.Struct({a:Schema.String}).pipe(Schema.filter((o)=>Object.keys(o).length>=1,{message:()=>"too few"}),Schema.filter((o)=>Object.keys(o).length<=3,{message:()=>"too many"}))',
      )
    })
  })

  describe('propertyNames', () => {
    it('emits pattern-based filter', () => {
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
        'Schema.Struct({a:Schema.String}).pipe(Schema.filter((o)=>Object.keys(o).every((k)=>new RegExp("^[a-z]+$").test(k))))',
      )
    })

    it('emits enum-based filter', () => {
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
        'Schema.Struct({a:Schema.String}).pipe(Schema.filter((o)=>Object.keys(o).every((k)=>["a","b","c"].includes(k))))',
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
        'Schema.Struct({a:Schema.String}).pipe(Schema.filter((o)=>Object.keys(o).every((k)=>new RegExp("^[a-z]+$").test(k)),{message:()=>"lowercase only"}))',
      )
    })
  })

  describe('patternProperties', () => {
    it('emits per-pattern Schema.filter', () => {
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
        'Schema.Struct({a:Schema.String}).pipe(Schema.filter((o)=>Object.entries(o).every(([k,val])=>!new RegExp("^x-").test(k)||Schema.is(Schema.String)(val))))',
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
        'Schema.Record({key:Schema.String,value:Schema.String}).pipe(Schema.filter((o)=>Object.entries(o).every(([k,val])=>!new RegExp("^id_").test(k)||Schema.is(Schema.Number)(val))))',
      )
    })
  })

  describe('dependentRequired', () => {
    it('emits Schema.filter per key', () => {
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
        "Schema.Struct({card:Schema.String,billing:Schema.optional(Schema.String)}).pipe(Schema.filter((o)=>!('card' in o)||('billing' in o)))",
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
        "Schema.partial(Schema.Struct({a:Schema.String,b:Schema.String,c:Schema.String})).pipe(Schema.filter((o)=>!('a' in o)||('b' in o&&'c' in o),{message:()=>\"a needs b and c\"}))",
      )
    })
  })

  describe('x-properties-message', () => {
    it('wraps struct with transformOrFail that rewrites property-level messages', () => {
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
        'Schema.transformOrFail(Schema.Unknown,Schema.Struct({a:Schema.String}),{decode:(input,_opts,ast)=>{const result=Schema.decodeUnknownEither(Schema.Struct({a:Schema.String}))(input);return Either.isLeft(result)?ParseResult.fail(new ParseResult.Type(ast,input,"bad props")):ParseResult.succeed(result.right)},encode:ParseResult.succeed})',
      )
    })
  })
})
