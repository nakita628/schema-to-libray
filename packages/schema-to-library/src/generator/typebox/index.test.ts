import { describe, expect, it } from 'vitest'
import { schemaToTypebox } from './index.js'

// Test run
// pnpm vitest run ./src/generator/typebox/index.test.ts

describe('schemaToTypebox', () => {
  it('should generate simple schema without definitions', () => {
    const result = schemaToTypebox({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Schema = Type.Object({name:Type.String(),age:Type.Optional(Type.Number())})

export type Schema = Static<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToTypebox({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const User = Type.Object({name:Type.Optional(Type.String())})

export type User = Static<typeof User>`
    expect(result).toBe(expected)
  })

  it('should handle schema with enum', () => {
    const result = schemaToTypebox({
      title: 'Enum',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Enum = Type.Object({status:Type.Optional(Type.Union([Type.Literal("active"),Type.Literal("inactive")]))})

export type Enum = Static<typeof Enum>`
    expect(result).toBe(expected)
  })

  it('should handle schema with const', () => {
    const result = schemaToTypebox({
      title: 'Const',
      type: 'object',
      properties: {
        type: {
          const: 'user',
        },
      },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Const = Type.Object({type:Type.Optional(Type.Literal("user"))})

export type Const = Static<typeof Const>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minimum/maximum', () => {
    const result = schemaToTypebox({
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
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const MinMax = Type.Object({age:Type.Optional(Type.Number({minimum:0,maximum:120}))})

export type MinMax = Static<typeof MinMax>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minLength/maxLength', () => {
    const result = schemaToTypebox({
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
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Length = Type.Object({name:Type.Optional(Type.String({minLength:1,maxLength:100}))})

export type Length = Static<typeof Length>`
    expect(result).toBe(expected)
  })

  it('should handle schema with required properties', () => {
    const result = schemaToTypebox({
      title: 'Required',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Required = Type.Object({name:Type.String(),age:Type.Number()})

export type Required = Static<typeof Required>`
    expect(result).toBe(expected)
  })

  it('should handle schema with integer type', () => {
    const result = schemaToTypebox({
      title: 'Int',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['count', 'score'],
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Int = Type.Object({count:Type.Integer(),score:Type.Integer({minimum:0,maximum:100})})

export type Int = Static<typeof Int>`
    expect(result).toBe(expected)
  })

  it('should handle schema with array', () => {
    const result = schemaToTypebox({
      title: 'Array',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Array = Type.Object({items:Type.Optional(Type.Array(Type.String()))})

export type Array = Static<typeof Array>`
    expect(result).toBe(expected)
  })

  it('should handle schema with oneOf', () => {
    const result = schemaToTypebox({
      title: 'Union',
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Union = Type.Object({value:Type.Optional(Type.Union([Type.String(),Type.Number()]))})

export type Union = Static<typeof Union>`
    expect(result).toBe(expected)
  })

  it('should handle schema with allOf', () => {
    const result = schemaToTypebox({
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
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const AllOf = Type.Object({value:Type.Optional(Type.Intersect([Type.Object({name:Type.Optional(Type.String())}),Type.Object({age:Type.Optional(Type.Number())})]))})

export type AllOf = Static<typeof AllOf>`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToTypebox({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Additional = Type.Record(Type.String(),Type.String())

export type Additional = Static<typeof Additional>`
    expect(result).toBe(expected)
  })

  it('should handle schema with format', () => {
    const result = schemaToTypebox({
      title: 'Format',
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
        },
      },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Format = Type.Object({email:Type.Optional(Type.String({format:"email"}))})

export type Format = Static<typeof Format>`
    expect(result).toBe(expected)
  })

  it('should handle schema with pattern', () => {
    const result = schemaToTypebox({
      title: 'Pattern',
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          pattern: '^\\d+$',
        },
      },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Pattern = Type.Object({phone:Type.Optional(Type.String({pattern:"^\\\\d+$"}))})

export type Pattern = Static<typeof Pattern>`
    expect(result).toBe(expected)
  })

  it('should handle schema with nullable', () => {
    const result = schemaToTypebox({
      title: 'Nullable',
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
      },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Nullable = Type.Object({name:Type.Optional(Type.Union([Type.String(),Type.Null()]))})

export type Nullable = Static<typeof Nullable>`
    expect(result).toBe(expected)
  })

  it('should handle schema with multiple definitions', () => {
    const result = schemaToTypebox({
      title: 'A',
      type: 'object',
      properties: {
        b: { $ref: '#/definitions/B' },
      },
      definitions: {
        B: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    })
    const expected = `import { Type, type Static } from '@sinclair/typebox'

const B = Type.Object({name:Type.Optional(Type.String())})

export const A = Type.Object({b:Type.Optional(B)})

export type A = Static<typeof A>`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToTypebox(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import { Type, type Static } from '@sinclair/typebox'

export const Schema = Type.Object({name:Type.Optional(Type.String())})`
    expect(result).toBe(expected)
  })
})
