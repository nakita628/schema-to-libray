import { describe, expect, it } from 'vite-plus/test'

import type { JSONSchema } from '../../helper/index.js'
import { arktype } from './arktype.js'

// Test run
// pnpm vitest run ./src/generator/arktype/arktype.test.ts

describe('arktype', () => {
  describe('ref', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ $ref: '#/components/schemas/User' } as JSONSchema, '"User"'],
      [{ $ref: '#/components/schemas/UserProfile' } as JSONSchema, '"UserProfile"'],
      [{ $ref: '#/definitions/Item' } as JSONSchema, '"Item"'],
      [{ $ref: '#/$defs/Address' } as JSONSchema, '"Address"'],
      [{ $ref: '#' } as JSONSchema, '"Schema"'],
      [{ $ref: '' } as JSONSchema, '"unknown"'],
      [{ $ref: '#/components/schemas/User', nullable: true } as JSONSchema, '"User | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('oneOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        } as JSONSchema,
        '"string | number"',
      ],
      [
        {
          oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
        } as JSONSchema,
        '"A | B"',
      ],
      [
        {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          nullable: true,
        } as JSONSchema,
        '"string | number | null"',
      ],
      [{ oneOf: [] } as JSONSchema, '"unknown"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('anyOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        } as JSONSchema,
        '"string | number"',
      ],
      [
        {
          anyOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        } as JSONSchema,
        '"Cat | Dog"',
      ],
      [
        {
          anyOf: [{ type: 'string' }, { type: 'boolean' }],
          nullable: true,
        } as JSONSchema,
        '"string | boolean | null"',
      ],
      [{ anyOf: [] } as JSONSchema, '"unknown"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('allOf', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [
        {
          allOf: [{ type: 'string' }, { type: 'number' }],
        } as JSONSchema,
        '"string & number"',
      ],
      [
        {
          allOf: [{ $ref: '#/components/schemas/A' }],
        } as JSONSchema,
        '"A"',
      ],
      [
        {
          allOf: [{ type: 'string' }, { type: 'number' }],
          nullable: true,
        } as JSONSchema,
        '"string & number | null"',
      ],
      [{ allOf: [] } as JSONSchema, '"unknown"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('not', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ not: { type: 'string' } } as JSONSchema, '"unknown"'],
      [{ not: { type: 'integer' } } as JSONSchema, '"unknown"'],
      [{ not: { type: 'boolean' } } as JSONSchema, '"unknown"'],
      [{ not: { type: 'string' }, nullable: true } as JSONSchema, '"unknown | null"'],
      [{ not: { type: 'string' }, type: ['null'] } as JSONSchema, '"unknown | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('const', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ const: 'fixed' } as JSONSchema, '"\'fixed\'"'],
      [{ const: 42 } as JSONSchema, '"42"'],
      [{ const: true } as JSONSchema, '"true"'],
      [{ const: 'fixed', nullable: true } as JSONSchema, '"\'fixed\' | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('enum', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ enum: ['A', 'B', 'C'] } as JSONSchema, "\"'A' | 'B' | 'C'\""],
      [{ enum: ['A', 'B'], nullable: true } as JSONSchema, "\"'A' | 'B' | null\""],
      [{ enum: [1, 2, 3] } as JSONSchema, '"1 | 2 | 3"'],
      [{ enum: [true, false] } as JSONSchema, '"true | false"'],
      [{ enum: ['only'] } as JSONSchema, '"\'only\'"'],
      [{ enum: [null] } as JSONSchema, '"null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('string', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'string' } as JSONSchema, '"string"'],
      [{ type: 'string', nullable: true } as JSONSchema, '"string | null"'],
      [{ type: ['string', 'null'] } as JSONSchema, '"string | null"'],
      [{ type: 'string', format: 'email' } as JSONSchema, '"string.email"'],
      [{ type: 'string', format: 'uuid' } as JSONSchema, '"string.uuid"'],
      [{ type: 'string', format: 'uri' } as JSONSchema, '"string.url"'],
      [{ type: 'string', format: 'ipv4' } as JSONSchema, '"string.ip"'],
      [{ type: 'string', format: 'ipv6' } as JSONSchema, '"string.ip"'],
      [{ type: 'string', format: 'date-time' } as JSONSchema, '"string.date.iso"'],
      [{ type: 'string', format: 'date' } as JSONSchema, '"string.date"'],
      [{ type: 'string', minLength: 1 } as JSONSchema, 'type("string >= 1")'],
      [{ type: 'string', maxLength: 100 } as JSONSchema, 'type("string <= 100")'],
      [{ type: 'string', minLength: 3, maxLength: 20 } as JSONSchema, 'type("3 <= string <= 20")'],
      [{ type: 'string', minLength: 5, maxLength: 5 } as JSONSchema, 'type("string == 5")'],
      [{ type: 'string', pattern: '^\\w+$' } as JSONSchema, 'type("string").and(/^\\w+$/)'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('number', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'number' } as JSONSchema, '"number"'],
      [{ type: 'number', nullable: true } as JSONSchema, '"number | null"'],
      [{ type: ['number', 'null'] } as JSONSchema, '"number | null"'],
      [{ type: 'number', minimum: 0 } as JSONSchema, '"number >= 0"'],
      [{ type: 'number', maximum: 100 } as JSONSchema, '"number <= 100"'],
      [{ type: 'number', minimum: 0, maximum: 100 } as JSONSchema, '"number >= 0 <= 100"'],
      [{ type: 'number', exclusiveMinimum: 0 } as JSONSchema, '"number > 0"'],
      [{ type: 'number', exclusiveMaximum: 100 } as JSONSchema, '"number < 100"'],
      [{ type: 'number', multipleOf: 2 } as JSONSchema, '"number % 2"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('integer', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'integer' } as JSONSchema, '"number.integer"'],
      [{ type: 'integer', nullable: true } as JSONSchema, '"number.integer | null"'],
      [{ type: ['integer', 'null'] } as JSONSchema, '"number.integer | null"'],
      [{ type: 'integer', minimum: 0 } as JSONSchema, '"number.integer >= 0"'],
      [{ type: 'integer', maximum: 100 } as JSONSchema, '"number.integer <= 100"'],
      [{ type: 'integer', exclusiveMinimum: 0 } as JSONSchema, '"number.integer > 0"'],
      [{ type: 'integer', exclusiveMaximum: 100 } as JSONSchema, '"number.integer < 100"'],
      [{ type: 'integer', multipleOf: 5 } as JSONSchema, '"number.integer % 5"'],
      [{ type: 'integer', format: 'bigint' } as JSONSchema, '"bigint"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('boolean', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'boolean' } as JSONSchema, '"boolean"'],
      [{ type: 'boolean', nullable: true } as JSONSchema, '"boolean | null"'],
      [{ type: ['boolean', 'null'] } as JSONSchema, '"boolean | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('array', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'array', items: { type: 'string' } } as JSONSchema, '"string[]"'],
      [{ type: 'array', items: { type: 'number' } } as JSONSchema, '"number[]"'],
      [{ type: 'array', items: { type: 'boolean' } } as JSONSchema, '"boolean[]"'],
      [
        {
          type: 'array',
          items: { type: 'string' },
          nullable: true,
        } as JSONSchema,
        '"string[] | null"',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
        } as JSONSchema,
        'type("string[]").and(type("unknown[] >= 1"))',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          maxItems: 10,
        } as JSONSchema,
        'type("string[]").and(type("unknown[] <= 10"))',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 10,
        } as JSONSchema,
        'type("string[]").and(type("1 <= unknown[] <= 10"))',
      ],
      [
        {
          type: 'array',
          items: { type: 'string' },
          minItems: 5,
          maxItems: 5,
        } as JSONSchema,
        'type("string[]").and(type("unknown[] == 5"))',
      ],
      [{ type: 'array' } as JSONSchema, '"unknown[]"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('object', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'object' } as JSONSchema, 'type({})'],
      [
        {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        } as JSONSchema,
        'type({name:"string"})',
      ],
      [
        {
          type: 'object',
          properties: { name: { type: 'string' } },
        } as JSONSchema,
        'type({"name?":"string"})',
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
        'type({name:"string","age?":"number.integer"})',
      ],
      [
        {
          type: 'object',
          properties: { test: { type: 'string' } },
          required: ['test'],
          additionalProperties: false,
        } as JSONSchema,
        'type({test:"string","+":"reject"})',
      ],
      [
        {
          type: 'object',
          properties: {
            kind: { const: 'A' },
          },
          required: ['kind'],
        } as JSONSchema,
        'type({kind:"\'A\'"})',
      ],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('date', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'date' } as JSONSchema, '"Date"'],
      [{ type: 'date', nullable: true } as JSONSchema, '"Date | null"'],
      [{ type: ['date', 'null'] } as JSONSchema, '"Date | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('null', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{ type: 'null' } as JSONSchema, '"null | null"'],
      [{ type: 'null', nullable: true } as JSONSchema, '"null | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('unknown (fallback)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      [{} as JSONSchema, '"unknown"'],
      [{ nullable: true } as JSONSchema, '"unknown | null"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('openapi', () => {
    describe('ref with openapi option', () => {
      it.concurrent.each<[JSONSchema, string]>([
        [{ $ref: '#/components/schemas/User' }, '"UserSchema"'],
        [{ $ref: '#/components/schemas/user-profile' }, '"UserProfileSchema"'],
        [{ $ref: '#/components/parameters/UserId' }, '"UserIdParamsSchema"'],
        [{ $ref: '#/components/headers/X-Request-Id' }, '"XRequestIdHeaderSchema"'],
        [{ $ref: '#/components/responses/NotFound' }, '"NotFoundResponse"'],
        [{ $ref: '#/components/securitySchemes/Bearer' }, '"BearerSecurityScheme"'],
        [{ $ref: '#/components/requestBodies/CreateUser' }, '"CreateUserRequestBody"'],
        [{ $ref: '#/definitions/Address' }, '"Address"'],
        [{ $ref: '#/$defs/Address' }, '"Address"'],
      ])('arktype(%o, "Schema", false, { openapi: true }) → %s', (input, expected) => {
        expect(arktype(input, 'Schema', false, { openapi: true })).toBe(expected)
      })
    })

    describe('object with openapi refs', () => {
      it('should resolve $ref in object properties with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          type: 'object',
          properties: {
            pet: { $ref: '#/components/schemas/Pet' },
          },
          required: ['pet'],
        }
        expect(arktype(schema, 'Schema', false, { openapi: true })).toBe('type({pet:"PetSchema"})')
      })
    })

    describe('combinators with openapi refs', () => {
      it('should resolve oneOf $refs with OpenAPI suffixes', () => {
        const schema: JSONSchema = {
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
        }
        expect(arktype(schema, 'Schema', false, { openapi: true })).toBe('"CatSchema | DogSchema"')
      })
    })

    describe('openapi edge cases', () => {
      it.concurrent.each<[JSONSchema, string, string]>([
        // Self-reference: resolved name equals rootName (arktype wraps in quotes)
        [{ $ref: '#/components/schemas/User' }, 'UserSchema', '"UserSchema"'],
        // Nullable ref with openapi
        [{ $ref: '#/components/schemas/Pet', nullable: true }, 'TestSchema', '"PetSchema | null"'],
        // allOf with openapi ref
        [{ allOf: [{ $ref: '#/components/schemas/Base' }] }, 'TestSchema', '"BaseSchema"'],
        // anyOf with openapi ref and inline
        [
          { anyOf: [{ $ref: '#/components/schemas/A' }, { type: 'string' }] },
          'TestSchema',
          '"ASchema | string"',
        ],
        // URL-encoded $ref with openapi
        [{ $ref: '#/components/schemas/My%20Schema' }, 'TestSchema', '"MySchemaSchema"'],
      ])('arktype(%o, %s, false, { openapi: true }) → %s', (input, rootName, expected) => {
        expect(arktype(input, rootName, false, { openapi: true })).toBe(expected)
      })
    })
  })

  describe('ref edge cases (non-openapi)', () => {
    it.concurrent.each<[JSONSchema, string]>([
      // Relative reference (#SomeRef)
      [{ $ref: '#SomeRef' }, '"SomeRef"'],
      // External file or URL without fragment → unknown
      [{ $ref: 'other.json#/definitions/Foo' }, '"unknown"'],
      [{ $ref: 'https://example.com/schemas/User.json' }, '"unknown"'],
      [{ $ref: 'relative/path' }, '"unknown"'],
      // Self reference #
      [{ $ref: '#' }, '"Schema"'],
    ])('arktype(%o) → %s', (input, expected) => {
      expect(arktype(input)).toBe(expected)
    })
  })

  describe('empty combinators', () => {
    it('should handle empty oneOf', () => {
      expect(arktype({ oneOf: [] })).toBe('"unknown"')
    })

    it('should handle empty anyOf', () => {
      expect(arktype({ anyOf: [] })).toBe('"unknown"')
    })
  })

  describe('wrap edge cases', () => {
    it('should handle nullable via type array with null', () => {
      expect(arktype({ type: ['string', 'null'] })).toBe('"string | null"')
    })
  })

  describe('readonly option', () => {
    it('should add .readonly() to object', () => {
      expect(
        arktype(
          { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
          'Schema',
          false,
          { readonly: true },
        ),
      ).toBe('type({name:"string"}).readonly()')
    })

    it('should not add .readonly() to string', () => {
      expect(arktype({ type: 'string' }, 'Schema', false, { readonly: true })).toBe('"string"')
    })
  })
})
