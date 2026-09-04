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
        'Schema.NullOr(Schema.Union([Schema.Struct({kind:Schema.Literal("A")}),Schema.Struct({kind:Schema.Literal("B")})]))',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'Schema.Union([ASchema,BSchema])',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          nullable: true,
        },
        'Schema.NullOr(Schema.Union([ASchema,BSchema]))',
      ],
      [
        {
          type: ['object', 'null'],
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'Schema.NullOr(Schema.Union([ASchema,BSchema]))',
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
        'Schema.NullOr(Schema.Union([Schema.Struct({kind:Schema.Literal("A")}),Schema.Struct({kind:Schema.Literal("B")})]))',
      ],
      [
        {
          type: 'object',
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'Schema.Union([ASchema,BSchema])',
      ],
      [
        {
          type: 'object',
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          nullable: true,
        },
        'Schema.NullOr(Schema.Union([ASchema,BSchema]))',
      ],
      [
        {
          type: ['object', 'null'],
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'Schema.NullOr(Schema.Union([ASchema,BSchema]))',
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
        'Schema.Struct({...Schema.Struct({a:Schema.String}).fields,...Schema.Struct({b:Schema.String}).fields})',
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
        'Schema.NullOr(Schema.Struct({...Schema.Struct({a:Schema.String}).fields,...Schema.Struct({b:Schema.String}).fields}))',
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
        'Schema.NullOr(Schema.Struct({...Schema.Struct({a:Schema.String}).fields,...Schema.Struct({b:Schema.String}).fields}))',
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
        'GeoJsonObjectSchema.check(Schema.makeFilter((input)=>Schema.is(Schema.Struct({type:Schema.Literals(["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon","GeometryCollection"])}))(input)))',
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
        'Schema.Struct({a:Schema.String}).pipe(Schema.withDecodingDefault(Effect.succeed("hello")))',
      ],
      // 3+ element allOf is left-folded into nested binary Schema.extend because
      // effect's `Schema.extend(a, b)` API is strictly 2-ary.
      // Flat `Schema.extend(a, b, c)` was emitted before but errored at runtime.
      [
        {
          allOf: [
            { type: 'object', required: ['a'], properties: { a: { type: 'string' } } },
            { type: 'object', required: ['b'], properties: { b: { type: 'string' } } },
            { type: 'object', required: ['c'], properties: { c: { type: 'string' } } },
          ],
        },
        'Schema.Struct({...Schema.Struct({a:Schema.String}).fields,...Schema.Struct({b:Schema.String}).fields,...Schema.Struct({c:Schema.String}).fields})',
      ],
      [
        {
          allOf: [
            { type: 'object', required: ['a'], properties: { a: { type: 'string' } } },
            { type: 'object', required: ['b'], properties: { b: { type: 'string' } } },
            { type: 'object', required: ['c'], properties: { c: { type: 'string' } } },
            { type: 'object', required: ['d'], properties: { d: { type: 'string' } } },
          ],
        },
        'Schema.Struct({...Schema.Struct({a:Schema.String}).fields,...Schema.Struct({b:Schema.String}).fields,...Schema.Struct({c:Schema.String}).fields,...Schema.Struct({d:Schema.String}).fields})',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('not', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { not: { type: 'string' } },
        "Schema.Unknown.check(Schema.makeFilter((input) => typeof input !== 'string'))",
      ],
      [
        { not: { type: 'integer' } },
        "Schema.Unknown.check(Schema.makeFilter((input) => typeof input !== 'number' || !Number.isInteger(input)))",
      ],
      [
        { not: { type: 'boolean' } },
        "Schema.Unknown.check(Schema.makeFilter((input) => typeof input !== 'boolean'))",
      ],
      [
        { not: { type: 'string' }, nullable: true },
        "Schema.NullOr(Schema.Unknown.check(Schema.makeFilter((input) => typeof input !== 'string')))",
      ],
      [
        { not: { type: 'string' }, type: ['null'] },
        "Schema.NullOr(Schema.Unknown.check(Schema.makeFilter((input) => typeof input !== 'string')))",
      ],
      [{ not: { const: 42 } }, 'Schema.Unknown.check(Schema.makeFilter((input) => input !== 42))'],
      [
        { not: { enum: ['a', 'b'] } },
        'Schema.Unknown.check(Schema.makeFilter((input) => !["a","b"].some((item) => item === input)))',
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
      [{ enum: ['A', 'B'] }, 'Schema.Literals(["A","B"])'],
      [
        { enum: ['A', 'B'], type: ['string'], nullable: true },
        'Schema.NullOr(Schema.Literals(["A","B"]))',
      ],
      [{ enum: ['A', 'B'], type: ['string', 'null'] }, 'Schema.NullOr(Schema.Literals(["A","B"]))'],
      [{ enum: [1, 2] }, 'Schema.Literals([1,2])'],
      [{ enum: [1, 2], type: ['number'], nullable: true }, 'Schema.NullOr(Schema.Literals([1,2]))'],
      [{ enum: [1, 2], type: ['number', 'null'] }, 'Schema.NullOr(Schema.Literals([1,2]))'],
      [{ enum: [true, false] }, 'Schema.Literals([true,false])'],
      [
        { enum: [true, false], type: ['boolean'], nullable: true },
        'Schema.NullOr(Schema.Literals([true,false]))',
      ],
      [
        { enum: [true, false], type: ['boolean', 'null'] },
        'Schema.NullOr(Schema.Literals([true,false]))',
      ],
      [{ enum: [null] }, 'Schema.Literal(null)'],
      [{ enum: [null], type: ['null'] }, 'Schema.NullOr(Schema.Literal(null))'],
      [{ enum: ['abc'] }, 'Schema.Literal("abc")'],
      [{ enum: ['abc'], type: ['string'], nullable: true }, 'Schema.NullOr(Schema.Literal("abc"))'],
      [{ enum: ['abc'], type: ['string', 'null'] }, 'Schema.NullOr(Schema.Literal("abc"))'],
      [{ type: 'array', enum: [[1, 2]] }, 'Schema.Tuple([Schema.Literal(1),Schema.Literal(2)])'],
      [
        { type: 'array', nullable: true, enum: [[1, 2]] },
        'Schema.NullOr(Schema.Tuple([Schema.Literal(1),Schema.Literal(2)]))',
      ],
      [
        { type: ['array', 'null'], enum: [[1, 2]] },
        'Schema.NullOr(Schema.Tuple([Schema.Literal(1),Schema.Literal(2)]))',
      ],
      [
        {
          type: 'array',
          enum: [
            [1, 2],
            [3, 4],
          ],
        },
        'Schema.Union([Schema.Tuple([Schema.Literal(1),Schema.Literal(2)]),Schema.Tuple([Schema.Literal(3),Schema.Literal(4)])])',
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
        'Schema.NullOr(Schema.Union([Schema.Tuple([Schema.Literal(1),Schema.Literal(2)]),Schema.Tuple([Schema.Literal(3),Schema.Literal(4)])]))',
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
      [{ type: 'string', minLength: 1 }, 'Schema.String.check(Schema.isMinLength(1))'],
      [{ type: 'string', maxLength: 10 }, 'Schema.String.check(Schema.isMaxLength(10))'],
      [
        { type: 'string', minLength: 1, maxLength: 10 },
        'Schema.String.check(Schema.isMinLength(1),Schema.isMaxLength(10))',
      ],
      [
        { type: 'string', minLength: 5, maxLength: 5 },
        'Schema.String.check(Schema.isLengthBetween(5,5))',
      ],
      [{ type: 'string', pattern: '^\\w+$' }, 'Schema.String.check(Schema.isPattern(/^\\w+$/))'],
      [
        { type: 'string', default: 'test' },
        'Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed("test")))',
      ],
      [
        { type: 'string', default: 'test', nullable: true },
        'Schema.NullOr(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed("test")))',
      ],
      [
        { type: ['string', 'null'], default: 'test' },
        'Schema.NullOr(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed("test")))',
      ],
      [
        { type: 'object', default: { key: 'defaultValue' } },
        'Schema.Struct({}).pipe(Schema.withDecodingDefault(Effect.succeed({"key":"defaultValue"})))',
      ],
      [
        { type: 'string', format: 'email' },
        'Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/))',
      ],
      [{ type: 'string', format: 'uuid' }, 'Schema.String.check(Schema.isUUID())'],
      [{ type: 'string', format: 'ulid' }, 'Schema.String.check(Schema.isULID())'],
      [
        { type: 'string', format: 'uri' },
        'Schema.String.check(Schema.isPattern(/^https?:\\/\\//))',
      ],
      [
        { type: 'string', format: 'ipv4' },
        'Schema.String.check(Schema.isPattern(/^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$/))',
      ],
      [
        { type: 'string', format: 'ipv6' },
        'Schema.String.check(Schema.isPattern(/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/))',
      ],
      [
        { type: 'string', format: 'date-time' },
        'Schema.String.check(Schema.isPattern(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/))',
      ],
      [
        { type: 'string', format: 'date' },
        'Schema.String.check(Schema.isPattern(/^\\d{4}-\\d{2}-\\d{2}$/))',
      ],
      [
        { type: 'string', format: 'time' },
        'Schema.String.check(Schema.isPattern(/^\\d{2}:\\d{2}:\\d{2}/))',
      ],
      [
        { type: 'string', format: 'uuid', nullable: true },
        'Schema.NullOr(Schema.String.check(Schema.isUUID()))',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('number', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'number' }, 'Schema.Number'],
      [{ type: ['number'], nullable: true }, 'Schema.NullOr(Schema.Number)'],
      [{ type: ['number', 'null'] }, 'Schema.NullOr(Schema.Number)'],
      [{ type: 'number', minimum: 0 }, 'Schema.Number.check(Schema.isGreaterThanOrEqualTo(0))'],
      [{ type: 'number', minimum: 100 }, 'Schema.Number.check(Schema.isGreaterThanOrEqualTo(100))'],
      [{ type: 'number', maximum: 100 }, 'Schema.Number.check(Schema.isLessThanOrEqualTo(100))'],
      [{ type: 'number', maximum: 0 }, 'Schema.Number.check(Schema.isLessThanOrEqualTo(0))'],
      [{ type: 'number', multipleOf: 2 }, 'Schema.Number.check(Schema.isMultipleOf(2))'],
      [
        { type: 'number', minimum: 0, maximum: 100 },
        'Schema.Number.check(Schema.isGreaterThanOrEqualTo(0),Schema.isLessThanOrEqualTo(100))',
      ],
      [
        { type: 'number', default: 100 },
        'Schema.Number.pipe(Schema.withDecodingDefault(Effect.succeed(100)))',
      ],
      [
        { type: 'number', default: 100, nullable: true },
        'Schema.NullOr(Schema.Number).pipe(Schema.withDecodingDefault(Effect.succeed(100)))',
      ],
      [
        { type: ['number', 'null'], default: 100 },
        'Schema.NullOr(Schema.Number).pipe(Schema.withDecodingDefault(Effect.succeed(100)))',
      ],
      [{ type: 'number', exclusiveMinimum: 5 }, 'Schema.Number.check(Schema.isGreaterThan(5))'],
      [{ type: 'number', exclusiveMaximum: 10 }, 'Schema.Number.check(Schema.isLessThan(10))'],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })
  })

  describe('integer', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer' }, 'Schema.Number.check(Schema.isInt())'],
      [{ type: ['integer'], nullable: true }, 'Schema.NullOr(Schema.Number.check(Schema.isInt()))'],
      [{ type: ['integer', 'null'] }, 'Schema.NullOr(Schema.Number.check(Schema.isInt()))'],
      [
        { type: 'integer', minimum: 0 },
        'Schema.Number.check(Schema.isInt(),Schema.isGreaterThanOrEqualTo(0))',
      ],
      [
        { type: 'integer', minimum: 100 },
        'Schema.Number.check(Schema.isInt(),Schema.isGreaterThanOrEqualTo(100))',
      ],
      [
        { type: 'integer', maximum: 100 },
        'Schema.Number.check(Schema.isInt(),Schema.isLessThanOrEqualTo(100))',
      ],
      [
        { type: 'integer', maximum: 0 },
        'Schema.Number.check(Schema.isInt(),Schema.isLessThanOrEqualTo(0))',
      ],
      [
        { type: 'integer', multipleOf: 2 },
        'Schema.Number.check(Schema.isInt(),Schema.isMultipleOf(2))',
      ],
      [
        { type: 'integer', default: 100 },
        'Schema.Number.check(Schema.isInt()).pipe(Schema.withDecodingDefault(Effect.succeed(100)))',
      ],
      [
        { type: 'integer', default: 100, nullable: true },
        'Schema.NullOr(Schema.Number.check(Schema.isInt())).pipe(Schema.withDecodingDefault(Effect.succeed(100)))',
      ],
      [
        { type: ['integer', 'null'], default: 100 },
        'Schema.NullOr(Schema.Number.check(Schema.isInt())).pipe(Schema.withDecodingDefault(Effect.succeed(100)))',
      ],
      [
        { type: 'integer', exclusiveMinimum: 5 },
        'Schema.Number.check(Schema.isInt(),Schema.isGreaterThan(5))',
      ],
      [
        { type: 'integer', exclusiveMaximum: 10 },
        'Schema.Number.check(Schema.isInt(),Schema.isLessThan(10))',
      ],
    ])('effect(%o) → %s', (input, expected) => {
      expect(effect(input)).toBe(expected)
    })

    describe('format: bigint', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'integer', format: 'bigint' }, 'Schema.BigInt'],
        [{ type: 'integer', format: 'bigint', nullable: true }, 'Schema.NullOr(Schema.BigInt)'],
        [{ type: ['integer', 'null'], format: 'bigint' }, 'Schema.NullOr(Schema.BigInt)'],
        [
          { type: 'integer', format: 'bigint', minimum: 0 },
          'Schema.BigInt.check(Schema.isGreaterThanOrEqualToBigInt(BigInt(0)))',
        ],
        [
          { type: 'integer', format: 'bigint', maximum: 100 },
          'Schema.BigInt.check(Schema.isLessThanOrEqualToBigInt(BigInt(100)))',
        ],
        [
          { type: 'integer', format: 'bigint', minimum: 0, maximum: 100 },
          'Schema.BigInt.check(Schema.isGreaterThanOrEqualToBigInt(BigInt(0)),Schema.isLessThanOrEqualToBigInt(BigInt(100)))',
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
        'Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true)))',
      ],
      [
        { type: 'boolean', default: false },
        'Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(false)))',
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
        'Schema.Array(Schema.String).check(Schema.isMinLength(1))',
      ],
      [
        { type: 'array', items: { type: 'string' }, maxItems: 10 },
        'Schema.Array(Schema.String).check(Schema.isMaxLength(10))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
        'Schema.Array(Schema.String).check(Schema.isMinLength(1),Schema.isMaxLength(10))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
        'Schema.Array(Schema.String).check(Schema.isLengthBetween(5,5))',
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
        'Schema.Array(Schema.Union([Schema.String,Schema.Number,Schema.Boolean]))',
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
        'Schema.Struct({name:Schema.String,age:Schema.optional(Schema.Number.check(Schema.isInt()))})',
      ],
      [
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
        },
        'Schema.Struct({name:Schema.optional(Schema.String),age:Schema.optional(Schema.Number.check(Schema.isInt()))})',
      ],
      [
        {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        'Schema.Record(Schema.String,Schema.String)',
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
          'Schema.Union([CatSchema,DogSchema])',
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
          'Schema.Union([ASchema,Schema.String])',
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
        'Schema.NullOr(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed("x")))',
      )
    })
  })

  describe('code-emitting extensions (unsafeCodeExtensions)', () => {
    const unsafe = { unsafeCodeExtensions: true }

    it('appends x-filter chain to the schema', () => {
      expect(
        effect(
          {
            type: 'string',
            'x-filter': '.pipe(Schema.filter((input) => input.length > 0))',
          },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('Schema.String.pipe(Schema.filter((input) => input.length > 0))')
    })

    it('appends x-transform chain', () => {
      expect(
        effect(
          { type: 'string', 'x-transform': '.pipe(Schema.transform(Schema.String, ...))' },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('Schema.String.pipe(Schema.transform(Schema.String, ...))')
    })

    it('silently ignores x-filter without flag', () => {
      expect(
        effect({ type: 'string', 'x-filter': '.pipe(Schema.filter((input) => input.length > 0))' }),
      ).toBe('Schema.String')
    })

    it('silently ignores denylisted code', () => {
      expect(
        effect(
          { type: 'string', 'x-filter': '.pipe(Schema.filter((input) => eval(input)))' },
          'Schema',
          false,
          unsafe,
        ),
      ).toBe('Schema.String')
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
        'Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)).pipe(Schema.brand("Price"))',
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
        'Schema.String.pipe(Schema.brand("Name")).pipe(Schema.withDecodingDefault(Effect.succeed("foo")))',
      )
    })

    it('should add Schema.brand() for integer', () => {
      expect(effect({ type: 'integer', minimum: 0, 'x-brand': 'Quantity' })).toBe(
        'Schema.Number.check(Schema.isInt(),Schema.isGreaterThanOrEqualTo(0)).pipe(Schema.brand("Quantity"))',
      )
    })

    it('should add Schema.brand() for array', () => {
      expect(
        effect({ type: 'array', items: { type: 'string' }, minItems: 1, 'x-brand': 'Tags' }),
      ).toBe('Schema.Array(Schema.String).check(Schema.isMinLength(1)).pipe(Schema.brand("Tags"))')
    })
  })

  describe('x-prefixItems-message', () => {
    it('wraps tuple with transformOrFail that rewrites element-level messages', () => {
      expect(
        effect({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'number' }],
          'x-prefixItems-message': 'bad tuple',
        }),
      ).toBe(
        'Schema.Unknown.check(Schema.makeFilter((input)=>Schema.is(Schema.Tuple([Schema.String,Schema.Number]))(input),{message:"bad tuple"})).pipe(Schema.decodeTo(Schema.Tuple([Schema.String,Schema.Number])))',
      )
    })
  })

  describe('x-items-message', () => {
    it('wraps array with transformOrFail that rewrites element-level messages', () => {
      expect(
        effect({ type: 'array', items: { type: 'string' }, 'x-items-message': 'bad items' }),
      ).toBe(
        'Schema.Unknown.check(Schema.makeFilter((input)=>Schema.is(Schema.Array(Schema.String))(input),{message:"bad items"})).pipe(Schema.decodeTo(Schema.Array(Schema.String)))',
      )
    })
  })

  describe('x-implication-message', () => {
    it('takes precedence over x-anyOf-message', () => {
      expect(
        effect({
          anyOf: [{ type: 'string' }, { type: 'number' }],
          'x-anyOf-message': 'any',
          'x-implication-message': 'implication failed',
        }),
      ).toBe('Schema.Union([Schema.String,Schema.Number]).annotate({message:"implication failed"})')
    })
  })

  describe('x-length-message', () => {
    it('falls back for minItems when x-minItems-message absent', () => {
      expect(
        effect({
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          'x-length-message': 'bad length',
        }),
      ).toBe('Schema.Array(Schema.String).check(Schema.isMinLength(1,{message:"bad length"}))')
    })
  })

  describe('paramIn coercion', () => {
    it('query: number → Schema.NumberFromString', () => {
      expect(effect({ type: 'number' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'Schema.NumberFromString',
      )
    })

    it('path: boolean → Schema.BooleanFromString', () => {
      expect(effect({ type: 'boolean' }, 'Schema', false, { paramIn: 'path' })).toBe(
        'Schema.Literals(["true","false"]).pipe(Schema.decodeTo(Schema.Boolean,SchemaTransformation.transform({decode:(input)=>input==="true",encode:(input)=>input?"true":"false"})))',
      )
    })

    it('query: date → Schema.DateFromString', () => {
      expect(effect({ type: 'date' }, 'Schema', false, { paramIn: 'query' })).toBe(
        'Schema.DateFromString',
      )
    })

    it('x-coerce: false overrides paramIn (user opt-out wins)', () => {
      expect(
        effect({ type: 'number', 'x-coerce': false }, 'Schema', false, { paramIn: 'query' }),
      ).toBe('Schema.Number')
    })
  })

  describe('x-unevaluatedProperties-message', () => {
    it('attaches parseOptions:onExcessProperty=error + message annotation', () => {
      expect(
        effect({
          type: 'object',
          properties: { a: { type: 'string' } },
          required: ['a'],
          unevaluatedProperties: false,
          'x-unevaluatedProperties-message': 'no extras',
        }),
      ).toBe(
        'Schema.Struct({a:Schema.String}).annotate({parseOptions:{onExcessProperty:"error"},messageUnexpectedKey:"no extras"})',
      )
    })
  })

  describe('x-unevaluatedItems-message (prefixItems tuple)', () => {
    it('emits a fixed-length tuple when unevaluatedItems: false (extras rejected by default)', () => {
      expect(
        effect({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'boolean' }],
          unevaluatedItems: false,
        }),
      ).toBe('Schema.Tuple([Schema.String,Schema.Boolean])')
    })

    it('emits Schema.Tuple with rest when unevaluatedItems is a schema', () => {
      expect(
        effect({
          type: 'array',
          prefixItems: [{ type: 'string' }, { type: 'boolean' }],
          unevaluatedItems: { type: 'integer' },
        }),
      ).toBe(
        'Schema.TupleWithRest(Schema.Tuple([Schema.String,Schema.Boolean]),[Schema.Number.check(Schema.isInt())])',
      )
    })
  })
})

