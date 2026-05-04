import { describe, expect, it } from 'vite-plus/test'

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

export type Schema_Type = typeof Schema_.Type`
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

export type UserType = typeof User.Type`
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

type _Node = {readonly children?: readonly _Node[]}

export const Node: Schema.Schema<_Node> = Schema.partial(Schema.Struct({children:Schema.Array(Schema.suspend(() => Node))}))

export type NodeType = typeof Node.Type`
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

type _A = {readonly b?: _B}

type _C = string

type _B = {readonly c?: _C}

const C: Schema.Schema<_C> = Schema.String

const B: Schema.Schema<_B> = Schema.partial(Schema.Struct({c:Schema.suspend(() => C)}))

export const A: Schema.Schema<_A> = Schema.partial(Schema.Struct({b:Schema.suspend(() => B)}))

export type AType = typeof A.Type`
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

type _User = {readonly address?: _Address}

type _Address = {readonly street?: string}

const Address: Schema.Schema<_Address> = Schema.partial(Schema.Struct({street:Schema.String}))

export const User: Schema.Schema<_User> = Schema.partial(Schema.Struct({address:Schema.suspend(() => Address)}))

export type UserType = typeof User.Type`
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

type _Schema_ = {readonly children?: readonly typeof Schema_.Type[]}

export const Schema_: Schema.Schema<_Schema_> = Schema.partial(Schema.Struct({children:Schema.Array(Schema.suspend(() => Schema_))}))

export type Schema_Type = typeof Schema_.Type`
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

export type UnionType = typeof Union.Type`
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

export type AllOfType = typeof AllOf.Type`
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

export type EnumType = typeof Enum.Type`
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

export type ConstType = typeof Const.Type`
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

export type FormatType = typeof Format.Type`
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

export type PatternType = typeof Pattern.Type`
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

export type MinMaxType = typeof MinMax.Type`
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

export type LengthType = typeof Length.Type`
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

export type RequiredType = typeof Required.Type`
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

export type AdditionalType = typeof Additional.Type`
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

