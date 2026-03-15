import { describe, expect, it } from 'vitest'
import { schemaToZod } from './index.js'

// Test run
// pnpm vitest run ./src/zod/index.test.ts

describe('schemaToZod', () => {
  it('should generate simple schema without definitions', () => {
    const result = schemaToZod({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import * as z from 'zod'

export const Schema = z.object({name:z.string(),age:z.number().optional()})

export type Schema = z.infer<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToZod({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import * as z from 'zod'

export const User = z.object({name:z.string()}).partial()

export type User = z.infer<typeof User>`
    expect(result).toBe(expected)
  })

  it('should generate schema with self-referencing types', () => {
    const result = schemaToZod({
      title: 'Node',
      type: 'object',
      definitions: {
        Node: {
          type: 'object',
          properties: {
            children: {
              type: 'array',
              items: { $ref: '#/definitions/Node' },
            },
          },
        },
      },
    })
    const expected = `import * as z from 'zod'

type _Node = {children?: _Node[]}

export const Node: z.ZodType<_Node> = z.object({children:z.array(z.lazy(() => Node))}).partial()

export type Node = z.infer<typeof Node>`
    expect(result).toBe(expected)
  })

  it('should generate schema with multiple definitions', () => {
    const result = schemaToZod({
      title: 'A',
      type: 'object',
      properties: {
        b: { $ref: '#/definitions/B' },
      },
      definitions: {
        B: {
          type: 'object',
          properties: {
            c: { $ref: '#/definitions/C' },
          },
        },
        C: { type: 'string' },
      },
    })
    const expected = `import * as z from 'zod'

type _A = {b?: _B}

type _C = string

type _B = {c?: _C}

const C: z.ZodType<_C> = z.string()

const B: z.ZodType<_B> = z.object({c:z.lazy(() => C)}).partial()

export const A: z.ZodType<_A> = z.object({b:z.lazy(() => B)}).partial()

export type A = z.infer<typeof A>`
    expect(result).toBe(expected)
  })

  it('should handle schema with $defs instead of definitions', () => {
    const result = schemaToZod({
      title: 'User',
      type: 'object',
      $defs: {
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
          },
        },
      },
      properties: {
        address: { $ref: '#/$defs/Address' },
      },
    })
    const expected = `import * as z from 'zod'

type _User = {address?: _Address}

type _Address = {street?: string}

const Address: z.ZodType<_Address> = z.object({street:z.string()}).partial()

export const User: z.ZodType<_User> = z.object({address:z.lazy(() => Address)}).partial()

export type User = z.infer<typeof User>`
    expect(result).toBe(expected)
  })

  it('should handle circular dependencies gracefully', () => {
    const result = schemaToZod({
      title: 'A',
      type: 'object',
      definitions: {
        A: {
          type: 'object',
          properties: {
            b: { $ref: '#/definitions/B' },
          },
        },
        B: {
          type: 'object',
          properties: {
            a: { $ref: '#/definitions/A' },
          },
        },
      },
    })
    console.log(result)
    const expected = `import * as z from 'zod'

type _A = {b?: _B}

type _B = {a?: _A}

const B: z.ZodType<_B> = z.object({a:z.lazy(() => A)}).partial()

export const A: z.ZodType<_A> = z.object({b:z.lazy(() => B)}).partial()

export type A = z.infer<typeof A>`
    expect(result).toBe(expected)
  })

  it('should handle schema with direct self reference', () => {
    const result = schemaToZod({
      title: 'Schema',
      type: 'object',
      properties: {
        children: {
          type: 'array',
          items: { $ref: '#' },
        },
      },
    })
    const expected = `import * as z from 'zod'

type _Schema = {children?: z.infer<typeof Schema>[]}

export const Schema: z.ZodType<_Schema> = z.object({children:z.array(z.lazy(() => Schema))}).partial()

export type Schema = z.infer<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle schema without title', () => {
    const result = schemaToZod({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import * as z from 'zod'

export const Schema = z.object({name:z.string()}).partial()

export type Schema = z.infer<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle schema with oneOf', () => {
    const result = schemaToZod({
      title: 'Union',
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Union = z.object({value:z.union([z.string(),z.number()])}).partial()

export type Union = z.infer<typeof Union>`
    expect(result).toBe(expected)
  })

  it('should handle schema with anyOf', () => {
    const result = schemaToZod({
      title: 'AnyOf',
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const AnyOf = z.object({value:z.union([z.string(),z.number()])}).partial()

export type AnyOf = z.infer<typeof AnyOf>`
    expect(result).toBe(expected)
  })

  it('should handle schema with allOf', () => {
    const result = schemaToZod({
      title: 'AllOf',
      type: 'object',
      properties: {
        value: {
          allOf: [
            { type: 'object', properties: { name: { type: 'string' } } },
            { type: 'object', properties: { age: { type: 'number' } } },
          ],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const AllOf = z.object({value:z.intersection(z.object({name:z.string()}).partial(),z.object({age:z.number()}).partial())}).partial()

export type AllOf = z.infer<typeof AllOf>`
    expect(result).toBe(expected)
  })

  it('should handle schema with enum', () => {
    const result = schemaToZod({
      title: 'Enum',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Enum = z.object({status:z.enum(["active","inactive"])}).partial()

export type Enum = z.infer<typeof Enum>`
    expect(result).toBe(expected)
  })

  it('should handle schema with const', () => {
    const result = schemaToZod({
      title: 'Const',
      type: 'object',
      properties: {
        type: {
          const: 'user',
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Const = z.object({type:z.literal("user")}).partial()

export type Const = z.infer<typeof Const>`
    expect(result).toBe(expected)
  })

  it('should handle schema with array', () => {
    const result = schemaToZod({
      title: 'Array',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Array = z.object({items:z.array(z.string())}).partial()

export type Array = z.infer<typeof Array>`
    expect(result).toBe(expected)
  })

  it('should handle schema with nested objects', () => {
    const result = schemaToZod({
      title: 'Nested',
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Nested = z.object({user:z.object({name:z.string(),age:z.number()}).partial()}).partial()

export type Nested = z.infer<typeof Nested>`
    expect(result).toBe(expected)
  })

  it('should handle schema with required properties', () => {
    const result = schemaToZod({
      title: 'Required',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    })
    const expected = `import * as z from 'zod'

export const Required = z.object({name:z.string(),age:z.number()})

export type Required = z.infer<typeof Required>`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToZod({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import * as z from 'zod'

export const Additional = z.record(z.string(),z.string())

export type Additional = z.infer<typeof Additional>`
    expect(result).toBe(expected)
  })

  it('should handle schema with format', () => {
    const result = schemaToZod({
      title: 'Format',
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
        },
        uuid: {
          type: 'string',
          format: 'uuid',
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Format = z.object({email:z.email(),uuid:z.uuid()}).partial()

export type Format = z.infer<typeof Format>`
    expect(result).toBe(expected)
  })

  it('should handle schema with pattern', () => {
    const result = schemaToZod({
      title: 'Pattern',
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          pattern: '^d+$',
        },
      },
    })

    const expected = `import * as z from 'zod'

export const Pattern = z.object({phone:z.string().regex(/^d+$/)}).partial()

export type Pattern = z.infer<typeof Pattern>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minimum/maximum', () => {
    const result = schemaToZod({
      title: 'MinMax',
      type: 'object',
      properties: {
        age: {
          type: 'number',
          minimum: 0,
          maximum: 120,
        },
      },
    })
    const expected = `import * as z from 'zod'

export const MinMax = z.object({age:z.number().min(0).max(120)}).partial()

export type MinMax = z.infer<typeof MinMax>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minLength/maxLength', () => {
    const result = schemaToZod({
      title: 'Length',
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
        },
      },
    })
    const expected = `import * as z from 'zod'

export const Length = z.object({name:z.string().min(1).max(100)}).partial()

export type Length = z.infer<typeof Length>`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToZod(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import * as z from 'zod'

export const Schema = z.object({name:z.string()}).partial()`
    expect(result).toBe(expected)
  })

  it('should handle allOf with default value', () => {
    const result = schemaToZod({
      title: 'WithDefault',
      type: 'object',
      properties: {
        status: {
          allOf: [{ type: 'string' }, { default: 'active' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const WithDefault = z.object({status:z.string().default("active")}).partial()

export type WithDefault = z.infer<typeof WithDefault>`
    expect(result).toBe(expected)
  })

  it('should handle allOf with nullable and default', () => {
    const result = schemaToZod({
      title: 'NullDefault',
      type: 'object',
      properties: {
        value: {
          allOf: [{ type: 'string' }, { default: 'x' }, { type: 'null' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const NullDefault = z.object({value:z.string().default("x").nullable()}).partial()

export type NullDefault = z.infer<typeof NullDefault>`
    expect(result).toBe(expected)
  })

  it('should handle date type', () => {
    const result = schemaToZod({
      title: 'D',
      type: 'date',
    })
    const expected = `import * as z from 'zod'

export const D = z.date()

export type D = z.infer<typeof D>`
    expect(result).toBe(expected)
  })

  it('should handle null type', () => {
    const result = schemaToZod({
      title: 'N',
      type: 'null',
    })
    const expected = `import * as z from 'zod'

export const N = z.null().nullable()

export type N = z.infer<typeof N>`
    expect(result).toBe(expected)
  })

  it('should handle anyOf combinator', () => {
    const result = schemaToZod({
      title: 'AnyOf',
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as z from 'zod'

export const AnyOf = z.object({value:z.union([z.string(),z.number()])}).partial()

export type AnyOf = z.infer<typeof AnyOf>`
    expect(result).toBe(expected)
  })

  it('should handle array with minItems/maxItems', () => {
    const result = schemaToZod({
      title: 'Arr',
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
      },
      required: ['tags'],
    })
    const expected = `import * as z from 'zod'

export const Arr = z.object({tags:z.array(z.string()).min(1).max(10)})

export type Arr = z.infer<typeof Arr>`
    expect(result).toBe(expected)
  })

  it('should handle array with fixed length', () => {
    const result = schemaToZod({
      title: 'Fixed',
      type: 'object',
      properties: {
        pair: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      },
      required: ['pair'],
    })
    const expected = `import * as z from 'zod'

export const Fixed = z.object({pair:z.array(z.number()).length(3)})

export type Fixed = z.infer<typeof Fixed>`
    expect(result).toBe(expected)
  })

  it('should handle default boolean value', () => {
    const result = schemaToZod({
      title: 'Def',
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
      },
    })
    const expected = `import * as z from 'zod'

export const Def = z.object({enabled:z.boolean().default(true)}).partial()

export type Def = z.infer<typeof Def>`
    expect(result).toBe(expected)
  })

  it('should handle nullable string', () => {
    const result = schemaToZod({
      title: 'Null',
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
      },
      required: ['value'],
    })
    const expected = `import * as z from 'zod'

export const Null = z.object({value:z.string().nullable()})

export type Null = z.infer<typeof Null>`
    expect(result).toBe(expected)
  })

  it('should handle object type without properties', () => {
    const result = schemaToZod({
      title: 'Empty',
      type: 'object',
    })
    const expected = `import * as z from 'zod'

export const Empty = z.object({})

export type Empty = z.infer<typeof Empty>`
    expect(result).toBe(expected)
  })

  describe('openapi option', () => {
    it('should use toIdentifierPascalCase for title with hyphens', () => {
      const result = schemaToZod(
        {
          title: 'user-profile',
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        { openapi: true },
      )
      const expected = `import * as z from 'zod'

export const UserProfile = z.object({name:z.string()})

export type UserProfile = z.infer<typeof UserProfile>`
      expect(result).toBe(expected)
    })

    it('should resolve $ref with OpenAPI component suffixes', () => {
      const result = schemaToZod(
        {
          title: 'Order',
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            status: { type: 'string' },
          },
          required: ['user', 'status'],
        },
        { openapi: true },
      )
      const expected = `import * as z from 'zod'

export const Order = z.object({user:z.lazy(() => UserSchema),status:z.string()})

export type Order = z.infer<typeof Order>`
      expect(result).toBe(expected)
    })

    it('should handle definitions with openapi naming', () => {
      const result = schemaToZod(
        {
          title: 'root-schema',
          type: 'object',
          properties: {
            address: { $ref: '#/$defs/street-address' },
          },
          required: ['address'],
          $defs: {
            'street-address': {
              type: 'object',
              properties: {
                city: { type: 'string' },
              },
              required: ['city'],
            },
          },
        },
        { openapi: true },
      )
      const expected = `import * as z from 'zod'

type _RootSchema = {address: _Street-address}

type _StreetAddress = {city: string}

const StreetAddress: z.ZodType<_StreetAddress> = z.object({city:z.string()})

export const RootSchema: z.ZodType<_RootSchema> = z.object({address:z.lazy(() => StreetAddress)})

export type RootSchema = z.infer<typeof RootSchema>`
      expect(result).toBe(expected)
    })

    it('should not affect output when openapi is false', () => {
      const schema = {
        title: 'user-profile',
        type: 'object' as const,
        properties: {
          name: { type: 'string' as const },
        },
        required: ['name'] as const,
      }
      const withoutOpenapi = schemaToZod(schema)
      const withOpenapiOff = schemaToZod(schema, { openapi: false })
      expect(withoutOpenapi).toBe(withOpenapiOff)
    })
  })
})
