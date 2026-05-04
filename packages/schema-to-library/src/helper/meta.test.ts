import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../parser/index.js'
import {
  arktypeWrap,
  effectWrap,
  serializeJSValue,
  typeboxMetaOpts,
  typeboxWrap,
  valibotWrap,
  zodWrap,
} from './index.js'

describe('serializeJSValue', () => {
  it.concurrent.each<[unknown, string]>([
    [undefined, 'undefined'],
    [null, 'null'],
    ['hello', '"hello"'],
    [42, '42'],
    [true, 'true'],
    [[1, 2, 3], '[1,2,3]'],
    [{ a: 1, b: 2 }, '{a:1,b:2}'],
    [{ 'with-dash': 1 }, '{"with-dash":1}'],
    [{ a: { b: 'nested' } }, '{a:{b:"nested"}}'],
    [{ a: undefined, b: 1 }, '{b:1}'],
  ])('serializeJSValue(%o) → %s', (input, expected) => {
    expect(serializeJSValue(input)).toBe(expected)
  })
})

describe('zodWrap with metadata', () => {
  it('emits .meta({description}) for description only', () => {
    expect(zodWrap('z.string()', { description: 'an email' })).toBe(
      'z.string().meta({description:"an email"})',
    )
  })

  it('emits .meta() for examples / deprecated / readOnly', () => {
    expect(
      zodWrap('z.number()', {
        examples: [1, 2],
        deprecated: true,
        readOnly: true,
      } satisfies JSONSchema),
    ).toBe('z.number().meta({examples:[1,2],deprecated:true,readOnly:true})')
  })

  it('consolidates description and other meta into a single .meta()', () => {
    expect(
      zodWrap('z.string()', {
        description: 'name',
        examples: ['Alice'],
      } satisfies JSONSchema),
    ).toBe('z.string().meta({description:"name",examples:["Alice"]})')
  })

  it('normalizes singular example into examples array', () => {
    expect(zodWrap('z.string()', { example: 'foo' } satisfies JSONSchema)).toBe(
      'z.string().meta({examples:["foo"]})',
    )
  })

  it('combines default + nullable + brand + meta', () => {
    expect(
      zodWrap('z.string()', {
        default: 'foo',
        nullable: true,
        'x-brand': 'UserId',
        description: 'a branded string',
      } satisfies JSONSchema),
    ).toBe(
      'z.string().default("foo").nullable().brand<"UserId">().meta({description:"a branded string"})',
    )
  })
})

describe('valibotWrap with metadata', () => {
  it('emits v.description in pipe', () => {
    expect(valibotWrap('v.string()', { description: 'name' })).toBe(
      'v.pipe(v.string(),v.description("name"))',
    )
  })

  it('emits v.metadata for non-description fields', () => {
    expect(
      valibotWrap('v.number()', {
        examples: [1, 2],
        deprecated: true,
      } satisfies JSONSchema),
    ).toBe('v.pipe(v.number(),v.metadata({examples:[1,2],deprecated:true}))')
  })

  it('combines description + metadata + brand into one pipe', () => {
    expect(
      valibotWrap('v.string()', {
        description: 'an id',
        examples: ['abc'],
        'x-brand': 'Id',
      } satisfies JSONSchema),
    ).toBe('v.pipe(v.string(),v.description("an id"),v.metadata({examples:["abc"]}),v.brand("Id"))')
  })
})

describe('typeboxMetaOpts', () => {
  it('returns empty array when no metadata fields are present', () => {
    expect(typeboxMetaOpts({ type: 'string' })).toStrictEqual([])
  })

  it('emits description, examples, deprecated, externalDocs, readOnly, writeOnly entries', () => {
    expect(
      typeboxMetaOpts({
        description: 'age',
        examples: [10, 20],
        deprecated: true,
        externalDocs: { url: 'https://ex.com' },
        readOnly: true,
        writeOnly: false,
      } satisfies JSONSchema),
    ).toStrictEqual([
      'description:"age"',
      'examples:[10,20]',
      'deprecated:true',
      'externalDocs:{url:"https://ex.com"}',
      'readOnly:true',
      'writeOnly:false',
    ])
  })

  it('normalizes singular example into examples array', () => {
    expect(typeboxMetaOpts({ example: 'foo' } satisfies JSONSchema)).toStrictEqual([
      'examples:["foo"]',
    ])
  })
})

describe('typeboxWrap (default/nullable only)', () => {
  it('passes through unchanged when no default or nullable', () => {
    expect(typeboxWrap('Type.String()', { description: 'name' })).toBe('Type.String()')
  })

  it('wraps with Type.Optional when default is set', () => {
    expect(typeboxWrap('Type.String()', { default: 'foo' } satisfies JSONSchema)).toBe(
      'Type.Optional(Type.String(),{default:"foo"})',
    )
  })

  it('wraps with Type.Union([..., Type.Null()]) when nullable', () => {
    expect(typeboxWrap('Type.String()', { nullable: true } satisfies JSONSchema)).toBe(
      'Type.Union([Type.String(),Type.Null()])',
    )
  })
})

describe('effectWrap with metadata', () => {
  it('emits .annotations() for description', () => {
    expect(effectWrap('Schema.String', { description: 'a name' })).toBe(
      'Schema.String.annotations({description:"a name"})',
    )
  })

  it('routes non-standard fields under jsonSchema', () => {
    expect(
      effectWrap('Schema.Number', {
        deprecated: true,
        externalDocs: { url: 'https://ex.com' },
        readOnly: true,
      } satisfies JSONSchema),
    ).toBe(
      'Schema.Number.annotations({jsonSchema:{deprecated:true,externalDocs:{url:"https://ex.com"},readOnly:true}})',
    )
  })

  it('uses examples (plural) as Effect annotation', () => {
    expect(effectWrap('Schema.String', { example: 'foo' })).toBe(
      'Schema.String.annotations({examples:["foo"]})',
    )
  })
})

describe('arktypeWrap with metadata', () => {
  it('emits .describe() for description', () => {
    expect(arktypeWrap('type({name:"string"})', { description: 'a user' })).toBe(
      'type({name:"string"}).describe("a user")',
    )
  })

  it('wraps quoted string with type() before .describe()', () => {
    expect(arktypeWrap('"string"', { description: 'a name' })).toBe(
      'type("string").describe("a name")',
    )
  })

  it('does not emit non-description fields (arktype meta requires ArkEnv augmentation)', () => {
    expect(
      arktypeWrap('type({name:"string"})', {
        examples: ['Alice'],
        deprecated: true,
      } satisfies JSONSchema),
    ).toBe('type({name:"string"})')
  })
})