export type IntType = typeof Int.Type`
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

export type ArrType = typeof Arr.Type`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToEffect(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import { Schema } from "effect"

export const Schema_ = Schema.partial(Schema.Struct({name:Schema.String}))`
    expect(result).toBe(expected)
  })

  it('should handle allOf with default value', () => {
    const result = schemaToEffect({
      title: 'WithDefault',
      type: 'object',
      properties: {
        status: {
          allOf: [{ type: 'string' }, { default: 'active' }],
        },
      },
    })
    const expected = `import { Schema } from "effect"

export const WithDefault = Schema.partial(Schema.Struct({status:Schema.optional(Schema.String,{default:() => "active"})}))

export type WithDefaultType = typeof WithDefault.Type`
    expect(result).toBe(expected)
  })

  it('should handle allOf with nullable and default', () => {
    const result = schemaToEffect({
      title: 'NullDefault',
      type: 'object',
      properties: {
        value: {
          allOf: [{ type: 'string' }, { default: 'x' }, { type: 'null' }],
        },
      },
    })
    const expected = `import { Schema } from "effect"

export const NullDefault = Schema.partial(Schema.Struct({value:Schema.NullOr(Schema.optional(Schema.String,{default:() => "x"}))}))

export type NullDefaultType = typeof NullDefault.Type`
    expect(result).toBe(expected)
  })

  it('should handle anyOf combinator', () => {
    const result = schemaToEffect({
      title: 'AnyOf',
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import { Schema } from "effect"

export const AnyOf = Schema.partial(Schema.Struct({value:Schema.Union(Schema.String,Schema.Number)}))

export type AnyOfType = typeof AnyOf.Type`
    expect(result).toBe(expected)
  })

  it('should handle array with minItems/maxItems', () => {
    const result = schemaToEffect({
      title: 'Arr',
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
      },
      required: ['tags'],
    })
    const expected = `import { Schema } from "effect"

export const Arr = Schema.Struct({tags:Schema.Array(Schema.String).pipe(Schema.minItems(1),Schema.maxItems(10))})

export type ArrType = typeof Arr.Type`
    expect(result).toBe(expected)
  })

  it('should handle array with fixed length', () => {
    const result = schemaToEffect({
      title: 'Fixed',
      type: 'object',
      properties: {
        pair: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      },
      required: ['pair'],
    })
    const expected = `import { Schema } from "effect"

export const Fixed = Schema.Struct({pair:Schema.Array(Schema.Number).pipe(Schema.itemsCount(3))})

export type FixedType = typeof Fixed.Type`
    expect(result).toBe(expected)
  })

  it('should handle nullable type', () => {
    const result = schemaToEffect({
      title: 'Null',
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
      },
      required: ['value'],
    })
    const expected = `import { Schema } from "effect"

export const Null = Schema.Struct({value:Schema.NullOr(Schema.String)})

export type NullType = typeof Null.Type`
    expect(result).toBe(expected)
  })

  it('should handle default value', () => {
    const result = schemaToEffect({
      title: 'Def',
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
      },
    })
    const expected = `import { Schema } from "effect"

export const Def = Schema.partial(Schema.Struct({enabled:Schema.optionalWith(Schema.Boolean,{default:() => true})}))

export type DefType = typeof Def.Type`
    expect(result).toBe(expected)
  })

  it('should handle date type', () => {
    const result = schemaToEffect({
      title: 'D',
      type: 'date',
    })
    const expected = `import { Schema } from "effect"

export const D = Schema.Date

export type DType = typeof D.Type`
    expect(result).toBe(expected)
  })

  it('should handle null type', () => {
    const result = schemaToEffect({
      title: 'N',
      type: 'null',
    })
    const expected = `import { Schema } from "effect"

export const N = Schema.NullOr(Schema.Null)

export type NType = typeof N.Type`
    expect(result).toBe(expected)
  })

  it('should handle object type without properties', () => {
    const result = schemaToEffect({
      title: 'Empty',
      type: 'object',
    })
    const expected = `import { Schema } from "effect"

export const Empty = Schema.Struct({})

export type EmptyType = typeof Empty.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with oneOf type', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Status: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
      properties: {
        status: { $ref: '#/definitions/Status' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly status?: _Status}

type _Status = (string | number)

const Status: Schema.Schema<_Status> = Schema.Union(Schema.String,Schema.Number)

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({status:Schema.suspend(() => Status)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with anyOf type', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Value: {
          anyOf: [{ type: 'boolean' }, { type: 'string' }],
        },
      },
      properties: {
        value: { $ref: '#/definitions/Value' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly value?: _Value}

type _Value = (boolean | string)

const Value: Schema.Schema<_Value> = Schema.Union(Schema.Boolean,Schema.String)

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({value:Schema.suspend(() => Value)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with allOf type', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Combined: {
          allOf: [
            { type: 'object', properties: { a: { type: 'string' } } },
            { type: 'object', properties: { b: { type: 'number' } } },
          ],
        },
      },
      properties: {
        data: { $ref: '#/definitions/Combined' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly data?: _Combined}

type _Combined = ({readonly a?: string} & {readonly b?: number})

const Combined: Schema.Schema<_Combined> = Schema.extend(Schema.partial(Schema.Struct({a:Schema.String})),Schema.partial(Schema.Struct({b:Schema.Number})))

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({data:Schema.suspend(() => Combined)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with const value', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Version: { const: 'v1' },
      },
      properties: {
        version: { $ref: '#/definitions/Version' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly version?: _Version}

type _Version = "v1"

const Version: Schema.Schema<_Version> = Schema.Literal("v1")

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({version:Schema.suspend(() => Version)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with enum', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Color: { enum: ['red', 'green', 'blue'] },
      },
      properties: {
        color: { $ref: '#/definitions/Color' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly color?: _Color}

type _Color = ("red" | "green" | "blue")

const Color: Schema.Schema<_Color> = Schema.Literal("red","green","blue")

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({color:Schema.suspend(() => Color)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with single enum', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        SingleVal: { enum: ['only'] },
      },
      properties: {
        val: { $ref: '#/definitions/SingleVal' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly val?: _SingleVal}

type _SingleVal = "only"

const SingleVal: Schema.Schema<_SingleVal> = Schema.Literal("only")

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({val:Schema.suspend(() => SingleVal)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with array type', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Tags: { type: 'array', items: { type: 'string' } },
      },
      properties: {
        tags: { $ref: '#/definitions/Tags' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly tags?: _Tags}

type _Tags = readonly string[]

const Tags: Schema.Schema<_Tags> = Schema.Array(Schema.String)

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({tags:Schema.suspend(() => Tags)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with date type', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Timestamp: { type: 'date' },
      },
      properties: {
        ts: { $ref: '#/definitions/Timestamp' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly ts?: _Timestamp}

type _Timestamp = Date

const Timestamp: Schema.Schema<_Timestamp> = Schema.Date

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({ts:Schema.suspend(() => Timestamp)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with null type', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Nothing: { type: 'null' },
      },
      properties: {
        n: { $ref: '#/definitions/Nothing' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly n?: _Nothing}

type _Nothing = null

const Nothing: Schema.Schema<_Nothing> = Schema.NullOr(Schema.Null)

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({n:Schema.suspend(() => Nothing)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with boolean type', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Flag: { type: 'boolean' },
      },
      properties: {
        flag: { $ref: '#/definitions/Flag' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly flag?: _Flag}

type _Flag = boolean

const Flag: Schema.Schema<_Flag> = Schema.Boolean

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({flag:Schema.suspend(() => Flag)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with integer type', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Count: { type: 'integer' },
      },
      properties: {
        count: { $ref: '#/definitions/Count' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly count?: _Count}

type _Count = number

const Count: Schema.Schema<_Count> = Schema.Number.pipe(Schema.int())

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({count:Schema.suspend(() => Count)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with additionalProperties boolean true', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Loose: { type: 'object', additionalProperties: true },
      },
      properties: {
        l: { $ref: '#/definitions/Loose' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly l?: _Loose}

type _Loose = { [key: string]: unknown }

const Loose: Schema.Schema<_Loose> = Schema.Unknown

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({l:Schema.suspend(() => Loose)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with additionalProperties schema', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Dict: { type: 'object', additionalProperties: { type: 'number' } },
      },
      properties: {
        d: { $ref: '#/definitions/Dict' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly d?: _Dict}

type _Dict = { [key: string]: number }

const Dict: Schema.Schema<_Dict> = Schema.Record({key:Schema.String,value:Schema.Number})

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({d:Schema.suspend(() => Dict)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with not keyword', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Neg: { not: { type: 'string' } },
      },
      properties: {
        neg: { $ref: '#/definitions/Neg' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly neg?: _Neg}

type _Neg = unknown

const Neg: Schema.Schema<_Neg> = Schema.Unknown.pipe(Schema.filter((v) => typeof v !== 'string'))

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({neg:Schema.suspend(() => Neg)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with key escaping', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Special: {
          type: 'object',
          properties: {
            'x-value': { type: 'string' },
            normal: { type: 'number' },
          },
          required: ['x-value'],
        },
      },
      properties: {
        data: { $ref: '#/definitions/Special' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly data?: _Special}

type _Special = {readonly "x-value": string; readonly normal?: number}

const Special: Schema.Schema<_Special> = Schema.Struct({"x-value":Schema.String,normal:Schema.optional(Schema.Number)})

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({data:Schema.suspend(() => Special)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  it('should handle additionalProperties: true with properties', () => {
    const result = schemaToEffect({
      title: 'Loose',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: true,
    })
    const expected = `import { Schema } from "effect"

export const Loose = Schema.Struct({name:Schema.String})

export type LooseType = typeof Loose.Type`
    expect(result).toBe(expected)
  })

  it('should handle additionalProperties: true boolean without properties', () => {
    const result = schemaToEffect({
      title: 'AnyObj',
      type: 'object',
      additionalProperties: true,
    })
    const expected = `import { Schema } from "effect"

export const AnyObj = Schema.Unknown

export type AnyObjType = typeof AnyObj.Type`
    expect(result).toBe(expected)
  })

  it('should handle special key escaping in properties', () => {
    const result = schemaToEffect({
      title: 'Special',
      type: 'object',
      properties: {
        'x-value': { type: 'string' },
      },
      required: ['x-value'],
    })
    const expected = `import { Schema } from "effect"

export const Special = Schema.Struct({"x-value":Schema.String})

export type SpecialType = typeof Special.Type`
    expect(result).toBe(expected)
  })

  it('should handle definitions with $ref using #/ prefix', () => {
    const result = schemaToEffect({
      title: 'Root',
      type: 'object',
      definitions: {
        Inner: { type: 'string' },
        Wrapper: {
          type: 'object',
          properties: {
            inner: { $ref: '#/definitions/Inner' },
          },
        },
      },
      properties: {
        wrap: { $ref: '#/definitions/Wrapper' },
      },
    })
    const expected = `import { Schema } from "effect"

type _Root = {readonly wrap?: _Wrapper}

type _Inner = string

type _Wrapper = {readonly inner?: _Inner}

const Inner: Schema.Schema<_Inner> = Schema.String

const Wrapper: Schema.Schema<_Wrapper> = Schema.partial(Schema.Struct({inner:Schema.suspend(() => Inner)}))

export const Root: Schema.Schema<_Root> = Schema.partial(Schema.Struct({wrap:Schema.suspend(() => Wrapper)}))

export type RootType = typeof Root.Type`
    expect(result).toBe(expected)
  })

  describe('self-reference and complex schemas', () => {
    it('should handle direct self-reference ($ref: "#")', () => {
      const result = schemaToEffect({
        title: 'Tree',
        type: 'object',
        properties: {
          children: { type: 'array', items: { $ref: '#' } },
        },
      })
      const expected = `import { Schema } from "effect"

type _Tree = {readonly children?: readonly typeof Tree.Type[]}

export const Tree: Schema.Schema<_Tree> = Schema.partial(Schema.Struct({children:Schema.Array(Schema.suspend(() => Tree))}))

export type TreeType = typeof Tree.Type`
      expect(result).toBe(expected)
    })

    it('should handle root name in definitions', () => {
      const result = schemaToEffect(
        {
          title: 'Node',
          type: 'object',
          definitions: {
            Node: {
              type: 'object',
              properties: {
                value: { type: 'string' },
                next: { $ref: '#/definitions/Node' },
              },
              required: ['value'],
            },
          },
        },
        { exportType: false },
      )
      const expected = `import { Schema } from "effect"

type _Node = {readonly value: string; readonly next?: _Node}

export const Node: Schema.Schema<_Node> = Schema.Struct({value:Schema.String,next:Schema.optional(Schema.suspend(() => Node))})`
      expect(result).toBe(expected)
    })

    it('should handle empty schema', () => {
      const result = schemaToEffect({}, { exportType: false })
      expect(result).toBe(
        `import { Schema } from "effect"\n\nexport const Schema_ = Schema.Unknown`,
      )
    })

    it('should handle Schema title conflict', () => {
      const result = schemaToEffect({ title: 'Schema', type: 'string' }, { exportType: false })
      expect(result).toBe(`import { Schema } from "effect"\n\nexport const Schema_ = Schema.String`)
    })
  })

  describe('x-brand', () => {
    it('should generate branded properties in object', () => {
      const result = schemaToEffect({
        title: 'User',
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', 'x-brand': 'UserId' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      })
      const expected = `import { Schema } from "effect"

export const User = Schema.Struct({id:Schema.UUID.pipe(Schema.brand("UserId")),name:Schema.String})

export type UserType = typeof User.Type`
      expect(result).toBe(expected)
    })

    it('should generate branded number with constraints', () => {
      const result = schemaToEffect({
        title: 'Product',
        type: 'object',
        properties: {
          price: { type: 'number', minimum: 0, 'x-brand': 'Price' },
          quantity: { type: 'integer', minimum: 0, 'x-brand': 'Quantity' },
        },
        required: ['price', 'quantity'],
      })
      const expected = `import { Schema } from "effect"

export const Product = Schema.Struct({price:Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)).pipe(Schema.brand("Price")),quantity:Schema.Number.pipe(Schema.int(),Schema.greaterThanOrEqualTo(0)).pipe(Schema.brand("Quantity"))})

