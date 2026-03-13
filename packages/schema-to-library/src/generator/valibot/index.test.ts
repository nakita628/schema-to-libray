import { describe, expect, it } from 'vitest'
import { schemaToValibot } from './index.js'

// Test run
// pnpm vitest run ./src/valibot/index.test.ts

describe('schemaToValibot', () => {
  it('should generate simple schema without definitions', () => {
    const result = schemaToValibot({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    const expected = `import * as v from 'valibot'

export const Schema = v.object({name:v.string(),age:v.optional(v.number())})

export type SchemaInput = v.InferInput<typeof Schema>

export type SchemaOutput = v.InferOutput<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should generate schema with title', () => {
    const result = schemaToValibot({
      title: 'User',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    })
    const expected = `import * as v from 'valibot'

export const User = v.partial(v.object({name:v.string()}))

export type UserInput = v.InferInput<typeof User>

export type UserOutput = v.InferOutput<typeof User>`
    expect(result).toBe(expected)
  })

  it('should generate schema with self-referencing types', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'

type NodeType = {children?: NodeType[]}

export const Node: v.GenericSchema<NodeType> = v.partial(v.object({children:v.array(v.lazy(() => Node))}))

export type NodeInput = v.InferInput<typeof Node>

export type NodeOutput = v.InferOutput<typeof Node>`
    expect(result).toBe(expected)
  })

  it('should generate schema with multiple definitions', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'

type AType = {b?: BType}

type CType = string

type BType = {c?: CType}

const C: v.GenericSchema<CType> = v.string()

const B: v.GenericSchema<BType> = v.partial(v.object({c:v.lazy(() => C)}))

export const A: v.GenericSchema<AType> = v.partial(v.object({b:v.lazy(() => B)}))

export type AInput = v.InferInput<typeof A>

export type AOutput = v.InferOutput<typeof A>`
    expect(result).toBe(expected)
  })

  it('should handle schema with $defs instead of definitions', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'

type UserType = {address?: AddressType}

type AddressType = {street?: string}

const Address: v.GenericSchema<AddressType> = v.partial(v.object({street:v.string()}))

export const User: v.GenericSchema<UserType> = v.partial(v.object({address:v.lazy(() => Address)}))

export type UserInput = v.InferInput<typeof User>

export type UserOutput = v.InferOutput<typeof User>`
    expect(result).toBe(expected)
  })

  it('should handle schema with direct self reference', () => {
    const result = schemaToValibot({
      title: 'Schema',
      type: 'object',
      properties: {
        children: {
          type: 'array',
          items: { $ref: '#' },
        },
      },
    })
    const expected = `import * as v from 'valibot'

type SchemaType = {children?: v.InferOutput<typeof Schema>[]}

export const Schema: v.GenericSchema<SchemaType> = v.partial(v.object({children:v.array(v.lazy(() => Schema))}))

export type SchemaInput = v.InferInput<typeof Schema>

export type SchemaOutput = v.InferOutput<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle schema with oneOf', () => {
    const result = schemaToValibot({
      title: 'Union',
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Union = v.partial(v.object({value:v.union([v.string(),v.number()])}))

export type UnionInput = v.InferInput<typeof Union>

export type UnionOutput = v.InferOutput<typeof Union>`
    expect(result).toBe(expected)
  })

  it('should handle schema with allOf', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'

export const AllOf = v.partial(v.object({value:v.intersect([v.partial(v.object({name:v.string()})),v.partial(v.object({age:v.number()}))])}))

export type AllOfInput = v.InferInput<typeof AllOf>

export type AllOfOutput = v.InferOutput<typeof AllOf>`
    expect(result).toBe(expected)
  })

  it('should handle schema with enum', () => {
    const result = schemaToValibot({
      title: 'Enum',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Enum = v.partial(v.object({status:v.picklist(["active","inactive"])}))

export type EnumInput = v.InferInput<typeof Enum>

export type EnumOutput = v.InferOutput<typeof Enum>`
    expect(result).toBe(expected)
  })

  it('should handle schema with const', () => {
    const result = schemaToValibot({
      title: 'Const',
      type: 'object',
      properties: {
        type: {
          const: 'user',
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Const = v.partial(v.object({type:v.literal("user")}))

export type ConstInput = v.InferInput<typeof Const>

export type ConstOutput = v.InferOutput<typeof Const>`
    expect(result).toBe(expected)
  })

  it('should handle schema with format', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'

export const Format = v.partial(v.object({email:v.pipe(v.string(),v.email()),uuid:v.pipe(v.string(),v.uuid())}))

export type FormatInput = v.InferInput<typeof Format>

export type FormatOutput = v.InferOutput<typeof Format>`
    expect(result).toBe(expected)
  })

  it('should handle schema with pattern', () => {
    const result = schemaToValibot({
      title: 'Pattern',
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          pattern: '^d+$',
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Pattern = v.partial(v.object({phone:v.pipe(v.string(),v.regex(/^d+$/))}))

export type PatternInput = v.InferInput<typeof Pattern>

export type PatternOutput = v.InferOutput<typeof Pattern>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minimum/maximum', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'

export const MinMax = v.partial(v.object({age:v.pipe(v.number(),v.minValue(0),v.maxValue(120))}))

export type MinMaxInput = v.InferInput<typeof MinMax>

export type MinMaxOutput = v.InferOutput<typeof MinMax>`
    expect(result).toBe(expected)
  })

  it('should handle schema with minLength/maxLength', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'

export const Length = v.partial(v.object({name:v.pipe(v.string(),v.minLength(1),v.maxLength(100))}))

export type LengthInput = v.InferInput<typeof Length>

export type LengthOutput = v.InferOutput<typeof Length>`
    expect(result).toBe(expected)
  })

  it('should handle schema with required properties', () => {
    const result = schemaToValibot({
      title: 'Required',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    })
    const expected = `import * as v from 'valibot'

export const Required = v.object({name:v.string(),age:v.number()})

export type RequiredInput = v.InferInput<typeof Required>

export type RequiredOutput = v.InferOutput<typeof Required>`
    expect(result).toBe(expected)
  })

  it('should handle schema with additionalProperties', () => {
    const result = schemaToValibot({
      title: 'Additional',
      type: 'object',
      additionalProperties: { type: 'string' },
    })
    const expected = `import * as v from 'valibot'

export const Additional = v.record(v.string(),v.string())

export type AdditionalInput = v.InferInput<typeof Additional>

export type AdditionalOutput = v.InferOutput<typeof Additional>`
    expect(result).toBe(expected)
  })

  it('should handle schema with integer type', () => {
    const result = schemaToValibot({
      title: 'Int',
      type: 'object',
      properties: {
        count: { type: 'integer' },
        score: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['count', 'score'],
    })
    const expected = `import * as v from 'valibot'

export const Int = v.object({count:v.pipe(v.number(),v.integer()),score:v.pipe(v.number(),v.integer(),v.minValue(0),v.maxValue(100))})

export type IntInput = v.InferInput<typeof Int>

export type IntOutput = v.InferOutput<typeof Int>`
    expect(result).toBe(expected)
  })

  it('should handle schema with array', () => {
    const result = schemaToValibot({
      title: 'Array',
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const Array = v.partial(v.object({items:v.array(v.string())}))

export type ArrayInput = v.InferInput<typeof Array>

export type ArrayOutput = v.InferOutput<typeof Array>`
    expect(result).toBe(expected)
  })

  it('should handle schema with strictObject', () => {
    const result = schemaToValibot({
      type: 'object',
      properties: { test: { type: 'string' } },
      required: ['test'],
      additionalProperties: false,
    })
    const expected = `import * as v from 'valibot'

export const Schema = v.strictObject({test:v.string()})

export type SchemaInput = v.InferInput<typeof Schema>

export type SchemaOutput = v.InferOutput<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should handle schema with looseObject', () => {
    const result = schemaToValibot({
      type: 'object',
      properties: { test: { type: 'string' } },
      required: ['test'],
      additionalProperties: true,
    })
    const expected = `import * as v from 'valibot'

export const Schema = v.looseObject({test:v.string()})

export type SchemaInput = v.InferInput<typeof Schema>

export type SchemaOutput = v.InferOutput<typeof Schema>`
    expect(result).toBe(expected)
  })

  it('should omit type export when exportType is false', () => {
    const result = schemaToValibot(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      { exportType: false },
    )
    const expected = `import * as v from 'valibot'

export const Schema = v.partial(v.object({name:v.string()}))`
    expect(result).toBe(expected)
  })

  it('should handle allOf with default value', () => {
    const result = schemaToValibot({
      title: 'WithDefault',
      type: 'object',
      properties: {
        status: {
          allOf: [{ type: 'string' }, { default: 'active' }],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const WithDefault = v.partial(v.object({status:v.optional(v.string(),"active")}))

export type WithDefaultInput = v.InferInput<typeof WithDefault>

export type WithDefaultOutput = v.InferOutput<typeof WithDefault>`
    expect(result).toBe(expected)
  })

  it('should handle allOf with nullable and default', () => {
    const result = schemaToValibot({
      title: 'NullDefault',
      type: 'object',
      properties: {
        value: {
          allOf: [{ type: 'string' }, { default: 'x' }, { type: 'null' }],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const NullDefault = v.partial(v.object({value:v.nullable(v.optional(v.string(),"x"))}))

export type NullDefaultInput = v.InferInput<typeof NullDefault>

export type NullDefaultOutput = v.InferOutput<typeof NullDefault>`
    expect(result).toBe(expected)
  })

  it('should handle anyOf combinator', () => {
    const result = schemaToValibot({
      title: 'AnyOf',
      type: 'object',
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
    })
    const expected = `import * as v from 'valibot'

export const AnyOf = v.partial(v.object({value:v.union([v.string(),v.number()])}))

export type AnyOfInput = v.InferInput<typeof AnyOf>

export type AnyOfOutput = v.InferOutput<typeof AnyOf>`
    expect(result).toBe(expected)
  })

  it('should handle array with minItems/maxItems', () => {
    const result = schemaToValibot({
      title: 'Arr',
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 10 },
      },
      required: ['tags'],
    })
    const expected = `import * as v from 'valibot'

export const Arr = v.object({tags:v.pipe(v.array(v.string()),v.minLength(1),v.maxLength(10))})

export type ArrInput = v.InferInput<typeof Arr>

export type ArrOutput = v.InferOutput<typeof Arr>`
    expect(result).toBe(expected)
  })

  it('should handle array with fixed length', () => {
    const result = schemaToValibot({
      title: 'Fixed',
      type: 'object',
      properties: {
        pair: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
      },
      required: ['pair'],
    })
    const expected = `import * as v from 'valibot'

export const Fixed = v.object({pair:v.pipe(v.array(v.number()),v.length(3))})

export type FixedInput = v.InferInput<typeof Fixed>

export type FixedOutput = v.InferOutput<typeof Fixed>`
    expect(result).toBe(expected)
  })

  it('should handle nullable type', () => {
    const result = schemaToValibot({
      title: 'Null',
      type: 'object',
      properties: {
        value: { type: 'string', nullable: true },
      },
      required: ['value'],
    })
    const expected = `import * as v from 'valibot'

export const Null = v.object({value:v.nullable(v.string())})

export type NullInput = v.InferInput<typeof Null>

export type NullOutput = v.InferOutput<typeof Null>`
    expect(result).toBe(expected)
  })

  it('should handle default value', () => {
    const result = schemaToValibot({
      title: 'Def',
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
      },
    })
    const expected = `import * as v from 'valibot'

export const Def = v.partial(v.object({enabled:v.optional(v.boolean(),true)}))

export type DefInput = v.InferInput<typeof Def>

export type DefOutput = v.InferOutput<typeof Def>`
    expect(result).toBe(expected)
  })

  it('should handle date type', () => {
    const result = schemaToValibot({
      title: 'D',
      type: 'date',
    })
    const expected = `import * as v from 'valibot'

export const D = v.date()

export type DInput = v.InferInput<typeof D>

export type DOutput = v.InferOutput<typeof D>`
    expect(result).toBe(expected)
  })

  it('should handle null type', () => {
    const result = schemaToValibot({
      title: 'N',
      type: 'null',
    })
    const expected = `import * as v from 'valibot'

export const N = v.nullable(v.null())

export type NInput = v.InferInput<typeof N>

export type NOutput = v.InferOutput<typeof N>`
    expect(result).toBe(expected)
  })

  it('should handle object type without properties', () => {
    const result = schemaToValibot({
      title: 'Empty',
      type: 'object',
    })
    const expected = `import * as v from 'valibot'

export const Empty = v.object({})

export type EmptyInput = v.InferInput<typeof Empty>

export type EmptyOutput = v.InferOutput<typeof Empty>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with oneOf type', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'\n\ntype RootType = {status?: StatusType}\n\ntype StatusType = (string | number)\n\nconst Status: v.GenericSchema<StatusType> = v.union([v.string(),v.number()])\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({status:v.lazy(() => Status)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with anyOf type', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'\n\ntype RootType = {value?: ValueType}\n\ntype ValueType = (boolean | string)\n\nconst Value: v.GenericSchema<ValueType> = v.union([v.boolean(),v.string()])\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({value:v.lazy(() => Value)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with allOf type', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'\n\ntype RootType = {data?: CombinedType}\n\ntype CombinedType = ({a?: string} & {b?: number})\n\nconst Combined: v.GenericSchema<CombinedType> = v.intersect([v.partial(v.object({a:v.string()})),v.partial(v.object({b:v.number()}))])\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({data:v.lazy(() => Combined)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with const value', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Version: { const: 'v1' },
      },
      properties: {
        version: { $ref: '#/definitions/Version' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {version?: VersionType}\n\ntype VersionType = "v1"\n\nconst Version: v.GenericSchema<VersionType> = v.literal("v1")\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({version:v.lazy(() => Version)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with enum', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Color: { enum: ['red', 'green', 'blue'] },
      },
      properties: {
        color: { $ref: '#/definitions/Color' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {color?: ColorType}\n\ntype ColorType = ("red" | "green" | "blue")\n\nconst Color: v.GenericSchema<ColorType> = v.picklist(["red","green","blue"])\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({color:v.lazy(() => Color)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with single enum', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        SingleVal: { enum: ['only'] },
      },
      properties: {
        val: { $ref: '#/definitions/SingleVal' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {val?: SingleValType}\n\ntype SingleValType = "only"\n\nconst SingleVal: v.GenericSchema<SingleValType> = v.literal('only')\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({val:v.lazy(() => SingleVal)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with array type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Tags: { type: 'array', items: { type: 'string' } },
      },
      properties: {
        tags: { $ref: '#/definitions/Tags' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {tags?: TagsType}\n\ntype TagsType = string[]\n\nconst Tags: v.GenericSchema<TagsType> = v.array(v.string())\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({tags:v.lazy(() => Tags)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with date type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Timestamp: { type: 'date' },
      },
      properties: {
        ts: { $ref: '#/definitions/Timestamp' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {ts?: TimestampType}\n\ntype TimestampType = Date\n\nconst Timestamp: v.GenericSchema<TimestampType> = v.date()\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({ts:v.lazy(() => Timestamp)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with null type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Nothing: { type: 'null' },
      },
      properties: {
        n: { $ref: '#/definitions/Nothing' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {n?: NothingType}\n\ntype NothingType = null\n\nconst Nothing: v.GenericSchema<NothingType> = v.nullable(v.null())\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({n:v.lazy(() => Nothing)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with boolean type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Flag: { type: 'boolean' },
      },
      properties: {
        flag: { $ref: '#/definitions/Flag' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {flag?: FlagType}\n\ntype FlagType = boolean\n\nconst Flag: v.GenericSchema<FlagType> = v.boolean()\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({flag:v.lazy(() => Flag)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with integer type', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Count: { type: 'integer' },
      },
      properties: {
        count: { $ref: '#/definitions/Count' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {count?: CountType}\n\ntype CountType = number\n\nconst Count: v.GenericSchema<CountType> = v.pipe(v.number(),v.integer())\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({count:v.lazy(() => Count)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with additionalProperties boolean true', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Loose: { type: 'object', additionalProperties: true },
      },
      properties: {
        l: { $ref: '#/definitions/Loose' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {l?: LooseType}\n\ntype LooseType = Record<string, unknown>\n\nconst Loose: v.GenericSchema<LooseType> = v.any()\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({l:v.lazy(() => Loose)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with additionalProperties schema', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Dict: { type: 'object', additionalProperties: { type: 'number' } },
      },
      properties: {
        d: { $ref: '#/definitions/Dict' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {d?: DictType}\n\ntype DictType = Record<string, number>\n\nconst Dict: v.GenericSchema<DictType> = v.record(v.string(),v.number())\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({d:v.lazy(() => Dict)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with not keyword', () => {
    const result = schemaToValibot({
      title: 'Root',
      type: 'object',
      definitions: {
        Neg: { not: { type: 'string' } },
      },
      properties: {
        neg: { $ref: '#/definitions/Neg' },
      },
    })
    const expected = `import * as v from 'valibot'\n\ntype RootType = {neg?: NegType}\n\ntype NegType = unknown\n\nconst Neg: v.GenericSchema<NegType> = v.any()\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({neg:v.lazy(() => Neg)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })

  it('should handle definitions with key escaping', () => {
    const result = schemaToValibot({
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
    const expected = `import * as v from 'valibot'\n\ntype RootType = {data?: SpecialType}\n\ntype SpecialType = {"x-value": string; normal?: number}\n\nconst Special: v.GenericSchema<SpecialType> = v.object({"x-value":v.string(),normal:v.optional(v.number())})\n\nexport const Root: v.GenericSchema<RootType> = v.partial(v.object({data:v.lazy(() => Special)}))\n\nexport type RootInput = v.InferInput<typeof Root>\n\nexport type RootOutput = v.InferOutput<typeof Root>`
    expect(result).toBe(expected)
  })
})