describe('effect not: type arrays / message', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { not: { type: ['string', 'number'] } },
      "Schema.Unknown.check(Schema.makeFilter((input) => (typeof input !== 'string') && (typeof input !== 'number')))",
    ],
    [
      { not: { type: 'number' } },
      "Schema.Unknown.check(Schema.makeFilter((input) => typeof input !== 'number'))",
    ],
    [
      { not: { type: 'array' } },
      'Schema.Unknown.check(Schema.makeFilter((input) => !Array.isArray(input)))',
    ],
    [
      { not: { type: 'object' } },
      "Schema.Unknown.check(Schema.makeFilter((input) => typeof input !== 'object' || input === null || Array.isArray(input)))",
    ],
    [
      { not: { type: 'null' } },
      'Schema.Unknown.check(Schema.makeFilter((input) => input !== null))',
    ],
    [{ not: { $ref: '#/components/schemas/Foo' } }, 'Schema.Unknown'],
    [{ not: { oneOf: [{ type: 'string' }, { type: 'number' }] } }, 'Schema.Unknown'],
    [
      { not: { type: 'string' }, 'x-not-message': 'no strings' },
      `Schema.Unknown.check(Schema.makeFilter((input) => typeof input !== 'string',{message:"no strings"}))`,
    ],
    [{ not: { format: 'email' } }, 'Schema.Unknown'],
  ])('effect(%o) → %s', (input, expected) => {
    expect(effect(input)).toBe(expected)
  })
})