export type ProductType = typeof Product.Type`
      expect(result).toBe(expected)
    })

    it('should generate branded array', () => {
      const result = schemaToEffect({
        title: 'TagList',
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 10,
        'x-brand': 'Tags',
      })
      const expected = `import { Schema } from "effect"

export const TagList = Schema.Array(Schema.String).pipe(Schema.minItems(1),Schema.maxItems(10)).pipe(Schema.brand("Tags"))

export type TagListType = typeof TagList.Type`
      expect(result).toBe(expected)
    })

    it('should generate branded string with email format', () => {
      const result = schemaToEffect({
        title: 'Email',
        type: 'string',
        format: 'email',
        'x-brand': 'Email',
      })
      const expected = `import { Schema } from "effect"

export const Email = Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/)).pipe(Schema.brand("Email"))

export type EmailType = typeof Email.Type`
      expect(result).toBe(expected)
    })

    it('should generate branded nullable string', () => {
      const result = schemaToEffect({
        title: 'NullableId',
        type: 'object',
        properties: {
          id: { type: 'string', nullable: true, 'x-brand': 'NullableId' },
        },
        required: ['id'],
      })
      const expected = `import { Schema } from "effect"

export const NullableId = Schema.Struct({id:Schema.NullOr(Schema.String).pipe(Schema.brand("NullableId"))})

