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
})