describe('effect contains / minContains / maxContains', () => {
  it.concurrent.each<[JSONSchema, string]>([
    [
      { type: 'array', items: { type: 'number' }, contains: { type: 'integer' } },
      'Schema.Array(Schema.Number).check(Schema.makeFilter((input)=>input.some((item)=>Schema.is(Schema.Number.check(Schema.isInt()))(item))))',
    ],
    [
      {
        type: 'array',
        items: { type: 'number' },
        contains: { type: 'integer' },
        'x-contains-message': 'need int',
      },
      'Schema.Array(Schema.Number).check(Schema.makeFilter((input)=>input.some((item)=>Schema.is(Schema.Number.check(Schema.isInt()))(item)),{message:"need int"}))',
    ],
    [
      { type: 'array', items: { type: 'number' }, contains: { type: 'integer' }, minContains: 2 },
      'Schema.Array(Schema.Number).check(Schema.makeFilter((input)=>input.filter((item)=>Schema.is(Schema.Number.check(Schema.isInt()))(item)).length>=2))',
    ],
    [
      { type: 'array', items: { type: 'number' }, contains: { type: 'integer' }, maxContains: 3 },
      'Schema.Array(Schema.Number).check(Schema.makeFilter((input)=>input.filter((item)=>Schema.is(Schema.Number.check(Schema.isInt()))(item)).length>=1),Schema.makeFilter((input)=>input.filter((item)=>Schema.is(Schema.Number.check(Schema.isInt()))(item)).length<=3))',
    ],
    [
      {
        type: 'array',
        items: { type: 'number' },
        contains: { type: 'integer' },
        minContains: 1,
        maxContains: 2,
        'x-minContains-message': 'few',
        'x-maxContains-message': 'many',
      },
      'Schema.Array(Schema.Number).check(Schema.makeFilter((input)=>input.filter((item)=>Schema.is(Schema.Number.check(Schema.isInt()))(item)).length>=1,{message:"few"}),Schema.makeFilter((input)=>input.filter((item)=>Schema.is(Schema.Number.check(Schema.isInt()))(item)).length<=2,{message:"many"}))',
    ],
    [
      {
        type: 'array',
        items: { type: 'number' },
        contains: { type: 'integer' },
        minContains: 0,
        maxContains: 2,
      },
      'Schema.Array(Schema.Number).check(Schema.makeFilter((input)=>input.filter((item)=>Schema.is(Schema.Number.check(Schema.isInt()))(item)).length<=2))',
    ],
  ])('effect(%o) → %s', (input, expected) => {
    expect(effect(input)).toBe(expected)
  })
})
