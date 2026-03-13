import { describe, expect, it } from 'vitest'
import { schemaToEffect } from './index.js'

// Test run
// pnpm vitest run ./src/effect/index.test.ts

describe('schemaToEffect', () => {
  it('should generate simple schema without definitions', () => {
    const result = schemaToEffect({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import { Schema } from "effect"

export const Schema_ = Schema.Struct({name:Schema.String,age:Schema.optional(Schema.Number)})

export type Schema_Type_ = typeof Schema_.Type

export type Schema_Encoded = typeof Schema_.Encoded`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToEffect({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import { Schema } from "effect"

export const User = Schema.partial(Schema.Struct({name:Schema.String}))

export type UserType_ = typeof User.Type

export type UserEncoded = typeof User.Encoded`
    expect(result).toBe(expected)
  })

  it('should generate schema with self-referencing types', () => {
    const result = schemaToEffect({
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
    const expected = `import { Schema } from "effect"

type NodeType = {readonly children?: readonly NodeType[]}

export const Node: Schema.Schema<NodeType> = Schema.partial(Schema.Struct({children:Schema.Array(Schema.suspend(() => Node))}))

export type NodeType_ = typeof Node.Type

export type NodeEncoded = typeof Node.Encoded`
    expect(result).toBe(expected)
  })

  it('should generate schema with multiple definitions', () => {
    const result = schemaToEffect({
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
    const expected = `import { Schema } from "effect"

type AType = {readonly b?: BType}

type CType = string

type BType = {readonly c?: CType}

const C: Schema.Schema<CType> = Schema.String

const B: Schema.Schema<BType> = Schema.partial(Schema.Struct({c:Schema.suspend(() => C)}))

export const A: Schema.Schema<AType> = Schema.partial(Schema.Struct({b:Schema.suspend(() => B)}))

export type AType_ = typeof A.Type

export type AEncoded = typeof A.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with $defs instead of definitions', () => {
    const result = schemaToEffect({
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
    const expected = `import { Schema } from "effect"

type UserType = {readonly address?: AddressType}

type AddressType = {readonly street?: string}

const Address: Schema.Schema<AddressType> = Schema.partial(Schema.Struct({street:Schema.String}))

export const User: Schema.Schema<UserType> = Schema.partial(Schema.Struct({address:Schema.suspend(() => Address)}))

export type UserType_ = typeof User.Type

export type UserEncoded = typeof User.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with direct self reference', () => {
    const result = schemaToEffect({
      title: 'Schema',
      type: 'object',
      properties: {
        children: {
          type: 'array',
          items: { $ref: '#' },
        },
      },
    })
    const expected = `import { Schema } from "effect"

type Schema_Type = {readonly children?: readonly typeof Schema_.Type[]}

export const Schema_: Schema.Schema<Schema_Type> = Schema.partial(Schema.Struct({children:Schema.Array(Schema.suspend(() => Schema_))}))

export type Schema_Type_ = typeof Schema_.Type

export type Schema_Encoded = typeof Schema_.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with oneOf', () => {
    const result = schemaToEffect({
      title: 'Union',
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import { Schema } from "effect"

export const Union = Schema.partial(Schema.Struct({value:Schema.Union(Schema.String,Schema.Number)}))

export type UnionType_ = typeof Union.Type

export type UnionEncoded = typeof Union.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with allOf', () => {
    const result = schemaToEffect({
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
    const expected = `import { Schema } from "effect"

export const AllOf = Schema.partial(Schema.Struct({value:Schema.extend(Schema.partial(Schema.Struct({name:Schema.String})),Schema.partial(Schema.Struct({age:Schema.Number})))}))

export type AllOfType_ = typeof AllOf.Type

export type AllOfEncoded = typeof AllOf.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with enum', () => {
    const result = schemaToEffect({
      title: 'Enum',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    })
    const expected = `import { Schema } from "effect"

export const Enum = Schema.partial(Schema.Struct({status:Schema.Literal("active","inactive")}))

export type EnumType_ = typeof Enum.Type

export type EnumEncoded = typeof Enum.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with const', () => {
    const result = schemaToEffect({
      title: 'Const',
      type: 'object',
      properties: {
        type: {
          const: 'user',
        },
      },
    })
    const expected = `import { Schema } from "effect"

export const Const = Schema.partial(Schema.Struct({type:Schema.Literal("user")}))

export type ConstType_ = typeof Const.Type

export type ConstEncoded = typeof Const.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with format', () => {
    const result = schemaToEffect({
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
    const expected = `import { Schema } from "effect"

export const Format = Schema.partial(Schema.Struct({email:Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/)),uuid:Schema.UUID}))

export type FormatType_ = typeof Format.Type

export type FormatEncoded = typeof Format.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with pattern', () => {
    const result = schemaToEffect({
      title: 'Pattern',
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          pattern: '^d+$',
        },
      },
    })
    const expected = `import { Schema } from "effect"

export const Pattern = Schema.partial(Schema.Struct({phone:Schema.String.pipe(Schema.pattern(/^d+$/))}))

export type PatternType_ = typeof Pattern.Type

export type PatternEncoded = typeof Pattern.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with minimum/maximum', () => {
    const result = schemaToEffect({
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
    const expected = `import { Schema } from "effect"

export const MinMax = Schema.partial(Schema.Struct({age:Schema.Number.pipe(Schema.greaterThanOrEqualTo(0),Schema.lessThanOrEqualTo(120))}))

export type MinMaxType_ = typeof MinMax.Type

export type MinMaxEncoded = typeof MinMax.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with minLength/maxLength', () => {
    const result = schemaToEffect({
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
    const expected = `import { Schema } from "effect"

export const Length = Schema.partial(Schema.Struct({name:Schema.String.pipe(Schema.minLength(1),Schema.maxLength(100))}))

export type LengthType_ = typeof Length.Type

export type LengthEncoded = typeof Length.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with required properties', () => {
    const result = schemaToEffect({
      title: 'Required',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    })
    const expected = `import { Schema } from "effect"

export const Required = Schema.Struct({name:Schema.String,age:Schema.Number})

export type RequiredType_ = typeof Required.Type

export type RequiredEncoded = typeof Required.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToEffect({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import { Schema } from "effect"

export const Additional = Schema.Record({key:Schema.String,value:Schema.String})

export type AdditionalType_ = typeof Additional.Type

export type AdditionalEncoded = typeof Additional.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with integer type', () => {
    const result = schemaToEffect({
      title: 'Int',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['count', 'score'],
    })
    const expected = `import { Schema } from "effect"

export const Int = Schema.Struct({count:Schema.Number.pipe(Schema.int()),score:Schema.Number.pipe(Schema.int(),Schema.greaterThanOrEqualTo(0),Schema.lessThanOrEqualTo(100))})

export type IntType_ = typeof Int.Type

export type IntEncoded = typeof Int.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle schema with array', () => {
    const result = schemaToEffect({
      title: 'Arr',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    })
    const expected = `import { Schema } from "effect"

export const Arr = Schema.partial(Schema.Struct({items:Schema.Array(Schema.String)}))

export type ArrType_ = typeof Arr.Type

export type ArrEncoded = typeof Arr.Encoded`
    expect(result).toBe(expected)
  })
})
