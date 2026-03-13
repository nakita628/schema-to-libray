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

export type WithDefaultType_ = typeof WithDefault.Type

export type WithDefaultEncoded = typeof WithDefault.Encoded`
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

export type NullDefaultType_ = typeof NullDefault.Type

export type NullDefaultEncoded = typeof NullDefault.Encoded`
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

export type AnyOfType_ = typeof AnyOf.Type

export type AnyOfEncoded = typeof AnyOf.Encoded`
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

export type ArrType_ = typeof Arr.Type

export type ArrEncoded = typeof Arr.Encoded`
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

export type FixedType_ = typeof Fixed.Type

export type FixedEncoded = typeof Fixed.Encoded`
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

export type NullType_ = typeof Null.Type

export type NullEncoded = typeof Null.Encoded`
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

export type DefType_ = typeof Def.Type

export type DefEncoded = typeof Def.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle date type', () => {
    const result = schemaToEffect({
      title: 'D',
      type: 'date',
    })
    const expected = `import { Schema } from "effect"

export const D = Schema.Date

export type DType_ = typeof D.Type

export type DEncoded = typeof D.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle null type', () => {
    const result = schemaToEffect({
      title: 'N',
      type: 'null',
    })
    const expected = `import { Schema } from "effect"

export const N = Schema.NullOr(Schema.Null)

export type NType_ = typeof N.Type

export type NEncoded = typeof N.Encoded`
    expect(result).toBe(expected)
  })

  it('should handle object type without properties', () => {
    const result = schemaToEffect({
      title: 'Empty',
      type: 'object',
    })
    const expected = `import { Schema } from "effect"

export const Empty = Schema.Struct({})

export type EmptyType_ = typeof Empty.Type

export type EmptyEncoded = typeof Empty.Encoded`
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

type RootType = {readonly status?: StatusType}

type StatusType = (string | number)

const Status: Schema.Schema<StatusType> = Schema.Union(Schema.String,Schema.Number)

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({status:Schema.suspend(() => Status)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly value?: ValueType}

type ValueType = (boolean | string)

const Value: Schema.Schema<ValueType> = Schema.Union(Schema.Boolean,Schema.String)

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({value:Schema.suspend(() => Value)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly data?: CombinedType}

type CombinedType = ({readonly a?: string} & {readonly b?: number})

const Combined: Schema.Schema<CombinedType> = Schema.extend(Schema.partial(Schema.Struct({a:Schema.String})),Schema.partial(Schema.Struct({b:Schema.Number})))

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({data:Schema.suspend(() => Combined)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly version?: VersionType}

type VersionType = "v1"

const Version: Schema.Schema<VersionType> = Schema.Literal("v1")

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({version:Schema.suspend(() => Version)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly color?: ColorType}

type ColorType = ("red" | "green" | "blue")

const Color: Schema.Schema<ColorType> = Schema.Literal("red","green","blue")

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({color:Schema.suspend(() => Color)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly val?: SingleValType}

type SingleValType = "only"

const SingleVal: Schema.Schema<SingleValType> = Schema.Literal("only")

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({val:Schema.suspend(() => SingleVal)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly tags?: TagsType}

type TagsType = readonly string[]

const Tags: Schema.Schema<TagsType> = Schema.Array(Schema.String)

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({tags:Schema.suspend(() => Tags)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly ts?: TimestampType}

type TimestampType = Date

const Timestamp: Schema.Schema<TimestampType> = Schema.Date

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({ts:Schema.suspend(() => Timestamp)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly n?: NothingType}

type NothingType = null

const Nothing: Schema.Schema<NothingType> = Schema.NullOr(Schema.Null)

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({n:Schema.suspend(() => Nothing)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly flag?: FlagType}

type FlagType = boolean

const Flag: Schema.Schema<FlagType> = Schema.Boolean

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({flag:Schema.suspend(() => Flag)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly count?: CountType}

type CountType = number

const Count: Schema.Schema<CountType> = Schema.Number.pipe(Schema.int())

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({count:Schema.suspend(() => Count)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly l?: LooseType}

type LooseType = Record<string, unknown>

const Loose: Schema.Schema<LooseType> = Schema.Unknown

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({l:Schema.suspend(() => Loose)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly d?: DictType}

type DictType = Record<string, number>

const Dict: Schema.Schema<DictType> = Schema.Record({key:Schema.String,value:Schema.Number})

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({d:Schema.suspend(() => Dict)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly neg?: NegType}

type NegType = unknown

const Neg: Schema.Schema<NegType> = Schema.Unknown

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({neg:Schema.suspend(() => Neg)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

type RootType = {readonly data?: SpecialType}

type SpecialType = {readonly "x-value": string; readonly normal?: number}

const Special: Schema.Schema<SpecialType> = Schema.Struct({"x-value":Schema.String,normal:Schema.optional(Schema.Number)})

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({data:Schema.suspend(() => Special)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
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

export type LooseType_ = typeof Loose.Type

export type LooseEncoded = typeof Loose.Encoded`
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

export type AnyObjType_ = typeof AnyObj.Type

export type AnyObjEncoded = typeof AnyObj.Encoded`
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

export type SpecialType_ = typeof Special.Type

export type SpecialEncoded = typeof Special.Encoded`
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

type RootType = {readonly wrap?: WrapperType}

type InnerType = string

type WrapperType = {readonly inner?: InnerType}

const Inner: Schema.Schema<InnerType> = Schema.String

const Wrapper: Schema.Schema<WrapperType> = Schema.partial(Schema.Struct({inner:Schema.suspend(() => Inner)}))

export const Root: Schema.Schema<RootType> = Schema.partial(Schema.Struct({wrap:Schema.suspend(() => Wrapper)}))

export type RootType_ = typeof Root.Type

export type RootEncoded = typeof Root.Encoded`
    expect(result).toBe(expected)
  })
})
