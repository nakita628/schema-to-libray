import { describe, expect, it } from 'vitest'
import { schemaToZod } from './index.js'

// Test run
// pnpm vitest run ./private/zod/src/index.test.ts

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

export const Schema = z.object({name:z.string()}).partial()

export type Schema = z.infer<typeof Schema>`
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

type NodeType = {children?: NodeType[]}
type NodeType = Record<string, unknown>

export const Node: z.ZodType<NodeType> = z.object({children:z.array(z.lazy(() => Node))}).partial()

export const Node: z.ZodType<NodeType> = z.object({})

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

type SchemaType = {b?: BType}

const CSchema = z.string()

const BSchema = z.object({c:z.lazy(() => C)}).partial()

export const Schema: z.ZodType<SchemaType> = z.object({b:z.lazy(() => B)}).partial()

export type Schema = z.infer<typeof Schema>`
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

type SchemaType = {address?: AddressType}

const AddressSchema = z.object({street:z.string()}).partial()

export const Schema: z.ZodType<SchemaType> = z.object({address:z.lazy(() => Address)}).partial()

export type Schema = z.infer<typeof Schema>`
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
    const expected = `import * as z from 'zod'

type SchemaType = Record<string, unknown>

const BSchema = z.object({a:z.lazy(() => A)}).partial()

const ASchema = z.object({b:z.lazy(() => B)}).partial()

export const Schema: z.ZodType<SchemaType> = z.object({})

export type Schema = z.infer<typeof Schema>`
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

type SchemaType = {children?: z.infer<typeof Schema>[]}

export const Schema: z.ZodType<SchemaType> = z.object({children:z.array(z.lazy(() => Schema))}).partial()

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

export const Schema = z.object({value:z.union([z.string(),z.number()])}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({value:z.union([z.string(),z.number()])}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({value:z.intersection(z.object({name:z.string()}).partial(),z.object({age:z.number()}).partial())}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({status:z.enum(["active","inactive"])}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({type:z.literal("user")}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({items:z.array(z.string())}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({user:z.object({name:z.string(),age:z.number()}).partial()}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({name:z.string(),age:z.number()})

export type Schema = z.infer<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToZod({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import * as z from 'zod'

export const Schema = z.record(z.string(),z.string())

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({email:z.email(),uuid:z.uuid()}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({phone:z.string().regex(/^d+$/)}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({age:z.number().min(0).max(120)}).partial()

export type Schema = z.infer<typeof Schema>`
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

export const Schema = z.object({name:z.string().min(1).max(100)}).partial()

export type Schema = z.infer<typeof Schema>`
    expect(result).toBe(expected)
  })
})
