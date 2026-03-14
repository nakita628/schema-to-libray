import fs from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { schemaToArktype } from '../generator/arktype/index.js'
import { schemaToEffect } from '../generator/effect/index.js'
import { schemaToTypebox } from '../generator/typebox/index.js'
import { schemaToValibot } from '../generator/valibot/index.js'
import { schemaToZod } from '../generator/zod/index.js'
import { cli } from './index.js'

// Test run
// pnpm vitest run ./src/cli/index.test.ts

const schema = {
  title: 'User',
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
  },
  required: ['name'],
}

const schemaWithMessages = {
  title: 'UserForm',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, 'x-error-message': 'Name is required' },
    email: { type: 'string', format: 'email', 'x-error-message': 'Invalid email' },
    age: { type: 'integer', minimum: 0, maximum: 150, 'x-error-message': 'Invalid age' },
    role: { enum: ['admin', 'user'], 'x-error-message': 'Invalid role' },
  },
  required: ['name', 'email'],
}

const schemaWithGranularMessages = {
  title: 'Product',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      'x-minimum-message': 'Name cannot be empty',
      'x-maximum-message': 'Name too long',
    },
    sku: {
      type: 'string',
      pattern: '^[A-Z]{3}-[0-9]{4}$',
      'x-pattern-message': 'SKU must be like ABC-1234',
    },
    price: {
      type: 'number',
      minimum: 0,
      'x-minimum-message': 'Price cannot be negative',
    },
    quantity: {
      type: 'integer',
      minimum: 0,
      multipleOf: 1,
      'x-minimum-message': 'Quantity cannot be negative',
      'x-multipleOf-message': 'Quantity must be whole number',
    },
  },
  required: ['name', 'sku', 'price'],
}

const arraySchema = {
  title: 'Config',
  type: 'object',
  properties: {
    tags: { type: 'array', items: { type: 'string' }, minItems: 1 },
    enabled: { type: 'boolean', default: true },
    count: { type: 'integer', nullable: true },
    label: { type: 'string', default: 'untitled' },
  },
  required: ['tags'],
}

const oneOfSchema = {
  title: 'Shape',
  type: 'object',
  properties: {
    kind: { type: 'string' },
    value: {
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    },
  },
  required: ['kind', 'value'],
}

// --- help ---

describe('cli --help', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', '--help']
  })

  it('should return help text when --help is passed', async () => {
    const result = await cli(schemaToZod, 'This is help text.')
    expect(result).toStrictEqual({ ok: true, value: 'This is help text.' })
  })
})

describe('cli -h', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', '-h']
  })

  it('should return help text when -h is passed', async () => {
    const result = await cli(schemaToZod, 'Help text here.')
    expect(result).toStrictEqual({ ok: true, value: 'Help text here.' })
  })
})

// --- validation ---

describe('cli validation', () => {
  it('should fail on invalid input file extension', async () => {
    process.argv = ['node', 'cli.js', 'invalid.txt', '-o', 'output.ts']
    const result = await cli(schemaToZod, 'help')
    expect(result).toStrictEqual({ ok: false, error: 'Input must be a .json, or .yaml file' })
  })

  it('should fail on missing output flag', async () => {
    process.argv = ['node', 'cli.js', 'input.json']
    const result = await cli(schemaToZod, 'help')
    expect(result).toStrictEqual({ ok: false, error: 'Output must be a .ts file' })
  })
})

// --- schema-to-zod ---

