import { describe, expect, it } from 'vitest'
import type { JSONSchema } from '../../helper/index.js'
import { typebox } from './typebox.js'

// Test run
// pnpm vitest run ./src/generator/typebox/typebox.test.ts

describe('typebox', () => {
  describe('ref', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/User' }, 'User'],
      [{ $ref: '#/components/schemas/UserProfile' }, 'UserProfile'],
      [{ $ref: '#/definitions/Item' }, 'Item'],
      [{ $ref: '#/$defs/Address' }, 'Address'],
      [{ $ref: '#', } as JSONSchema, 'Type.Recursive((_Self) => Schema)'],
      [{ $ref: '' } as JSONSchema, 'Type.Any()'],
      [
        {
          type: 'array',
          items: { $ref: '#/components/schemas/Tag' },
        } as JSONSchema,
        'Type.Array(Tag)',
      ],
      [
        { $ref: '#/components/schemas/User', nullable: true } as JSONSchema,
        'Type.Union([Type.Union([User,Type.Null()]),Type.Null()])',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('oneOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        } as JSONSchema,
        'Type.Union([Type.String(),Type.Number()])',
      ],
      [
        {
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        } as JSONSchema,
        'Type.Union([A,B])',
      ],
      [
        {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          nullable: true,
        } as JSONSchema,
        'Type.Union([Type.Union([Type.String(),Type.Number()]),Type.Null()])',
      ],
      [
        { oneOf: [] } as JSONSchema,
        'Type.Any()',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('anyOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        } as JSONSchema,
        'Type.Union([Type.String(),Type.Number()])',
      ],
      [
        {
          anyOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        } as JSONSchema,
        'Type.Union([Cat,Dog])',
      ],
      [
        {
          anyOf: [{ type: 'string' }, { type: 'boolean' }],
          nullable: true,
        } as JSONSchema,
        'Type.Union([Type.Union([Type.String(),Type.Boolean()]),Type.Null()])',
      ],
      [
        { anyOf: [] } as JSONSchema,
        'Type.Any()',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('allOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          allOf: [
            { $ref: '#/components/schemas/Base' },
            {
              type: 'object',
              properties: { name: { type: 'string' } },
              required: ['name'],
            },
          ],
        } as JSONSchema,
        'Type.Intersect([Base,Type.Object({name:Type.String()})])',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              properties: { a: { type: 'string' } },
              required: ['a'],
            },
            {
              type: 'object',
              properties: { b: { type: 'number' } },
              required: ['b'],
            },
          ],
        } as JSONSchema,
        'Type.Intersect([Type.Object({a:Type.String()}),Type.Object({b:Type.Number()})])',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              properties: { a: { type: 'string' } },
              required: ['a'],
            },
            {
              type: 'object',
              properties: { b: { type: 'string' } },
              required: ['b'],
            },
          ],
          nullable: true,
        } as JSONSchema,
        'Type.Union([Type.Intersect([Type.Object({a:Type.String()}),Type.Object({b:Type.String()})]),Type.Null()])',
      ],
      [
        { allOf: [] } as JSONSchema,
        'Type.Any()',
      ],
      [
        {
          allOf: [{ $ref: '#/components/schemas/A' }],
        } as JSONSchema,
        'A',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('const', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ const: 'fixed' } as JSONSchema, 'Type.Literal("fixed")'],
      [{ const: 42 } as JSONSchema, 'Type.Literal(42)'],
      [{ const: true } as JSONSchema, 'Type.Literal(true)'],
      [
        { const: 'fixed', nullable: true } as JSONSchema,
        'Type.Union([Type.Literal("fixed"),Type.Null()])',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('enum', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { enum: ['A', 'B', 'C'] } as JSONSchema,
        'Type.Union([Type.Literal("A"),Type.Literal("B"),Type.Literal("C")])',
      ],
      [
        { enum: ['A', 'B'], nullable: true } as JSONSchema,
        'Type.Union([Type.Union([Type.Literal("A"),Type.Literal("B")]),Type.Null()])',
      ],
      [
        { enum: [1, 2, 3] } as JSONSchema,
        'Type.Union([Type.Literal(1),Type.Literal(2),Type.Literal(3)])',
      ],
      [
        { enum: [true, false] } as JSONSchema,
        'Type.Union([Type.Literal(true),Type.Literal(false)])',
      ],
      [
        { enum: ['only'] } as JSONSchema,
        'Type.Literal("only")',
      ],
      [
        { enum: [null] } as JSONSchema,
        'Type.Literal(null)',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('string', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string' } as JSONSchema, 'Type.String()'],
      [
        { type: 'string', nullable: true } as JSONSchema,
        'Type.Union([Type.String(),Type.Null()])',
      ],
      [
        { type: ['string', 'null'] } as JSONSchema,
        'Type.Union([Type.String(),Type.Null()])',
      ],
      [
        { type: 'string', format: 'email' } as JSONSchema,
        'Type.String({format:"email"})',
      ],
      [
        { type: 'string', format: 'uuid' } as JSONSchema,
        'Type.String({format:"uuid"})',
      ],
      [
        { type: 'string', format: 'uri' } as JSONSchema,
        'Type.String({format:"uri"})',
      ],
      [
        { type: 'string', format: 'ipv4' } as JSONSchema,
        'Type.String({format:"ipv4"})',
      ],
      [
        { type: 'string', format: 'ipv6' } as JSONSchema,
        'Type.String({format:"ipv6"})',
      ],
      [
        { type: 'string', format: 'date-time' } as JSONSchema,
        'Type.String({format:"date-time"})',
      ],
      [
        { type: 'string', format: 'date' } as JSONSchema,
        'Type.String({format:"date"})',
      ],
      [
        { type: 'string', format: 'time' } as JSONSchema,
        'Type.String({format:"time"})',
      ],
      [
        { type: 'string', minLength: 1 } as JSONSchema,
        'Type.String({minLength:1})',
      ],
      [
        { type: 'string', maxLength: 100 } as JSONSchema,
        'Type.String({maxLength:100})',
      ],
      [
        { type: 'string', minLength: 3, maxLength: 20 } as JSONSchema,
        'Type.String({minLength:3,maxLength:20})',
      ],
      [
        { type: 'string', minLength: 5, maxLength: 5 } as JSONSchema,
        'Type.String({minLength:5,maxLength:5})',
      ],
      [
        { type: 'string', pattern: '^\\w+$' } as JSONSchema,
        'Type.String({pattern:"^\\\\w+$"})',
      ],
      [
        { type: 'string', default: 'hello' } as JSONSchema,
        'Type.Optional(Type.String(),{default:"hello"})',
      ],
      [
        { type: 'string', default: 'hello', nullable: true } as JSONSchema,
        'Type.Union([Type.Optional(Type.String(),{default:"hello"}),Type.Null()])',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('number', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'number' } as JSONSchema, 'Type.Number()'],
      [
        { type: 'number', nullable: true } as JSONSchema,
        'Type.Union([Type.Number(),Type.Null()])',
      ],
      [
        { type: ['number', 'null'] } as JSONSchema,
        'Type.Union([Type.Number(),Type.Null()])',
      ],
      [
        { type: 'number', minimum: 0 } as JSONSchema,
        'Type.Number({minimum:0})',
      ],
      [
        { type: 'number', maximum: 100 } as JSONSchema,
        'Type.Number({maximum:100})',
      ],
      [
        { type: 'number', minimum: 0, maximum: 100 } as JSONSchema,
        'Type.Number({minimum:0,maximum:100})',
      ],
      [
        { type: 'number', exclusiveMinimum: 0 } as JSONSchema,
        'Type.Number({exclusiveMinimum:0})',
      ],
      [
        { type: 'number', exclusiveMaximum: 100 } as JSONSchema,
        'Type.Number({exclusiveMaximum:100})',
      ],
      [
        { type: 'number', multipleOf: 2 } as JSONSchema,
        'Type.Number({multipleOf:2})',
      ],
      [
        { type: 'number', default: 42 } as JSONSchema,
        'Type.Optional(Type.Number(),{default:42})',
      ],
      [
        { type: 'number', default: 42, nullable: true } as JSONSchema,
        'Type.Union([Type.Optional(Type.Number(),{default:42}),Type.Null()])',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('integer', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer' } as JSONSchema, 'Type.Integer()'],
      [
        { type: 'integer', nullable: true } as JSONSchema,
        'Type.Union([Type.Integer(),Type.Null()])',
      ],
      [
        { type: ['integer', 'null'] } as JSONSchema,
        'Type.Union([Type.Integer(),Type.Null()])',
      ],
      [
        { type: 'integer', minimum: 0 } as JSONSchema,
        'Type.Integer({minimum:0})',
      ],
      [
        { type: 'integer', maximum: 100 } as JSONSchema,
        'Type.Integer({maximum:100})',
      ],
      [
        { type: 'integer', exclusiveMinimum: 0 } as JSONSchema,
        'Type.Integer({exclusiveMinimum:0})',
      ],
      [
        { type: 'integer', exclusiveMaximum: 100 } as JSONSchema,
        'Type.Integer({exclusiveMaximum:100})',
      ],
      [
        { type: 'integer', multipleOf: 5 } as JSONSchema,
        'Type.Integer({multipleOf:5})',
      ],
      [
        { type: 'integer', default: 10 } as JSONSchema,
        'Type.Optional(Type.Integer(),{default:10})',
      ],
      [
        { type: 'integer', format: 'bigint' } as JSONSchema,
        'Type.BigInt()',
      ],
      [
        { type: 'integer', format: 'bigint', minimum: 0, maximum: 100 } as JSONSchema,
        'Type.BigInt({minimum:BigInt(0),maximum:BigInt(100)})',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('boolean', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'boolean' } as JSONSchema, 'Type.Boolean()'],
      [
        { type: 'boolean', nullable: true } as JSONSchema,
        'Type.Union([Type.Boolean(),Type.Null()])',
      ],
      [
        { type: ['boolean', 'null'] } as JSONSchema,
        'Type.Union([Type.Boolean(),Type.Null()])',
      ],
      [
        { type: 'boolean', default: true } as JSONSchema,
        'Type.Optional(Type.Boolean(),{default:true})',
      ],
      [
        { type: 'boolean', default: false } as JSONSchema,
        'Type.Optional(Type.Boolean(),{default:false})',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('array', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        { type: 'array', items: { type: 'string' } } as JSONSchema,
        'Type.Array(Type.String())',
      ],
      [
        { type: 'array', items: { type: 'number' } } as JSONSchema,
        'Type.Array(Type.Number())',
      ],
      [
        { type: 'array', items: { type: 'boolean' } } as JSONSchema,
        'Type.Array(Type.Boolean())',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          nullable: true,
        } as JSONSchema,
        'Type.Union([Type.Array(Type.String()),Type.Null()])',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
        } as JSONSchema,
        'Type.Array(Type.String(),{minItems:1})',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          maxItems: 10,
        } as JSONSchema,
        'Type.Array(Type.String(),{maxItems:10})',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 10,
        } as JSONSchema,
        'Type.Array(Type.String(),{minItems:1,maxItems:10})',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 5,
          maxItems: 5,
        } as JSONSchema,
        'Type.Array(Type.String(),{minItems:5,maxItems:5})',
      ],
      [
        {
          type: 'array',
          items: { type: 'string', nullable: true },
        } as JSONSchema,
        'Type.Array(Type.Union([Type.String(),Type.Null()]))',
      ],
      [
        {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' },
          },
        } as JSONSchema,
        'Type.Array(Type.Array(Type.Number()))',
      ],
      [
        { type: 'array' } as JSONSchema,
        'Type.Array(Type.Any())',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('object', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'object' } as JSONSchema, 'Type.Object({})'],
      [
        { type: 'object', nullable: true } as JSONSchema,
        'Type.Union([Type.Object({}),Type.Null()])',
      ],
      [
        {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        } as JSONSchema,
        'Type.Object({name:Type.String()})',
      ],
      [
        {
          type: 'object',
          properties: { name: { type: 'string' } },
        } as JSONSchema,
        'Type.Object({name:Type.Optional(Type.String())})',
      ],
      [
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer' },
          },
          required: ['name'],
        } as JSONSchema,
        'Type.Object({name:Type.String(),age:Type.Optional(Type.Integer())})',
      ],
      [
        {
          type: 'object',
          properties: { test: { type: 'string' } },
          required: ['test'],
          additionalProperties: false,
        } as JSONSchema,
        'Type.Object({test:Type.String()},{additionalProperties:false})',
      ],
      [
        {
          type: 'object',
          properties: { test: { type: 'string' } },
          required: ['test'],
          nullable: true,
        } as JSONSchema,
        'Type.Union([Type.Object({test:Type.String()}),Type.Null()])',
      ],
      [
        {
          type: 'object',
          properties: {
            kind: { const: 'A' },
          },
          required: ['kind'],
        } as JSONSchema,
        'Type.Object({kind:Type.Literal("A")})',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('date', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'date' } as JSONSchema, 'Type.Date()'],
      [
        { type: 'date', nullable: true } as JSONSchema,
        'Type.Union([Type.Date(),Type.Null()])',
      ],
      [
        { type: ['date', 'null'] } as JSONSchema,
        'Type.Union([Type.Date(),Type.Null()])',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('null', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'null' } as JSONSchema, 'Type.Union([Type.Null(),Type.Null()])'],
      [
        { type: 'null', nullable: true } as JSONSchema,
        'Type.Union([Type.Null(),Type.Null()])',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })

  describe('any (fallback)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{} as JSONSchema, 'Type.Any()'],
      [
        { nullable: true } as JSONSchema,
        'Type.Union([Type.Any(),Type.Null()])',
      ],
    ])('typebox(%o) → %s', (input, expected) => {
      expect(typebox(input)).toBe(expected)
    })
  })
})