export type NullableIdType = typeof NullableId.Type`
      expect(result).toBe(expected)
    })

    it('should generate branded string with default', () => {
      const result = schemaToEffect({
        title: 'Config',
        type: 'object',
        properties: {
          role: { type: 'string', default: 'user', 'x-brand': 'Role' },
        },
        required: ['role'],
      })
      const expected = `import { Schema } from "effect"

export const Config = Schema.Struct({role:Schema.optionalWith(Schema.String,{default:() => "user"}).pipe(Schema.brand("Role"))})

export type ConfigType = typeof Config.Type`
      expect(result).toBe(expected)
    })

    it('should generate branded string with minLength/maxLength', () => {
      const result = schemaToEffect({
        title: 'Username',
        type: 'string',
        minLength: 3,
        maxLength: 20,
        'x-brand': 'Username',
      })
      const expected = `import { Schema } from "effect"

export const Username = Schema.String.pipe(Schema.minLength(3),Schema.maxLength(20)).pipe(Schema.brand("Username"))

export type UsernameType = typeof Username.Type`
      expect(result).toBe(expected)
    })

    it('should generate branded boolean', () => {
      const result = schemaToEffect({
        title: 'Flag',
        type: 'boolean',
        'x-brand': 'Flag',
      })
      const expected = `import { Schema } from "effect"

export const Flag = Schema.Boolean.pipe(Schema.brand("Flag"))

export type FlagType = typeof Flag.Type`
      expect(result).toBe(expected)
    })

    it('should not add brand when x-brand is absent', () => {
      const result = schemaToEffect({
        title: 'Plain',
        type: 'string',
      })
      const expected = `import { Schema } from "effect"

export const Plain = Schema.String

export type PlainType = typeof Plain.Type`
      expect(result).toBe(expected)
    })

    it('should use Type export for schemas with brand', () => {
      const result = schemaToEffect({
        title: 'Id',
        type: 'string',
        'x-brand': 'Id',
      })
      expect(result).toContain('typeof Id.Type')
    })
  })
})
