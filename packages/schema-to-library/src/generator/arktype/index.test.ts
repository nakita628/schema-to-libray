import { describe, expect, it } from 'vitest'
import { schemaToArktype } from './index.js'

// Test run
// pnpm vitest run ./src/generator/arktype/index.test.ts

describe('schemaToArktype', () => {
  it('should generate simple schema without definitions', () => {
    const result = schemaToArktype({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import { type } from "arktype"

export const Schema = type({name:"string","age?":"number"})

export type Schema = typeof Schema.infer`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToArktype({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import { type } from "arktype"

export const User = type({"name?":"string"})

export type User = typeof User.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with enum', () => {
    const result = schemaToArktype({
      title: 'Enum',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    })
    const expected = `import { type } from "arktype"

export const Enum = type({"status?":"'active' | 'inactive'"})

export type Enum = typeof Enum.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with const', () => {
    const result = schemaToArktype({
      title: 'Const',
      type: 'object',
      properties: {
        type: {
          const: 'user',
        },
      },
    })
    const expected = `import { type } from "arktype"

export const Const = type({"type?":"'user'"})

export type Const = typeof Const.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with required properties', () => {
    const result = schemaToArktype({
      title: 'Required',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    })
    const expected = `import { type } from "arktype"

export const Required = type({name:"string",age:"number"})

export type Required = typeof Required.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with integer type', () => {
    const result = schemaToArktype({
      title: 'Int',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['count', 'score'],
    })
    const expected = `import { type } from "arktype"

export const Int = type({count:"number.integer",score:"number.integer >= 0 <= 100"})

export type Int = typeof Int.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with array', () => {
    const result = schemaToArktype({
      title: 'Array',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    })
    const expected = `import { type } from "arktype"

export const Array = type({"items?":"string[]"})

export type Array = typeof Array.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with oneOf', () => {
    const result = schemaToArktype({
      title: 'Union',
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import { type } from "arktype"

export const Union = type({"value?":"string | number"})

export type Union = typeof Union.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with nullable', () => {
    const result = schemaToArktype({
      title: 'Nullable',
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
      },
    })
    const expected = `import { type } from "arktype"

export const Nullable = type({"name?":"string | null"})

export type Nullable = typeof Nullable.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with definitions using scope', () => {
    const result = schemaToArktype({
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
    const expected = `import { scope } from "arktype"

const types = scope({B:{"name?":"string"},A:{"b?":"B"}}).export()

export const A = types.A

export type A = typeof A.infer`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToArktype({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import { type } from "arktype"

export const Additional = type({"[string]":"string"})

export type Additional = typeof Additional.infer`
    expect(result).toBe(expected)
  })

  it('should handle number with minimum/maximum', () => {
    const result = schemaToArktype({
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
    const expected = `import { type } from "arktype"

export const MinMax = type({"age?":"number >= 0 <= 120"})

export type MinMax = typeof MinMax.infer`
    expect(result).toBe(expected)
  })

  it('should handle boolean type', () => {
    const result = schemaToArktype({
      title: 'Bool',
      type: 'boolean',
    })
    const expected = `import { type } from "arktype"

export const Bool = type("boolean")

export type Bool = typeof Bool.infer`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToArktype(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import { type } from "arktype"

export const Schema = type({"name?":"string"})`
    expect(result).toBe(expected)
  })
})