describe('schema-to-zod', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-schema.json', '-o', 'test-output-zod.ts']
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-zod.ts', { force: true })
  })

  it('should generate zod schema', async () => {
    const result = await cli(schemaToZod, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-zod.ts' })

    const generatedCode = fs.readFileSync('test-output-zod.ts', 'utf-8')
    const expectedCode = `import * as z from 'zod'

export const User = z.object({ name: z.string(), age: z.int().optional() })
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('schema-to-zod --export-type', () => {
  beforeAll(() => {
    process.argv = [
      'node',
      'cli.js',
      '--export-type',
      'test-schema.json',
      '-o',
      'test-output-zod-et.ts',
    ]
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-zod-et.ts', { force: true })
  })

  it('should generate zod schema with type export', async () => {
    const result = await cli(schemaToZod, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-zod-et.ts' })

    const generatedCode = fs.readFileSync('test-output-zod-et.ts', 'utf-8')
    const expectedCode = `import * as z from 'zod'

export const User = z.object({ name: z.string(), age: z.int().optional() })

export type User = z.infer<typeof User>
`
    expect(generatedCode).toBe(expectedCode)
  })
})

// --- schema-to-valibot ---

describe('schema-to-valibot', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-schema.json', '-o', 'test-output-valibot.ts']
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-valibot.ts', { force: true })
  })

  it('should generate valibot schema', async () => {
    const result = await cli(schemaToValibot, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-valibot.ts' })

    const generatedCode = fs.readFileSync('test-output-valibot.ts', 'utf-8')
    const expectedCode = `import * as v from 'valibot'

export const User = v.object({ name: v.string(), age: v.optional(v.pipe(v.number(), v.integer())) })
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('schema-to-valibot --export-type', () => {
  beforeAll(() => {
    process.argv = [
      'node',
      'cli.js',
      '--export-type',
      'test-schema.json',
      '-o',
      'test-output-valibot-et.ts',
    ]
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-valibot-et.ts', { force: true })
  })

  it('should generate valibot schema with type export', async () => {
    const result = await cli(schemaToValibot, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-valibot-et.ts' })

    const generatedCode = fs.readFileSync('test-output-valibot-et.ts', 'utf-8')
    const expectedCode = `import * as v from 'valibot'

export const User = v.object({ name: v.string(), age: v.optional(v.pipe(v.number(), v.integer())) })

export type UserInput = v.InferInput<typeof User>

export type UserOutput = v.InferOutput<typeof User>
`
    expect(generatedCode).toBe(expectedCode)
  })
})

// --- schema-to-effect ---

describe('schema-to-effect', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-schema.json', '-o', 'test-output-effect.ts']
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-effect.ts', { force: true })
  })

  it('should generate effect schema', async () => {
    const result = await cli(schemaToEffect, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-effect.ts' })

    const generatedCode = fs.readFileSync('test-output-effect.ts', 'utf-8')
    const expectedCode = `import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  age: Schema.optional(Schema.Number.pipe(Schema.int())),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('schema-to-effect --export-type', () => {
  beforeAll(() => {
    process.argv = [
      'node',
      'cli.js',
      '--export-type',
      'test-schema.json',
      '-o',
      'test-output-effect-et.ts',
    ]
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-effect-et.ts', { force: true })
  })

  it('should generate effect schema with type export', async () => {
    const result = await cli(schemaToEffect, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-effect-et.ts' })

    const generatedCode = fs.readFileSync('test-output-effect-et.ts', 'utf-8')
    const expectedCode = `import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  age: Schema.optional(Schema.Number.pipe(Schema.int())),
})

export type UserType_ = typeof User.Type

export type UserEncoded = typeof User.Encoded
`
    expect(generatedCode).toBe(expectedCode)
  })
})

// --- schema-to-typebox ---

describe('schema-to-typebox', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-schema.json', '-o', 'test-output-typebox.ts']
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-typebox.ts', { force: true })
  })

  it('should generate typebox schema', async () => {
    const result = await cli(schemaToTypebox, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-typebox.ts' })

    const generatedCode = fs.readFileSync('test-output-typebox.ts', 'utf-8')
    const expectedCode = `import { Type, type Static } from '@sinclair/typebox'

export const User = Type.Object({ name: Type.String(), age: Type.Optional(Type.Integer()) })
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('schema-to-typebox --export-type', () => {
  beforeAll(() => {
    process.argv = [
      'node',
      'cli.js',
      '--export-type',
      'test-schema.json',
      '-o',
      'test-output-typebox-et.ts',
    ]
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-typebox-et.ts', { force: true })
  })

  it('should generate typebox schema with type export', async () => {
    const result = await cli(schemaToTypebox, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-typebox-et.ts' })

    const generatedCode = fs.readFileSync('test-output-typebox-et.ts', 'utf-8')
    const expectedCode = `import { Type, type Static } from '@sinclair/typebox'

export const User = Type.Object({ name: Type.String(), age: Type.Optional(Type.Integer()) })

export type User = Static<typeof User>
`
    expect(generatedCode).toBe(expectedCode)
  })
})

// --- schema-to-arktype ---

describe('schema-to-arktype', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-schema.json', '-o', 'test-output-arktype.ts']
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-arktype.ts', { force: true })
  })

  it('should generate arktype schema', async () => {
    const result = await cli(schemaToArktype, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-arktype.ts' })

    const generatedCode = fs.readFileSync('test-output-arktype.ts', 'utf-8')
    const expectedCode = `import { type } from 'arktype'

export const User = type({ name: 'string', 'age?': 'number.integer' })
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('schema-to-arktype --export-type', () => {
  beforeAll(() => {
    process.argv = [
      'node',
      'cli.js',
      '--export-type',
      'test-schema.json',
      '-o',
      'test-output-arktype-et.ts',
    ]
    fs.writeFileSync('test-schema.json', JSON.stringify(schema))
  })
  afterAll(() => {
    fs.rmSync('test-schema.json', { force: true })
    fs.rmSync('test-output-arktype-et.ts', { force: true })
  })

  it('should generate arktype schema with type export', async () => {
    const result = await cli(schemaToArktype, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-output-arktype-et.ts' })

    const generatedCode = fs.readFileSync('test-output-arktype-et.ts', 'utf-8')
    const expectedCode = `import { type } from 'arktype'

export const User = type({ name: 'string', 'age?': 'number.integer' })

export type User = typeof User.infer
`
    expect(generatedCode).toBe(expectedCode)
  })
})

// --- x-error-message fixtures ---

describe('x-error-message: schema-to-zod', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-msg-schema.json', '-o', 'test-msg-zod.ts']
    fs.writeFileSync('test-msg-schema.json', JSON.stringify(schemaWithMessages))
  })
  afterAll(() => {
    fs.rmSync('test-msg-schema.json', { force: true })
    fs.rmSync('test-msg-zod.ts', { force: true })
  })

  it('should generate zod schema with x-error-message', async () => {
    const result = await cli(schemaToZod, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-msg-zod.ts' })

    const generatedCode = fs.readFileSync('test-msg-zod.ts', 'utf-8')
    const expectedCode = `import * as z from 'zod'

export const UserForm = z.object({
  name: z.string({ error: 'Name is required' }).min(1),
  email: z.email({ error: 'Invalid email' }),
  age: z.int({ error: 'Invalid age' }).min(0).max(150).optional(),
  role: z.enum(['admin', 'user'], { error: 'Invalid role' }).optional(),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('x-error-message: schema-to-valibot', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-msg-schema.json', '-o', 'test-msg-valibot.ts']
    fs.writeFileSync('test-msg-schema.json', JSON.stringify(schemaWithMessages))
  })
  afterAll(() => {
    fs.rmSync('test-msg-schema.json', { force: true })
    fs.rmSync('test-msg-valibot.ts', { force: true })
  })

  it('should generate valibot schema with x-error-message', async () => {
    const result = await cli(schemaToValibot, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-msg-valibot.ts' })

    const generatedCode = fs.readFileSync('test-msg-valibot.ts', 'utf-8')
    const expectedCode = `import * as v from 'valibot'

export const UserForm = v.object({
  name: v.pipe(v.string('Name is required'), v.minLength(1)),
  email: v.pipe(v.string('Invalid email'), v.email('Invalid email')),
  age: v.optional(
    v.pipe(v.number('Invalid age'), v.integer('Invalid age'), v.minValue(0), v.maxValue(150)),
  ),
  role: v.optional(v.picklist(['admin', 'user'], 'Invalid role')),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('x-error-message: schema-to-effect', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-msg-schema.json', '-o', 'test-msg-effect.ts']
    fs.writeFileSync('test-msg-schema.json', JSON.stringify(schemaWithMessages))
  })
  afterAll(() => {
    fs.rmSync('test-msg-schema.json', { force: true })
    fs.rmSync('test-msg-effect.ts', { force: true })
  })

  it('should generate effect schema with x-error-message', async () => {
    const result = await cli(schemaToEffect, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-msg-effect.ts' })

    const generatedCode = fs.readFileSync('test-msg-effect.ts', 'utf-8')
    const expectedCode = `import { Schema } from 'effect'

export const UserForm = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)).annotations({ message: () => 'Name is required' }),
  email: Schema.String.pipe(
    Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/),
  ).annotations({ message: () => 'Invalid email' }),
  age: Schema.optional(
    Schema.Number.pipe(
      Schema.int({ message: () => 'Invalid age' }),
      Schema.greaterThanOrEqualTo(0),
      Schema.lessThanOrEqualTo(150),
    ),
  ),
  role: Schema.optional(
    Schema.Literal('admin', 'user').annotations({ message: () => 'Invalid role' }),
  ),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('x-error-message: schema-to-typebox', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-msg-schema.json', '-o', 'test-msg-typebox.ts']
    fs.writeFileSync('test-msg-schema.json', JSON.stringify(schemaWithMessages))
  })
  afterAll(() => {
    fs.rmSync('test-msg-schema.json', { force: true })
    fs.rmSync('test-msg-typebox.ts', { force: true })
  })

  it('should generate typebox schema with x-error-message', async () => {
    const result = await cli(schemaToTypebox, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-msg-typebox.ts' })

    const generatedCode = fs.readFileSync('test-msg-typebox.ts', 'utf-8')
    const expectedCode = `import { Type, type Static } from '@sinclair/typebox'

export const UserForm = Type.Object({
  name: Type.String({ minLength: 1, errorMessage: 'Name is required' }),
  email: Type.String({ format: 'email', errorMessage: 'Invalid email' }),
  age: Type.Optional(Type.Integer({ minimum: 0, maximum: 150, errorMessage: 'Invalid age' })),
  role: Type.Optional(
    Type.Union([Type.Literal('admin'), Type.Literal('user')], { errorMessage: 'Invalid role' }),
  ),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('x-error-message: schema-to-arktype', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-msg-schema.json', '-o', 'test-msg-arktype.ts']
    fs.writeFileSync('test-msg-schema.json', JSON.stringify(schemaWithMessages))
  })
  afterAll(() => {
    fs.rmSync('test-msg-schema.json', { force: true })
    fs.rmSync('test-msg-arktype.ts', { force: true })
  })

  it('should generate arktype schema with x-error-message', async () => {
    const result = await cli(schemaToArktype, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-msg-arktype.ts' })

    const generatedCode = fs.readFileSync('test-msg-arktype.ts', 'utf-8')
    const expectedCode = `import { type } from 'arktype'

export const UserForm = type({
  name: type('string >= 1').describe('Name is required'),
  email: type('string.email').describe('Invalid email'),
  'age?': type('number.integer >= 0 <= 150').describe('Invalid age'),
  'role?': type("'admin' | 'user'").describe('Invalid role'),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

// --- granular x-*-message fixtures ---

describe('granular messages: schema-to-zod', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-granular-schema.json', '-o', 'test-granular-zod.ts']
    fs.writeFileSync('test-granular-schema.json', JSON.stringify(schemaWithGranularMessages))
  })
  afterAll(() => {
    fs.rmSync('test-granular-schema.json', { force: true })
    fs.rmSync('test-granular-zod.ts', { force: true })
  })

  it('should generate zod schema with granular messages', async () => {
    const result = await cli(schemaToZod, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-granular-zod.ts' })

    const generatedCode = fs.readFileSync('test-granular-zod.ts', 'utf-8')
    const expectedCode = `import * as z from 'zod'

export const Product = z.object({
  name: z.string().min(1, { error: 'Name cannot be empty' }).max(100, { error: 'Name too long' }),
  sku: z.string().regex(/^[A-Z]{3}-[0-9]{4}$/, { error: 'SKU must be like ABC-1234' }),
  price: z.number().min(0, { error: 'Price cannot be negative' }),
  quantity: z
    .int()
    .min(0, { error: 'Quantity cannot be negative' })
    .multipleOf(1, { error: 'Quantity must be whole number' })
    .optional(),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('granular messages: schema-to-valibot', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-granular-schema.json', '-o', 'test-granular-valibot.ts']
    fs.writeFileSync('test-granular-schema.json', JSON.stringify(schemaWithGranularMessages))
  })
  afterAll(() => {
    fs.rmSync('test-granular-schema.json', { force: true })
    fs.rmSync('test-granular-valibot.ts', { force: true })
  })

  it('should generate valibot schema with granular messages', async () => {
    const result = await cli(schemaToValibot, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-granular-valibot.ts' })

    const generatedCode = fs.readFileSync('test-granular-valibot.ts', 'utf-8')
    const expectedCode = `import * as v from 'valibot'

export const Product = v.object({
  name: v.pipe(
    v.string(),
    v.minLength(1, 'Name cannot be empty'),
    v.maxLength(100, 'Name too long'),
  ),
  sku: v.pipe(v.string(), v.regex(/^[A-Z]{3}-[0-9]{4}$/, 'SKU must be like ABC-1234')),
  price: v.pipe(v.number(), v.minValue(0, 'Price cannot be negative')),
  quantity: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(0, 'Quantity cannot be negative'),
      v.multipleOf(1, 'Quantity must be whole number'),
    ),
  ),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('granular messages: schema-to-effect', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-granular-schema.json', '-o', 'test-granular-effect.ts']
    fs.writeFileSync('test-granular-schema.json', JSON.stringify(schemaWithGranularMessages))
  })
  afterAll(() => {
    fs.rmSync('test-granular-schema.json', { force: true })
    fs.rmSync('test-granular-effect.ts', { force: true })
  })

  it('should generate effect schema with granular messages', async () => {
    const result = await cli(schemaToEffect, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-granular-effect.ts' })

    const generatedCode = fs.readFileSync('test-granular-effect.ts', 'utf-8')
    const expectedCode = `import { Schema } from 'effect'

export const Product = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1, { message: () => 'Name cannot be empty' }),
    Schema.maxLength(100, { message: () => 'Name too long' }),
  ),
  sku: Schema.String.pipe(
    Schema.pattern(/^[A-Z]{3}-[0-9]{4}$/, { message: () => 'SKU must be like ABC-1234' }),
  ),
  price: Schema.Number.pipe(
    Schema.greaterThanOrEqualTo(0, { message: () => 'Price cannot be negative' }),
  ),
  quantity: Schema.optional(
    Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(0, { message: () => 'Quantity cannot be negative' }),
      Schema.multipleOf(1, { message: () => 'Quantity must be whole number' }),
    ),
  ),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

// --- array / nullable / default fixtures ---

describe('array/nullable/default: schema-to-zod', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-array-schema.json', '-o', 'test-array-zod.ts']
    fs.writeFileSync('test-array-schema.json', JSON.stringify(arraySchema))
  })
  afterAll(() => {
    fs.rmSync('test-array-schema.json', { force: true })
    fs.rmSync('test-array-zod.ts', { force: true })
  })

  it('should generate zod schema with array/nullable/default', async () => {
    const result = await cli(schemaToZod, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-array-zod.ts' })

    const generatedCode = fs.readFileSync('test-array-zod.ts', 'utf-8')
    const expectedCode = `import * as z from 'zod'

export const Config = z.object({
  tags: z.array(z.string()).min(1),
  enabled: z.boolean().default(true).optional(),
  count: z.int().nullable().optional(),
  label: z.string().default('untitled').optional(),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('array/nullable/default: schema-to-valibot', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-array-schema.json', '-o', 'test-array-valibot.ts']
    fs.writeFileSync('test-array-schema.json', JSON.stringify(arraySchema))
  })
  afterAll(() => {
    fs.rmSync('test-array-schema.json', { force: true })
    fs.rmSync('test-array-valibot.ts', { force: true })
  })

  it('should generate valibot schema with array/nullable/default', async () => {
    const result = await cli(schemaToValibot, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-array-valibot.ts' })

    const generatedCode = fs.readFileSync('test-array-valibot.ts', 'utf-8')
    const expectedCode = `import * as v from 'valibot'

export const Config = v.object({
  tags: v.pipe(v.array(v.string()), v.minLength(1)),
  enabled: v.optional(v.optional(v.boolean(), true)),
  count: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
  label: v.optional(v.optional(v.string(), 'untitled')),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('array/nullable/default: schema-to-effect', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-array-schema.json', '-o', 'test-array-effect.ts']
    fs.writeFileSync('test-array-schema.json', JSON.stringify(arraySchema))
  })
  afterAll(() => {
    fs.rmSync('test-array-schema.json', { force: true })
    fs.rmSync('test-array-effect.ts', { force: true })
  })

  it('should generate effect schema with array/nullable/default', async () => {
    const result = await cli(schemaToEffect, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-array-effect.ts' })

    const generatedCode = fs.readFileSync('test-array-effect.ts', 'utf-8')
    const expectedCode = `import { Schema } from 'effect'

export const Config = Schema.Struct({
  tags: Schema.Array(Schema.String).pipe(Schema.minItems(1)),
  enabled: Schema.optional(Schema.optionalWith(Schema.Boolean, { default: () => true })),
  count: Schema.optional(Schema.NullOr(Schema.Number.pipe(Schema.int()))),
  label: Schema.optional(Schema.optionalWith(Schema.String, { default: () => 'untitled' })),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('array/nullable/default: schema-to-typebox', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-array-schema.json', '-o', 'test-array-typebox.ts']
    fs.writeFileSync('test-array-schema.json', JSON.stringify(arraySchema))
  })
  afterAll(() => {
    fs.rmSync('test-array-schema.json', { force: true })
    fs.rmSync('test-array-typebox.ts', { force: true })
  })

  it('should generate typebox schema with array/nullable/default', async () => {
    const result = await cli(schemaToTypebox, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-array-typebox.ts' })

    const generatedCode = fs.readFileSync('test-array-typebox.ts', 'utf-8')
    const expectedCode = `import { Type, type Static } from '@sinclair/typebox'

export const Config = Type.Object({
  tags: Type.Array(Type.String(), { minItems: 1 }),
  enabled: Type.Optional(Type.Optional(Type.Boolean(), { default: true })),
  count: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
  label: Type.Optional(Type.Optional(Type.String(), { default: 'untitled' })),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('array/nullable/default: schema-to-arktype', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-array-schema.json', '-o', 'test-array-arktype.ts']
    fs.writeFileSync('test-array-schema.json', JSON.stringify(arraySchema))
  })
  afterAll(() => {
    fs.rmSync('test-array-schema.json', { force: true })
    fs.rmSync('test-array-arktype.ts', { force: true })
  })

  it('should generate arktype schema with array/nullable/default', async () => {
    const result = await cli(schemaToArktype, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-array-arktype.ts' })

    const generatedCode = fs.readFileSync('test-array-arktype.ts', 'utf-8')
    const expectedCode = `import { type } from 'arktype'

export const Config = type({
  tags: type('string[]').and(type('unknown[] >= 1')),
  'enabled?': 'boolean',
  'count?': 'number.integer | null',
  'label?': 'string',
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

// --- oneOf fixtures ---

describe('oneOf: schema-to-zod', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-oneof-schema.json', '-o', 'test-oneof-zod.ts']
    fs.writeFileSync('test-oneof-schema.json', JSON.stringify(oneOfSchema))
  })
  afterAll(() => {
    fs.rmSync('test-oneof-schema.json', { force: true })
    fs.rmSync('test-oneof-zod.ts', { force: true })
  })

  it('should generate zod schema with oneOf', async () => {
    const result = await cli(schemaToZod, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-oneof-zod.ts' })

    const generatedCode = fs.readFileSync('test-oneof-zod.ts', 'utf-8')
    const expectedCode = `import * as z from 'zod'

export const Shape = z.object({
  kind: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('oneOf: schema-to-valibot', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-oneof-schema.json', '-o', 'test-oneof-valibot.ts']
    fs.writeFileSync('test-oneof-schema.json', JSON.stringify(oneOfSchema))
  })
  afterAll(() => {
    fs.rmSync('test-oneof-schema.json', { force: true })
    fs.rmSync('test-oneof-valibot.ts', { force: true })
  })

  it('should generate valibot schema with oneOf', async () => {
    const result = await cli(schemaToValibot, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-oneof-valibot.ts' })

    const generatedCode = fs.readFileSync('test-oneof-valibot.ts', 'utf-8')
    const expectedCode = `import * as v from 'valibot'

export const Shape = v.object({
  kind: v.string(),
  value: v.union([v.string(), v.number(), v.boolean()]),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('oneOf: schema-to-effect', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-oneof-schema.json', '-o', 'test-oneof-effect.ts']
    fs.writeFileSync('test-oneof-schema.json', JSON.stringify(oneOfSchema))
  })
  afterAll(() => {
    fs.rmSync('test-oneof-schema.json', { force: true })
    fs.rmSync('test-oneof-effect.ts', { force: true })
  })

  it('should generate effect schema with oneOf', async () => {
    const result = await cli(schemaToEffect, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-oneof-effect.ts' })

    const generatedCode = fs.readFileSync('test-oneof-effect.ts', 'utf-8')
    const expectedCode = `import { Schema } from 'effect'

export const Shape = Schema.Struct({
  kind: Schema.String,
  value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('oneOf: schema-to-typebox', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-oneof-schema.json', '-o', 'test-oneof-typebox.ts']
    fs.writeFileSync('test-oneof-schema.json', JSON.stringify(oneOfSchema))
  })
  afterAll(() => {
    fs.rmSync('test-oneof-schema.json', { force: true })
    fs.rmSync('test-oneof-typebox.ts', { force: true })
  })

  it('should generate typebox schema with oneOf', async () => {
    const result = await cli(schemaToTypebox, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-oneof-typebox.ts' })

    const generatedCode = fs.readFileSync('test-oneof-typebox.ts', 'utf-8')
    const expectedCode = `import { Type, type Static } from '@sinclair/typebox'

export const Shape = Type.Object({
  kind: Type.String(),
  value: Type.Union([Type.String(), Type.Number(), Type.Boolean()]),
})
`
    expect(generatedCode).toBe(expectedCode)
  })
})

describe('oneOf: schema-to-arktype', () => {
  beforeAll(() => {
    process.argv = ['node', 'cli.js', 'test-oneof-schema.json', '-o', 'test-oneof-arktype.ts']
    fs.writeFileSync('test-oneof-schema.json', JSON.stringify(oneOfSchema))
  })
  afterAll(() => {
    fs.rmSync('test-oneof-schema.json', { force: true })
    fs.rmSync('test-oneof-arktype.ts', { force: true })
  })

  it('should generate arktype schema with oneOf', async () => {
    const result = await cli(schemaToArktype, 'help')
    expect(result).toStrictEqual({ ok: true, value: 'Generated: test-oneof-arktype.ts' })

    const generatedCode = fs.readFileSync('test-oneof-arktype.ts', 'utf-8')
    const expectedCode = `import { type } from 'arktype'

export const Shape = type({ kind: 'string', value: 'string | number | boolean' })
`
    expect(generatedCode).toBe(expectedCode)
  })
})

// --- syntax validation ---

describe('syntax validation', () => {
  const schemas = [
    { name: 'basic', schema },
    { name: 'messages', schema: schemaWithMessages },
    { name: 'granular', schema: schemaWithGranularMessages },
    { name: 'array', schema: arraySchema },
    { name: 'oneOf', schema: oneOfSchema },
  ]

  const generators = [
    { name: 'zod', fn: schemaToZod },
    { name: 'valibot', fn: schemaToValibot },
    { name: 'effect', fn: schemaToEffect },
    { name: 'typebox', fn: schemaToTypebox },
    { name: 'arktype', fn: schemaToArktype },
  ]

  for (const s of schemas) {
    for (const g of generators) {
      const outFile = `test-syntax-${s.name}-${g.name}.ts`
      describe(`${s.name} × ${g.name}`, () => {
        beforeAll(() => {
          process.argv = ['node', 'cli.js', `test-syntax-${s.name}.json`, '-o', outFile]
          fs.writeFileSync(`test-syntax-${s.name}.json`, JSON.stringify(s.schema))
        })
        afterAll(() => {
          fs.rmSync(`test-syntax-${s.name}.json`, { force: true })
          fs.rmSync(outFile, { force: true })
        })

        it('should generate valid TypeScript', async () => {
          const result = await cli(g.fn, 'help')
          expect(result).toStrictEqual({ ok: true, value: `Generated: ${outFile}` })

          const code = fs.readFileSync(outFile, 'utf-8')
          expect(code.length).toBeGreaterThan(0)
          expect(code).toContain('export const')
          expect(code).toContain('import')

          // Verify no unclosed brackets/parens
          const opens = (code.match(/[({[]/g) || []).length
          const closes = (code.match(/[)}\]]/g) || []).length
          expect(opens).toBe(closes)
        })
      })
    }
  }
})
