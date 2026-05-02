import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../parser/index.js'
import { valibot } from './valibot.js'

// Test run
// pnpm vitest run ./src/generator/valibot/valibot.test.ts

describe('valibot', () => {
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
        'v.array(TestSchema)',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })

    describe('ref with isValibot=true', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/Test' }, 'v.lazy(() => Test)'],
        [{ $ref: '#/definitions/Test' }, 'v.lazy(() => Test)'],
      ])('valibot(%o, undefined, true) → %s', (input, expected) => {
        expect(valibot(input, undefined, true)).toBe(expected)
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
        'v.nullable(v.union([v.object({kind:v.literal("A")}),v.object({kind:v.literal("B")})]))',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'v.union([ASchema,BSchema])',
      ],
      [
        {
          type: 'object',
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          nullable: true,
        },
        'v.nullable(v.union([ASchema,BSchema]))',
      ],
      [
        {
          type: ['object', 'null'],
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'v.nullable(v.union([ASchema,BSchema]))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
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
        'v.nullable(v.union([v.object({kind:v.literal("A")}),v.object({kind:v.literal("B")})]))',
      ],
      [
        {
          type: 'object',
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'v.union([ASchema,BSchema])',
      ],
      [
        {
          type: 'object',
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
          nullable: true,
        },
        'v.nullable(v.union([ASchema,BSchema]))',
      ],
      [
        {
          type: ['object', 'null'],
          anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        },
        'v.nullable(v.union([ASchema,BSchema]))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('allOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          description:
            'Abstract type for all GeoJSon object except Feature and FeatureCollection\n',
          externalDocs: {
            url: 'https://tools.ietf.org/html/rfc7946#section-3',
          },
          allOf: [
            {
              $ref: '#/components/schemas/GeoJsonObject',
            },
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
              discriminator: {
                propertyName: 'type',
              },
            },
          ],
        },
        'v.pipe(v.intersect([GeoJsonObjectSchema,v.object({type:v.picklist(["Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon","GeometryCollection"])})]),v.description("Abstract type for all GeoJSon object except Feature and FeatureCollection\\n"),v.metadata({externalDocs:{url:"https://tools.ietf.org/html/rfc7946#section-3"}}))',
      ],
      [
        {
          description: "GeoJSon 'Feature' object",
          externalDocs: {
            url: 'https://tools.ietf.org/html/rfc7946#section-3.2',
          },
          allOf: [
            {
              $ref: '#/components/schemas/GeoJsonObject',
            },
            {
              type: 'object',
              required: ['geometry', 'properties'],
              properties: {
                geometry: {
                  allOf: [
                    {
                      nullable: true,
                    },
                    {
                      $ref: '#/components/schemas/Geometry',
                    },
                  ],
                },
                properties: {
                  type: 'object',
                  nullable: true,
                },
                id: {
                  oneOf: [
                    {
                      type: 'number',
                    },
                    {
                      type: 'string',
                    },
                  ],
                },
              },
            },
          ],
        },
        'v.pipe(v.intersect([GeoJsonObjectSchema,v.object({geometry:v.nullable(GeometrySchema),properties:v.nullable(v.object({})),id:v.optional(v.union([v.number(),v.string()]))})]),v.description("GeoJSon \'Feature\' object"),v.metadata({externalDocs:{url:"https://tools.ietf.org/html/rfc7946#section-3.2"}}))',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: {
                a: {
                  type: 'string',
                },
              },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                b: {
                  type: 'string',
                },
              },
            },
          ],
        },
        'v.intersect([v.object({a:v.string()}),v.object({b:v.string()})])',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: {
                a: {
                  type: 'string',
                },
              },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                b: {
                  type: 'string',
                },
              },
            },
          ],
          nullable: true,
        },
        'v.nullable(v.intersect([v.object({a:v.string()}),v.object({b:v.string()})]))',
      ],
      [
        {
          allOf: [
            {
              type: 'object',
              required: ['a'],
              properties: {
                a: {
                  type: 'string',
                },
              },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                b: {
                  type: 'string',
                },
              },
            },
          ],
          type: ['null'],
        },
        'v.nullable(v.intersect([v.object({a:v.string()}),v.object({b:v.string()})]))',
      ],
      [
        {
          allOf: [
            {
              $ref: '#/components/schemas/Base',
            },
            {
              default: 'hello',
            },
          ],
        },
        'v.optional(BaseSchema,"hello")',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('not', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ not: { type: 'string' } }, "v.custom<unknown>((v) => typeof v !== 'string')"],
      [
        { not: { type: 'integer' } },
        "v.custom<unknown>((v) => typeof v !== 'number' || !Number.isInteger(v))",
      ],
      [{ not: { type: 'boolean' } }, "v.custom<unknown>((v) => typeof v !== 'boolean')"],
      [
        { not: { type: 'string' }, nullable: true },
        "v.nullable(v.custom<unknown>((v) => typeof v !== 'string'))",
      ],
      [
        { not: { type: 'string' }, type: ['null'] } as JSONSchema,
        "v.nullable(v.custom<unknown>((v) => typeof v !== 'string'))",
      ],
      [{ not: { const: 42 } }, 'v.custom<unknown>((v) => v !== 42)'],
      [{ not: { enum: ['a', 'b'] } }, 'v.custom<unknown>((v) => !["a","b"].includes(v))'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('const', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ const: 'fixed' }, 'v.literal("fixed")'],
      [{ const: 'fixed', nullable: true }, 'v.nullable(v.literal("fixed"))'],
      [{ type: ['null'], const: 'fixed' }, 'v.nullable(v.literal("fixed"))'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('enum', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ enum: ['A', 'B'] }, 'v.picklist(["A","B"])'],
      [{ enum: ['A', 'B'], type: ['string'], nullable: true }, 'v.nullable(v.picklist(["A","B"]))'],
      [{ enum: ['A', 'B'], type: ['string', 'null'] }, 'v.nullable(v.picklist(["A","B"]))'],
      [{ enum: [1, 2] }, 'v.union([v.literal(1),v.literal(2)])'],
      [
        { enum: [1, 2], type: ['number'], nullable: true },
        'v.nullable(v.union([v.literal(1),v.literal(2)]))',
      ],
      [
        { enum: [1, 2], type: ['number', 'null'] },
        'v.nullable(v.union([v.literal(1),v.literal(2)]))',
      ],
      [{ enum: [true, false] }, 'v.union([v.literal(true),v.literal(false)])'],
      [
        { enum: [true, false], type: ['boolean'], nullable: true },
        'v.nullable(v.union([v.literal(true),v.literal(false)]))',
      ],
      [
        { enum: [true, false], type: ['boolean', 'null'] },
        'v.nullable(v.union([v.literal(true),v.literal(false)]))',
      ],
      [{ enum: [null] }, 'v.literal(null)'],
      [{ enum: [null], type: ['null'] }, 'v.nullable(v.literal(null))'],
      [{ enum: ['abc'] }, "v.literal('abc')"],
      [{ enum: ['abc'], type: ['string'], nullable: true }, "v.nullable(v.literal('abc'))"],
      [{ enum: ['abc'], type: ['string', 'null'] }, "v.nullable(v.literal('abc'))"],
      [{ type: 'array', enum: [[1, 2]] }, 'v.tuple([v.literal(1),v.literal(2)])'],
      [
        { type: 'array', nullable: true, enum: [[1, 2]] },
        'v.nullable(v.tuple([v.literal(1),v.literal(2)]))',
      ],
      [
        { type: ['array', 'null'], enum: [[1, 2]] },
        'v.nullable(v.tuple([v.literal(1),v.literal(2)]))',
      ],
      [
        {
          type: 'array',
          enum: [
            [1, 2],
            [3, 4],
          ],
        },
        'v.union([v.tuple([v.literal(1),v.literal(2)]),v.tuple([v.literal(3),v.literal(4)])])',
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
        'v.nullable(v.union([v.tuple([v.literal(1),v.literal(2)]),v.tuple([v.literal(3),v.literal(4)])]))',
      ],
      [
        {
          type: ['array', 'null'],
          enum: [
            [1, 2],
            [3, 4],
          ],
        },
        'v.nullable(v.union([v.tuple([v.literal(1),v.literal(2)]),v.tuple([v.literal(3),v.literal(4)])]))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('string', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string' }, 'v.string()'],
      [{ type: ['string'], nullable: true }, 'v.nullable(v.string())'],
      [{ type: ['string', 'null'] }, 'v.nullable(v.string())'],
      [
        { type: 'string', minLength: 1, maxLength: 10 },
        'v.pipe(v.string(),v.minLength(1),v.maxLength(10))',
      ],
      [{ type: 'string', pattern: '^\\w+$' }, 'v.pipe(v.string(),v.regex(/^\\w+$/))'],
      [{ type: 'string', default: 'test' }, 'v.optional(v.string(),"test")'],
      [
        { type: 'string', default: 'test', nullable: true },
        'v.nullable(v.optional(v.string(),"test"))',
      ],
      [{ type: ['string', 'null'], default: 'test' }, 'v.nullable(v.optional(v.string(),"test"))'],
      [{ type: 'string', format: 'email' }, 'v.pipe(v.string(),v.email())'],
      [{ type: 'string', format: 'uuid' }, 'v.pipe(v.string(),v.uuid())'],
      [{ type: 'string', format: 'uri' }, 'v.pipe(v.string(),v.url())'],
      [{ type: 'string', format: 'ipv4' }, 'v.pipe(v.string(),v.ipv4())'],
      [{ type: 'string', format: 'ipv6' }, 'v.pipe(v.string(),v.ipv6())'],
      [{ type: 'string', format: 'date-time' }, 'v.pipe(v.string(),v.isoDateTime())'],
      [{ type: 'string', format: 'base64' }, 'v.pipe(v.string(),v.base64())'],
      [{ type: 'string', format: 'emoji' }, 'v.pipe(v.string(),v.emoji())'],
      [{ type: 'string', format: 'date' }, 'v.pipe(v.string(),v.isoDate())'],
      [{ type: 'string', format: 'time' }, 'v.pipe(v.string(),v.isoTime())'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('number', () => {
    describe('type: number', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'number' }, 'v.number()'],
        [{ type: ['number'], nullable: true }, 'v.nullable(v.number())'],
        [{ type: ['number', 'null'] }, 'v.nullable(v.number())'],
        [{ type: 'number', minimum: 0 }, 'v.pipe(v.number(),v.minValue(0))'],
        [{ type: 'number', minimum: 100 }, 'v.pipe(v.number(),v.minValue(100))'],
        [{ type: 'number', maximum: 100 }, 'v.pipe(v.number(),v.maxValue(100))'],
        [{ type: 'number', maximum: 0 }, 'v.pipe(v.number(),v.maxValue(0))'],
        [{ type: 'number', exclusiveMinimum: 10 }, 'v.pipe(v.number(),v.minValue(10))'],
        [{ type: 'number', exclusiveMaximum: 10 }, 'v.pipe(v.number(),v.maxValue(10))'],
        [{ type: 'number', multipleOf: 2 }, 'v.pipe(v.number(),v.multipleOf(2))'],
        [{ type: 'number', default: 100 }, 'v.optional(v.number(),100)'],
        [
          { type: 'number', default: 100, nullable: true },
          'v.nullable(v.optional(v.number(),100))',
        ],
        [{ type: ['number', 'null'], default: 100 }, 'v.nullable(v.optional(v.number(),100))'],
      ])('valibot(%o) → %s', (input, expected) => {
        expect(valibot(input)).toBe(expected)
      })
    })
  })

  describe('integer', () => {
    describe('type: integer', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'integer' }, 'v.pipe(v.number(),v.integer())'],
        [{ type: ['integer'], nullable: true }, 'v.nullable(v.pipe(v.number(),v.integer()))'],
        [{ type: ['integer', 'null'] }, 'v.nullable(v.pipe(v.number(),v.integer()))'],
        [{ type: 'integer', minimum: 100 }, 'v.pipe(v.number(),v.integer(),v.minValue(100))'],
        [{ type: 'integer', minimum: 0 }, 'v.pipe(v.number(),v.integer(),v.minValue(0))'],
        [{ type: 'integer', maximum: 100 }, 'v.pipe(v.number(),v.integer(),v.maxValue(100))'],
        [{ type: 'integer', maximum: 0 }, 'v.pipe(v.number(),v.integer(),v.maxValue(0))'],
        [
          { type: 'integer', exclusiveMinimum: 10 },
          'v.pipe(v.number(),v.integer(),v.minValue(10))',
        ],
        [
          { type: 'integer', exclusiveMaximum: 10 },
          'v.pipe(v.number(),v.integer(),v.maxValue(10))',
        ],
        [{ type: 'integer', multipleOf: 2 }, 'v.pipe(v.number(),v.integer(),v.multipleOf(2))'],
        [{ type: 'integer', default: 100 }, 'v.optional(v.pipe(v.number(),v.integer()),100)'],
        [
          { type: 'integer', default: 100, nullable: true },
          'v.nullable(v.optional(v.pipe(v.number(),v.integer()),100))',
        ],
        [
          { type: ['integer', 'null'], default: 100 },
          'v.nullable(v.optional(v.pipe(v.number(),v.integer()),100))',
        ],
      ])('valibot(%o) → %s', (input, expected) => {
        expect(valibot(input)).toBe(expected)
      })
    })

    describe('type: integer, format: bigint', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ type: 'integer', format: 'bigint' }, 'v.bigint()'],
        [{ type: 'integer', format: 'bigint', nullable: true }, 'v.nullable(v.bigint())'],
        [{ type: ['integer', 'null'], format: 'bigint' }, 'v.nullable(v.bigint())'],
        [
          { type: 'integer', format: 'bigint', minimum: 100 },
          'v.pipe(v.bigint(),v.minValue(BigInt(100)))',
        ],
        [
          { type: 'integer', format: 'bigint', minimum: 0 },
          'v.pipe(v.bigint(),v.minValue(BigInt(0)))',
        ],
        [
          { type: 'integer', format: 'bigint', maximum: 100 },
          'v.pipe(v.bigint(),v.maxValue(BigInt(100)))',
        ],
        [
          { type: 'integer', format: 'bigint', maximum: 0 },
          'v.pipe(v.bigint(),v.maxValue(BigInt(0)))',
        ],
      ])('valibot(%o) → %s', (input, expected) => {
        expect(valibot(input)).toBe(expected)
      })
    })
  })

  describe('boolean', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'boolean' }, 'v.boolean()'],
      [{ type: ['boolean'], nullable: true }, 'v.nullable(v.boolean())'],
      [{ type: ['boolean', 'null'] }, 'v.nullable(v.boolean())'],
      [{ type: 'boolean', default: true }, 'v.optional(v.boolean(),true)'],
      [{ type: 'boolean', default: false }, 'v.optional(v.boolean(),false)'],
      [{ type: 'boolean', nullable: true }, 'v.nullable(v.boolean())'],
      [{ type: ['boolean', 'null'] }, 'v.nullable(v.boolean())'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('array', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'array', items: { type: 'string' } }, 'v.array(v.string())'],
      [
        { type: 'array', items: { type: 'string', nullable: true } },
        'v.array(v.nullable(v.string()))',
      ],
      [{ type: 'array', items: { type: ['string', 'null'] } }, 'v.array(v.nullable(v.string()))'],
      [
        { type: 'array', nullable: true, items: { type: ['string', 'null'] } },
        'v.nullable(v.array(v.nullable(v.string())))',
      ],
      [{ type: 'array', items: { type: 'number' } }, 'v.array(v.number())'],
      [
        { type: 'array', items: { type: 'number', nullable: true } },
        'v.array(v.nullable(v.number()))',
      ],
      [{ type: 'array', items: { type: ['number', 'null'] } }, 'v.array(v.nullable(v.number()))'],
      [
        { type: 'array', nullable: true, items: { type: ['number', 'null'] } },
        'v.nullable(v.array(v.nullable(v.number())))',
      ],
      [{ type: 'array', items: { type: 'boolean' } }, 'v.array(v.boolean())'],
      [
        { type: 'array', items: { type: 'boolean', nullable: true } },
        'v.array(v.nullable(v.boolean()))',
      ],
      [{ type: 'array', items: { type: ['boolean', 'null'] } }, 'v.array(v.nullable(v.boolean()))'],
      [
        { type: 'array', nullable: true, items: { type: ['boolean', 'null'] } },
        'v.nullable(v.array(v.nullable(v.boolean())))',
      ],
      [{ type: 'array', items: { type: 'object' } }, 'v.array(v.object({}))'],
      [
        { type: 'array', items: { type: 'object', nullable: true } },
        'v.array(v.nullable(v.object({})))',
      ],
      [{ type: 'array', items: { type: ['object', 'null'] } }, 'v.array(v.nullable(v.object({})))'],
      [
        { type: 'array', nullable: true, items: { type: ['object', 'null'] } },
        'v.nullable(v.array(v.nullable(v.object({}))))',
      ],
      [
        {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        'v.array(v.array(v.string()))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 1 },
        'v.pipe(v.array(v.string()),v.minLength(1))',
      ],
      [
        { type: 'array', items: { type: 'string' }, maxItems: 10 },
        'v.pipe(v.array(v.string()),v.maxLength(10))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
        'v.pipe(v.array(v.string()),v.minLength(1),v.maxLength(10))',
      ],
      [
        { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
        'v.pipe(v.array(v.string()),v.length(5))',
      ],
      [
        {
          type: 'array',
          items: {
            anyOf: [
              {
                type: 'string',
              },
              {
                type: 'number',
              },
              {
                type: 'boolean',
              },
            ],
          },
        },
        'v.array(v.union([v.string(),v.number(),v.boolean()]))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('object', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'object' }, 'v.object({})'],
      [{ type: 'object', nullable: true }, 'v.nullable(v.object({}))'],
      [{ type: ['object', 'null'] }, 'v.nullable(v.object({}))'],
      [
        { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
        'v.object({foo:v.string()})',
      ],
      [
        {
          type: 'object',
          properties: { foo: { type: 'string' } },
          required: ['foo'],
          nullable: true,
        },
        'v.nullable(v.object({foo:v.string()}))',
      ],
      [
        {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['A', 'B', 'C'],
            },
          },
          required: ['type'],
          discriminator: {
            propertyName: 'type',
          },
        },
        'v.object({type:v.picklist(["A","B","C"])})',
      ],
      [
        {
          type: 'object',
          properties: {
            test: {
              type: 'string',
            },
          },
          required: ['test'],
          additionalProperties: false,
        },
        'v.strictObject({test:v.string()})',
      ],
      [
        {
          type: 'object',
          properties: {
            test: {
              type: 'string',
            },
          },
          required: ['test'],
          additionalProperties: true,
        },
        'v.looseObject({test:v.string()})',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('date', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'date' }, 'v.date()'],
      [{ type: 'date', nullable: true }, 'v.nullable(v.date())'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('null', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'null' }, 'v.nullable(v.null())'],
      [{ type: 'null', nullable: true }, 'v.nullable(v.null())'],
      [{ type: ['null'] }, 'v.nullable(v.null())'],
      [{ type: 'null', default: 'test' }, 'v.nullable(v.optional(v.null(),"test"))'],
      [{ type: ['null'], default: 'test' }, 'v.nullable(v.optional(v.null(),"test"))'],
      [
        { type: 'null', nullable: true, default: 'test' },
        'v.nullable(v.optional(v.null(),"test"))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('any', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          type: 'any' as any,
        },
        'v.any()',
      ],
      [
        {
          type: 'any' as any,
          nullable: true,
        },
        'v.nullable(v.any())',
      ],
      [
        {
          type: ['any' as any, 'null'],
        },
        'v.nullable(v.any())',
      ],
      [
        {
          type: 'any' as any,
          default: 'test',
        },
        'v.optional(v.any(),"test")',
      ],
      [
        {
          type: 'any' as any,
          nullable: true,
          default: 'test',
        },
        'v.nullable(v.optional(v.any(),"test"))',
      ],
      [
        {
          type: ['any' as any, 'null'],
          default: 'test',
        },
        'v.nullable(v.optional(v.any(),"test"))',
      ],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('openapi', () => {
    describe('ref with openapi option', () => {
      it.concurrent.each<[JSONSchema, string]>([
        // schemas → Schema suffix
        [{ $ref: '#/components/schemas/User' }, 'UserSchema'],
        [{ $ref: '#/components/schemas/user-profile' }, 'UserProfileSchema'],
        // parameters → ParamsSchema suffix
        [{ $ref: '#/components/parameters/UserId' }, 'UserIdParamsSchema'],
        // headers → HeaderSchema suffix
        [{ $ref: '#/components/headers/X-Request-Id' }, 'XRequestIdHeaderSchema'],
        // responses → Response suffix
        [{ $ref: '#/components/responses/NotFound' }, 'NotFoundResponse'],
        // securitySchemes → SecurityScheme suffix
        [{ $ref: '#/components/securitySchemes/Bearer' }, 'BearerSecurityScheme'],
        // requestBodies → RequestBody suffix
        [{ $ref: '#/components/requestBodies/CreateUser' }, 'CreateUserRequestBody'],
        // array of refs
        [{ type: 'array', items: { $ref: '#/components/schemas/Pet' } }, 'v.array(PetSchema)'],
        // definitions/$defs fallback (not OpenAPI component path)
        [{ $ref: '#/definitions/Address' }, 'AddressSchema'],
        [{ $ref: '#/$defs/Address' }, 'AddressSchema'],
      ])('valibot(%o, "Schema", false, { openapi: true }) → %s', (input, expected) => {
        expect(valibot(input, 'Schema', false, { openapi: true })).toBe(expected)
      })
    })

    describe('ref with openapi and isValibot', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/User' }, 'v.lazy(() => UserSchema)'],
        [{ $ref: '#/components/parameters/UserId' }, 'v.lazy(() => UserIdParamsSchema)'],
        [{ $ref: '#/components/schemas/Tree' }, 'v.lazy(() => TreeSchema)'],
      ])('valibot(%o, "TreeSchema", true, { openapi: true }) → %s', (input, expected) => {
        expect(valibot(input, 'TreeSchema', true, { openapi: true })).toBe(expected)
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
        expect(valibot(schema, 'Schema', false, { openapi: true })).toBe(
          'v.object({pet:PetSchema,owner:v.optional(UserProfileSchema)})',
        )
      })
    })

    describe('combinators with openapi refs', () => {
      it('should resolve oneOf $refs with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        }
        expect(valibot(schema, 'Schema', false, { openapi: true })).toBe(
          'v.union([CatSchema,DogSchema])',
        )
      })
    })

    describe('openapi edge cases', () => {
      it.concurrent.each<[JSONSchema, string, string]>([
        // Self-reference: resolved name equals rootName
        [{ $ref: '#/components/schemas/User' }, 'UserSchema', 'v.lazy(() => UserSchema)'],
        // Nullable ref with openapi (double-wrapped: ref() wraps, then valibot() wraps again)
        [
          { $ref: '#/components/schemas/Pet', nullable: true },
          'TestSchema',
          'v.nullable(v.nullable(PetSchema))',
        ],
        // allOf with openapi ref
        [{ allOf: [{ $ref: '#/components/schemas/Base' }] }, 'TestSchema', 'BaseSchema'],
        // anyOf with openapi ref and inline
        [
          { anyOf: [{ $ref: '#/components/schemas/A' }, { type: 'string' }] },
          'TestSchema',
          'v.union([ASchema,v.string()])',
        ],
        // URL-encoded $ref with openapi
        [{ $ref: '#/components/schemas/My%20Schema' }, 'TestSchema', 'MySchemaSchema'],
      ])('valibot(%o, %s, false, { openapi: true }) → %s', (input, rootName, expected) => {
        expect(valibot(input, rootName, false, { openapi: true })).toBe(expected)
      })
    })
  })

  describe('ref edge cases (non-openapi)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      // Relative reference (#SomeRef)
      [{ $ref: '#SomeRef' }, 'SomeRefSchema'],
      // External file with fragment
      [{ $ref: 'other.json#/definitions/Foo' }, 'v.unknown()'],
      // HTTP URL reference with .json
      [{ $ref: 'https://example.com/schemas/User.json' }, 'User'],
      // HTTP URL without .json
      [{ $ref: 'https://example.com/schemas/User' }, 'User'],
      // Fallback to any (no # and no http)
      [{ $ref: 'relative/path' }, 'v.any()'],
      // Self reference #
      [{ $ref: '#' }, 'v.lazy(() => Schema)'],
    ])('valibot(%o) → %s', (input, expected) => {
      expect(valibot(input)).toBe(expected)
    })
  })

  describe('empty combinators', () => {
    it('should handle empty oneOf', () => {
      expect(valibot({ oneOf: [] })).toBe('v.any()')
    })

    it('should handle empty anyOf', () => {
      expect(valibot({ anyOf: [] })).toBe('v.any()')
    })
  })

  describe('wrap edge cases', () => {
    it('should handle nullable via type array with null', () => {
      expect(valibot({ type: ['string', 'null'] })).toBe('v.nullable(v.string())')
    })

    it('should handle default with nullable', () => {
      expect(valibot({ type: 'string', nullable: true, default: 'x' })).toBe(
        'v.nullable(v.optional(v.string(),"x"))',
      )
    })
  })

  describe('readonly option', () => {
    it('should add v.readonly() to object', () => {
      expect(
        valibot(
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          'Schema',
          false,
          { readonly: true },
        ),
      ).toBe('v.pipe(v.object({name:v.string()}),v.readonly())')
    })

    it('should add v.readonly() to array', () => {
      expect(
        valibot({ type: 'array', items: { type: 'string' } }, 'Schema', false, {
          readonly: true,
        }),
      ).toBe('v.pipe(v.array(v.string()),v.readonly())')
    })

    it('should not add v.readonly() to string', () => {
      expect(valibot({ type: 'string' }, 'Schema', false, { readonly: true })).toBe('v.string()')
    })
  })

  describe('x-brand', () => {
    it('should add v.brand() for string', () => {
      expect(valibot({ type: 'string', 'x-brand': 'UserId' })).toBe(
        'v.pipe(v.string(),v.brand("UserId"))',
      )
    })

    it('should add v.brand() for number with constraints', () => {
      expect(valibot({ type: 'number', minimum: 0, 'x-brand': 'Price' })).toBe(
        'v.pipe(v.pipe(v.number(),v.minValue(0)),v.brand("Price"))',
      )
    })

    it('should add v.brand() after v.nullable()', () => {
      expect(valibot({ type: 'string', nullable: true, 'x-brand': 'Email' })).toBe(
        'v.pipe(v.nullable(v.string()),v.brand("Email"))',
      )
    })

    it('should add v.brand() after v.optional()', () => {
      expect(valibot({ type: 'string', default: 'foo', 'x-brand': 'Name' })).toBe(
        'v.pipe(v.optional(v.string(),"foo"),v.brand("Name"))',
      )
    })

    it('should add v.brand() for integer', () => {
      expect(valibot({ type: 'integer', minimum: 0, 'x-brand': 'Quantity' })).toBe(
        'v.pipe(v.pipe(v.number(),v.integer(),v.minValue(0)),v.brand("Quantity"))',
      )
    })

    it('should add v.brand() for array', () => {
      expect(
        valibot({ type: 'array', items: { type: 'string' }, minItems: 1, 'x-brand': 'Tags' }),
      ).toBe('v.pipe(v.pipe(v.array(v.string()),v.minLength(1)),v.brand("Tags"))')
    })
  })
})
