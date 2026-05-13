import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { effect } from './effect.js'

// Test run
// pnpm vitest run ./src/generator/effect/effect.test.ts

describe('effect', () => {
  describe('ref', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/Test' }, 'TestSchema'],
      [{ $ref: '#/definitions/Test' }, 'TestSchema'],
      [
        {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Test',
          },
        },
        'Schema.Array(TestSchema)',
      ],
      [
        { $ref: '#/components/schemas/Test', nullable: true },
        'Schema.NullOr(Schema.NullOr(TestSchema))',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })

    describe('isEffect=true', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/Test' }, 'Schema.suspend(() => Test)'],
        [{ $ref: '#/definitions/Test' }, 'Schema.suspend(() => Test)'],
      ])('effect(%o, "Schema", true) → %s', (input, expected) => {
        expect(effect(input, 'Schema', true)).toBe(expected)
      })
    })

    describe('self-referencing', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/Tree' }, 'Schema.suspend(() => Tree)'],
      ])('effect(%o, "Tree") → %s', (input, expected) => {
        expect(effect(input, 'Tree')).toBe(expected)
      })
    })
  })

  describe('oneOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          type: 'object',
          oneOf: [
            {
              properties: { kind: { const: 'A' } },
              required: ['kind'],
            },
            {
              properties: { kind: { const: 'B' } },
              required: ['kind'],
            },
          ],
          nullable: true,
        },
        'Schema.NullOr(Schema.Union(Schema.Struct({kind:Schema.Literal("A")}),Schema.Struct({kind:Schema.Literal("B")})))',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'Schema.Union(ASchema,BSchema)',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          nullable: true,
        },
        'Schema.NullOr(Schema.Union(ASchema,BSchema))',
      ],
      [
        {
          type: ['object', 'null'],
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'Schema.NullOr(Schema.Union(ASchema,BSchema))',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('anyOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          type: 'object',
          anyOf: [
            {
              properties: { kind: { const: 'A' } },
              required: ['kind'],
            },
            {
              properties: { kind: { const: 'B' } },
              required: ['kind'],
            },
          ],
          nullable: true,
        },
        'Schema.NullOr(Schema.Union(Schema.Struct({kind:Schema.Literal("A")}),Schema.Struct({kind:Schema.Literal("B")})))',
      ],
      [
        {
          type: 'object',
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'Schema.Union(ASchema,BSchema)',
      ],
      [
        {
          type: 'object',
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          nullable: true,
        },
        'Schema.NullOr(Schema.Union(ASchema,BSchema))',
      ],
      [
        {
          type: ['object', 'null'],
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'Schema.NullOr(Schema.Union(ASchema,BSchema))',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('allOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: {
                a: { type: 'string' },
              },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                b: { type: 'string' },
              },
            },
          ],
        },
        'Schema.extend(Schema.Struct({a:Schema.String}),Schema.Struct({b:Schema.String}))',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: {
                a: { type: 'string' },
              },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                b: { type: 'string' },
              },
            },
          ],
          nullable: true,
        },
        'Schema.NullOr(Schema.extend(Schema.Struct({a:Schema.String}),Schema.Struct({b:Schema.String})))',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: {
                a: { type: 'string' },
              },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                b: { type: 'string' },
              },
            },
          ],
          type: ['null'],
        },
        'Schema.NullOr(Schema.extend(Schema.Struct({a:Schema.String}),Schema.Struct({b:Schema.String})))',
      ],
      [
        {
          allOf: [
            { $ref: '#/components/schemas/GeoJsonObject' },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'Point',
                    'MultiPoint',
                    'LineString',
                    'MultiLineString',
                    'Polygon',
                    'MultiPolygon',
                    'GeometryCollection',
                  ],
                },
              },
              required: ['type'],
            },
          ],
        },
        'Schema.extend(GeoJsonObjectSchema,Schema.Struct({type:Schema.Literal("Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon","GeometryCollection")}))',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: { a: { type: 'string' } },
            },
            { default: 'hello' },
          ],
        },
        'Schema.optionalWith(Schema.Struct({a:Schema.String}),{default:() => "hello"})',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('not', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { not: { type: 'string' } },
        "Schema.Unknown.pipe(Schema.filter((v) => typeof v !== 'string'))",
      ],
      [
        { not: { type: 'integer' } },
        "Schema.Unknown.pipe(Schema.filter((v) => typeof v !== 'number' || !Number.isInteger(v)))",
      ],
      [
        { not: { type: 'boolean' } },
        "Schema.Unknown.pipe(Schema.filter((v) => typeof v !== 'boolean'))",
      ],
      [
        { not: { type: 'string' }, nullable: true },
        "Schema.NullOr(Schema.Unknown.pipe(Schema.filter((v) => typeof v !== 'string')))",
      ],
      [
        { not: { type: 'string' }, type: ['null'] } as JSONSchema,
        "Schema.NullOr(Schema.Unknown.pipe(Schema.filter((v) => typeof v !== 'string')))",
      ],
      [{ not: { const: 42 } }, 'Schema.Unknown.pipe(Schema.filter((v) => v !== 42))'],
      [
        { not: { enum: ['a', 'b'] } },
        'Schema.Unknown.pipe(Schema.filter((v) => !["a","b"].includes(v)))',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('const', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ const: 'fixed' }, 'Schema.Literal("fixed")'],
      [{ const: 'fixed', nullable: true }, 'Schema.NullOr(Schema.Literal("fixed"))'],
      [{ type: ['null'], const: 'fixed' }, 'Schema.NullOr(Schema.Literal("fixed"))'],
      [{ const: 42 }, 'Schema.Literal(42)'],
      [{ const: true }, 'Schema.Literal(true)'],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('enum', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ enum: ['A', 'B'] }, 'Schema.Literal("A","B")'],
      [
        { enum: ['A', 'B'], type: ['string'], nullable: true },
        'Schema.NullOr(Schema.Literal("A","B"))',
      ],
      [{ enum: ['A', 'B'], type: ['string', 'null'] }, 'Schema.NullOr(Schema.Literal("A","B"))'],
      [{ enum: [1, 2] }, 'Schema.Union(Schema.Literal(1),Schema.Literal(2))'],
      [
        { enum: [1, 2], type: ['number'], nullable: true },
        'Schema.NullOr(Schema.Union(Schema.Literal(1),Schema.Literal(2)))',
      ],
      [
        { enum: [1, 2], type: ['number', 'null'] },
        'Schema.NullOr(Schema.Union(Schema.Literal(1),Schema.Literal(2)))',
      ],
      [{ enum: [true, false] }, 'Schema.Union(Schema.Literal(true),Schema.Literal(false))'],
      [
        { enum: [true, false], type: ['boolean'], nullable: true },
        'Schema.NullOr(Schema.Union(Schema.Literal(true),Schema.Literal(false)))',
      ],
      [
        { enum: [true, false], type: ['boolean', 'null'] },
        'Schema.NullOr(Schema.Union(Schema.Literal(true),Schema.Literal(false)))',
      ],
      [{ enum: [null] }, 'Schema.Literal(null)'],
      [{ enum: [null], type: ['null'] }, 'Schema.NullOr(Schema.Literal(null))'],
      [{ enum: ['abc'] }, 'Schema.Literal("abc")'],
      [{ enum: ['abc'], type: ['string'], nullable: true }, 'Schema.NullOr(Schema.Literal("abc"))'],
      [{ enum: ['abc'], type: ['string', 'null'] }, 'Schema.NullOr(Schema.Literal("abc"))'],
      [{ type: 'array', enum: [[1, 2]] }, 'Schema.Tuple(Schema.Literal(1),Schema.Literal(2))'],
      [
        { type: 'array', nullable: true, enum: [[1, 2]] },
        'Schema.NullOr(Schema.Tuple(Schema.Literal(1),Schema.Literal(2)))',
      ],
      [
        { type: ['array', 'null'], enum: [[1, 2]] },
        'Schema.NullOr(Schema.Tuple(Schema.Literal(1),Schema.Literal(2)))',
      ],
      [
        {
          type: 'array',
          enum: [
            [1, 2],
            [3, 4],
          ],
        },
        'Schema.Union(Schema.Tuple(Schema.Literal(1),Schema.Literal(2)),Schema.Tuple(Schema.Literal(3),Schema.Literal(4)))',
      ],
      [
        {
          type: 'array',
          nullable: true,
          enum: [
            [1, 2],
            [3, 4],
          ],
        },
        'Schema.NullOr(Schema.Union(Schema.Tuple(Schema.Literal(1),Schema.Literal(2)),Schema.Tuple(Schema.Literal(3),Schema.Literal(4))))',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('string', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string' }, 'Schema.String'],
      [{ type: ['string'], nullable: true }, 'Schema.NullOr(Schema.String)'],
      [{ type: ['string', 'null'] }, 'Schema.NullOr(Schema.String)'],
      [{ type: 'string', minLength: 1 }, 'Schema.String.pipe(Schema.minLength(1))'],
      [{ type: 'string', maxLength: 10 }, 'Schema.String.pipe(Schema.maxLength(10))'],
      [
        { type: 'string', minLength: 1, maxLength: 10 },
        'Schema.String.pipe(Schema.minLength(1),Schema.maxLength(10))',
      ],
      [{ type: 'string', minLength: 5, maxLength: 5 }, 'Schema.String.pipe(Schema.length(5))'],
      [{ type: 'string', pattern: '^\\w+$' }, 'Schema.String.pipe(Schema.pattern(/^\\w+$/))'],
      [
        { type: 'string', default: 'test' },
        'Schema.optionalWith(Schema.String,{default:() => "test"})',
      ],
      [
        { type: 'string', default: 'test', nullable: true },
        'Schema.optionalWith(Schema.NullOr(Schema.String),{default:() => "test"})',
      ],
      [
        { type: ['string', 'null'], default: 'test' },
        'Schema.optionalWith(Schema.NullOr(Schema.String),{default:() => "test"})',
      ],
      [
        { type: 'string', format: 'email' },
        'Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/))',
      ],
      [{ type: 'string', format: 'uuid' }, 'Schema.UUID'],
      [{ type: 'string', format: 'ulid' }, 'Schema.ULID'],
      [{ type: 'string', format: 'uri' }, 'Schema.String.pipe(Schema.pattern(/^https?:\\/\\//))'],
      [
        { type: 'string', format: 'ipv4' },
        'Schema.String.pipe(Schema.pattern(/^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$/))',
      ],
      [
        { type: 'string', format: 'ipv6' },
        'Schema.String.pipe(Schema.pattern(/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/))',
      ],
      [
        { type: 'string', format: 'date-time' },
        'Schema.String.pipe(Schema.pattern(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/))',
      ],
      [
        { type: 'string', format: 'date' },
        'Schema.String.pipe(Schema.pattern(/^\\d{4}-\\d{2}-\\d{2}$/))',
      ],
      [
        { type: 'string', format: 'time' },
        'Schema.String.pipe(Schema.pattern(/^\\d{2}:\\d{2}:\\d{2}/))',
      ],
      [{ type: 'string', format: 'uuid', nullable: true }, 'Schema.NullOr(Schema.UUID)'],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('number', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'number' }, 'Schema.Number'],
      [{ type: ['number'], nullable: true }, 'Schema.NullOr(Schema.Number)'],
      [{ type: ['number', 'null'] }, 'Schema.NullOr(Schema.Number)'],
      [{ type: 'number', minimum: 0 }, 'Schema.Number.pipe(Schema.greaterThanOrEqualTo(0))'],
      [{ type: 'number', minimum: 100 }, 'Schema.Number.pipe(Schema.greaterThanOrEqualTo(100))'],
      [{ type: 'number', maximum: 100 }, 'Schema.Number.pipe(Schema.lessThanOrEqualTo(100))'],
      [{ type: 'number', maximum: 0 }, 'Schema.Number.pipe(Schema.lessThanOrEqualTo(0))'],
      [{ type: 'number', multipleOf: 2 }, 'Schema.Number.pipe(Schema.multipleOf(2))'],
      [
        { type: 'number', minimum: 0, maximum: 100 },
        'Schema.Number.pipe(Schema.greaterThanOrEqualTo(0),Schema.lessThanOrEqualTo(100))',
      ],
      [{ type: 'number', default: 100 }, 'Schema.optionalWith(Schema.Number,{default:() => 100})'],
      [
        { type: 'number', default: 100, nullable: true },
        'Schema.optionalWith(Schema.NullOr(Schema.Number),{default:() => 100})',
      ],
      [
        { type: ['number', 'null'], default: 100 },
        'Schema.optionalWith(Schema.NullOr(Schema.Number),{default:() => 100})',
      ],
      [{ type: 'number', exclusiveMinimum: 5 }, 'Schema.Number.pipe(Schema.greaterThan(5))'],
      [{ type: 'number', exclusiveMaximum: 10 }, 'Schema.Number.pipe(Schema.lessThan(10))'],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('integer', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer' }, 'Schema.Number.pipe(Schema.int())'],
      [{ type: ['integer'], nullable: true }, 'Schema.NullOr(Schema.Number.pipe(Schema.int()))'],
      [{ type: ['integer', 'null'] }, 'Schema.NullOr(Schema.Number.pipe(Schema.int()))'],
      [
        { type: 'integer', minimum: 0 },
        'Schema.Number.pipe(Schema.int(),Schema.greaterThanOrEqualTo(0))',
      ],
      [
        { type: 'integer', minimum: 100 },
        'Schema.Number.pipe(Schema.int(),Schema.greaterThanOrEqualTo(100))',
      ],
      [
        { type: 'integer', maximum: 100 },
        'Schema.Number.pipe(Schema.int(),Schema.lessThanOrEqualTo(100))',
      ],
      [
        { type: 'integer', maximum: 0 },
        'Schema.Number.pipe(Schema.int(),Schema.lessThanOrEqualTo(0))',
      ],
      [{ type: 'integer', multipleOf: 2 }, 'Schema.Number.pipe(Schema.int(),Schema.multipleOf(2))'],
      [
        { type: 'integer', default: 100 },
        'Schema.optionalWith(Schema.Number.pipe(Schema.int()),{default:() => 100})',
      ],
      [
        { type: 'integer', default: 100, nullable: true },
        'Schema.optionalWith(Schema.NullOr(Schema.Number.pipe(Schema.int())),{default:() => 100})',
      ],
      [
        { type: ['integer', 'null'], default: 100 },
        'Schema.optionalWith(Schema.NullOr(Schema.Number.pipe(Schema.int())),{default:() => 100})',
      ],
      [
        { type: 'integer', exclusiveMinimum: 5 },
        'Schema.Number.pipe(Schema.int(),Schema.greaterThan(5))',
      ],
      [
        { type: 'integer', exclusiveMaximum: 10 },
        'Schema.Number.pipe(Schema.int(),Schema.lessThan(10))',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })

    describe('format: bigint', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'integer', format: 'bigint' }, 'Schema.BigIntFromSelf'],
        [
          { type: 'integer', format: 'bigint', nullable: true },
          'Schema.NullOr(Schema.BigIntFromSelf)',
        ],
        [{ type: ['integer', 'null'], format: 'bigint' }, 'Schema.NullOr(Schema.BigIntFromSelf)'],
        [
          { type: 'integer', format: 'bigint', minimum: 0 },
          'Schema.BigIntFromSelf.pipe(Schema.greaterThanOrEqualToBigInt(BigInt(0)))',
        ],
        [
          { type: 'integer', format: 'bigint', maximum: 100 },
          'Schema.BigIntFromSelf.pipe(Schema.lessThanOrEqualToBigInt(BigInt(100)))',
        ],
        [
          { type: 'integer', format: 'bigint', minimum: 0, maximum: 100 },
          'Schema.BigIntFromSelf.pipe(Schema.greaterThanOrEqualToBigInt(BigInt(0)),Schema.lessThanOrEqualToBigInt(BigInt(100)))',
        ],
      ])('effect(%o) → %s', (input, expected) => {
        expect(effect(input)).toBe(expected)
      })
    })
  })

  describe('boolean', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'boolean' }, 'Schema.Boolean'],
      [{ type: ['boolean'], nullable: true }, 'Schema.NullOr(Schema.Boolean)'],
      [{ type: ['boolean', 'null'] }, 'Schema.NullOr(Schema.Boolean)'],
      [
        { type: 'boolean', default: true },
        'Schema.optionalWith(Schema.Boolean,{default:() => true})',
      ],
      [
        { type: 'boolean', default: false },
        'Schema.optionalWith(Schema.Boolean,{default:() => false})',
      ],
      [{ type: 'boolean', nullable: true }, 'Schema.NullOr(Schema.Boolean)'],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('array', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'array', items: { type: 'string' } }, 'Schema.Array(Schema.String)'],
      [
        { type: 'array', items: { type: 'string', nullable: true } },
        'Schema.Array(Schema.NullOr(Schema.String))',
      ],
      [
        { type: 'array', items: { type: ['string', 'null'] } },
        'Schema.Array(Schema.NullOr(Schema.String))',
      ],
      [
        { type: 'array', nullable: true, items: { type: ['string', 'null'] } },
        'Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))',
      ],
      [{ type: 'array', items: { type: 'number' } }, 'Schema.Array(Schema.Number)'],
      [{ type: 'array', items: { type: 'boolean' } }, 'Schema.Array(Schema.Boolean)'],
      [
        { type: 'array', items: { type: 'string' }, minItems: 1 },
        'Schema.Array(Schema.String).pipe(Schema.minItems(1))',
      ],
      [
        { type: 'array', items: { type: 'string' }, maxItems: 10 },
        'Schema.Array(Schema.String).pipe(Schema.maxItems(10))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
        'Schema.Array(Schema.String).pipe(Schema.minItems(1),Schema.maxItems(10))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
        'Schema.Array(Schema.String).pipe(Schema.itemsCount(5))',
      ],
      [
        {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        'Schema.Array(Schema.Array(Schema.String))',
      ],
      [
        {
          type: 'array',
          items: {
            anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
          },
        },
        'Schema.Array(Schema.Union(Schema.String,Schema.Number,Schema.Boolean))',
      ],
      [
        { type: 'array', nullable: true, items: { type: 'string' } },
        'Schema.NullOr(Schema.Array(Schema.String))',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('object', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'object' }, 'Schema.Struct({})'],
      [{ type: 'object', nullable: true }, 'Schema.NullOr(Schema.Struct({}))'],
      [{ type: ['object', 'null'] }, 'Schema.NullOr(Schema.Struct({}))'],
      [
        {
          type: 'object',
          properties: { foo: { type: 'string' } },
          required: ['foo'],
        },
        'Schema.Struct({foo:Schema.String})',
      ],
      [
        {
          type: 'object',
          properties: { foo: { type: 'string' } },
          required: ['foo'],
          nullable: true,
        },
        'Schema.NullOr(Schema.Struct({foo:Schema.String}))',
      ],
      [
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
          required: ['name'],
        },
        'Schema.Struct({name:Schema.String,age:Schema.optional(Schema.Number.pipe(Schema.int()))})',
      ],
      [
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
        },
        'Schema.partial(Schema.Struct({name:Schema.String,age:Schema.Number.pipe(Schema.int())}))',
      ],
      [
        {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        'Schema.Record({key:Schema.String,value:Schema.String})',
      ],
      [
        {
          type: 'object',
          additionalProperties: true,
        },
        'Schema.Unknown',
      ],
      [
        {
          type: 'object',
          properties: {
            test: { type: 'string' },
          },
          required: ['test'],
          additionalProperties: true,
        },
        'Schema.Struct({test:Schema.String})',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('date', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'date' }, 'Schema.Date'],
      [{ type: 'date', nullable: true }, 'Schema.NullOr(Schema.Date)'],
      [{ type: ['date', 'null'] }, 'Schema.NullOr(Schema.Date)'],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('null', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'null' }, 'Schema.NullOr(Schema.Null)'],
      [{ type: 'null', nullable: true }, 'Schema.NullOr(Schema.Null)'],
      [{ type: ['null'] }, 'Schema.NullOr(Schema.Null)'],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('any/unknown', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{}, 'Schema.Unknown'],
      [{ nullable: true }, 'Schema.NullOr(Schema.Unknown)'],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('openapi', () => {
    describe('ref with openapi option', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/User' }, 'UserSchema'],
        [{ $ref: '#/components/schemas/user-profile' }, 'UserProfileSchema'],
        [{ $ref: '#/components/parameters/UserId' }, 'UserIdParamsSchema'],
        [{ $ref: '#/components/headers/X-Request-Id' }, 'XRequestIdHeaderSchema'],
        [{ $ref: '#/components/responses/NotFound' }, 'NotFoundResponse'],
        [{ $ref: '#/components/securitySchemes/Bearer' }, 'BearerSecurityScheme'],
        [{ $ref: '#/components/requestBodies/CreateUser' }, 'CreateUserRequestBody'],
        [{ type: 'array', items: { $ref: '#/components/schemas/Pet' } }, 'Schema.Array(PetSchema)'],
        [{ $ref: '#/definitions/Address' }, 'AddressSchema'],
        [{ $ref: '#/$defs/Address' }, 'AddressSchema'],
      ])('effect(%o, "Schema", false, { openapi: true }) → %s', (input, expected) => {
        expect(effect(input, 'Schema', false, { openapi: true })).toBe(expected)
      })
    })

    describe('ref with openapi and isEffect', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/User' }, 'Schema.suspend(() => UserSchema)'],
        [{ $ref: '#/components/parameters/UserId' }, 'Schema.suspend(() => UserIdParamsSchema)'],
        [{ $ref: '#/components/schemas/Tree' }, 'Schema.suspend(() => TreeSchema)'],
      ])('effect(%o, "TreeSchema", true, { openapi: true }) → %s', (input, expected) => {
        expect(effect(input, 'TreeSchema', true, { openapi: true })).toBe(expected)
      })
    })

    describe('object with openapi refs', () => {
      it('should resolve $ref in object properties with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          type: 'object',
          properties: {
            pet: { $ref: '#/components/schemas/Pet' },
            owner: { $ref: '#/components/schemas/user-profile' },
          },
          required: ['pet'],
        }
        expect(effect(schema, 'Schema', false, { openapi: true })).toBe(
          'Schema.Struct({pet:PetSchema,owner:Schema.optional(UserProfileSchema)})',
        )
      })
    })

    describe('combinators with openapi refs', () => {
      it('should resolve oneOf $refs with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        }
        expect(effect(schema, 'Schema', false, { openapi: true })).toBe(
          'Schema.Union(CatSchema,DogSchema)',
        )
      })
    })

    describe('openapi edge cases', () => {
      it.concurrent.each<[JSONSchema, string, string]>([
        // Self-reference: resolved name equals rootName
        [{ $ref: '#/components/schemas/User' }, 'UserSchema', 'Schema.suspend(() => UserSchema)'],
        // Nullable ref with openapi (double-wrapped: ref() wraps, then effect() wraps again)
        [
          { $ref: '#/components/schemas/Pet', nullable: true },
          'TestSchema',
          'Schema.NullOr(Schema.NullOr(PetSchema))',
        ],
        // allOf with openapi ref
        [{ allOf: [{ $ref: '#/components/schemas/Base' }] }, 'TestSchema', 'BaseSchema'],
        // anyOf with openapi ref and inline
        [
          { anyOf: [{ $ref: '#/components/schemas/A' }, { type: 'string' }] },
          'TestSchema',
          'Schema.Union(ASchema,Schema.String)',
        ],
        // URL-encoded $ref with openapi
        [{ $ref: '#/components/schemas/My%20Schema' }, 'TestSchema', 'MySchemaSchema'],
      ])('effect(%o, %s, false, { openapi: true }) → %s', (input, rootName, expected) => {
        expect(effect(input, rootName, false, { openapi: true })).toBe(expected)
      })
    })
  })

  describe('ref edge cases (non-openapi)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      // Relative reference (#SomeRef)
      [{ $ref: '#SomeRef' }, 'SomeRefSchema'],
      // External file with fragment
      [{ $ref: 'other.json#/definitions/Foo' }, 'Schema.Unknown'],
      // HTTP URL reference with .json
      [{ $ref: 'https://example.com/schemas/User.json' }, 'User'],
      // HTTP URL without .json
      [{ $ref: 'https://example.com/schemas/User' }, 'User'],
      // Fallback to unknown (no # and no http)
      [{ $ref: 'relative/path' }, 'Schema.Unknown'],
      // Self reference #
      [{ $ref: '#' }, 'Schema.suspend(() => Schema)'],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('empty combinators', () => {
    it('should handle empty oneOf', () => {
      expect(effect({ oneOf: [] })).toBe('Schema.Unknown')
    })

    it('should handle empty anyOf', () => {
      expect(effect({ anyOf: [] })).toBe('Schema.Unknown')
    })
  })

  describe('wrap edge cases', () => {
    it('should handle nullable via type array with null', () => {
      expect(effect({ type: ['string', 'null'] })).toBe('Schema.NullOr(Schema.String)')
    })

    it('should handle default with nullable', () => {
      expect(effect({ type: 'string', nullable: true, default: 'x' })).toBe(
        'Schema.optionalWith(Schema.NullOr(Schema.String),{default:() => "x"})',
      )
    })
  })

  describe('x-brand', () => {
    it('should add Schema.brand() for string', () => {
      expect(effect({ type: 'string', 'x-brand': 'UserId' })).toBe(
        'Schema.String.pipe(Schema.brand("UserId"))',
      )
    })

    it('should add Schema.brand() for number with constraints', () => {
      expect(effect({ type: 'number', minimum: 0, 'x-brand': 'Price' })).toBe(
        'Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)).pipe(Schema.brand("Price"))',
      )
    })

    it('should add Schema.brand() after Schema.NullOr()', () => {
      expect(effect({ type: 'string', nullable: true, 'x-brand': 'Email' })).toBe(
        'Schema.NullOr(Schema.String).pipe(Schema.brand("Email"))',
      )
    })

    it('should add Schema.brand() inside Schema.optionalWith()', () => {
      // Schema.brand requires a Schema; optionalWith returns a PropertySignature.
      // Brand must wrap the inner Schema before optionalWith makes it optional.
      expect(effect({ type: 'string', default: 'foo', 'x-brand': 'Name' })).toBe(
        'Schema.optionalWith(Schema.String.pipe(Schema.brand("Name")),{default:() => "foo"})',
      )
    })

    it('should add Schema.brand() for integer', () => {
      expect(effect({ type: 'integer', minimum: 0, 'x-brand': 'Quantity' })).toBe(
        'Schema.Number.pipe(Schema.int(),Schema.greaterThanOrEqualTo(0)).pipe(Schema.brand("Quantity"))',
      )
    })

    it('should add Schema.brand() for array', () => {
      expect(
        effect({ type: 'array', items: { type: 'string' }, minItems: 1, 'x-brand': 'Tags' }),
      ).toBe('Schema.Array(Schema.String).pipe(Schema.minItems(1)).pipe(Schema.brand("Tags"))')
    })
  })
})
