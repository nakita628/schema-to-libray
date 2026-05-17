import * as v from 'valibot'
import { describe, expect, it } from 'vite-plus/test'
import { Config as AdditionalConfig } from '../additional-properties/output.ts'
import { Combined } from '../allof/output.ts'
import { Merged } from '../allof-message/output.ts'
import { Pet as DiscriminatedPet } from '../discriminated-union/output.ts'
import { Code as LengthMessageCode } from '../length-message/output.ts'
import { StringOrNumber } from '../anyof/output.ts'
import { BrandedTypes } from '../brand/output.ts'
import { A as CircularA } from '../circular/output.ts'
import { User as DefsUser } from '../$defs/output.ts'
import { A as DefinitionsA } from '../definitions/output.ts'
import { User as ErrorUser } from '../error-messages/output.ts'
import { User as MetaUser } from '../meta/output.ts'
import { Order } from '../nested/output.ts'
import { NotString } from '../not/output.ts'
import { Shape } from '../oneof/output.ts'
import { Config as ReadonlyConfig } from '../readonly/output.ts'
import { Schema as SelfSchema } from '../self-reference/output.ts'
import { Schema as SimpleSchema } from '../simple/output.ts'
import { Order as SplitNestedOrder } from '../split-nested/output.ts'
import { User as SplitRefsUser } from '../split-refs/output.ts'
import { User as TitleUser } from '../title/output.ts'

// valibot 1.3.x internals exposed in issue objects.
const NAME_REGEX = /^[a-zA-Z]+$/
const EMAIL_REGEX = /^[\w+-]+(?:\.[\w+-]+)*@[\da-z]+(?:[.-][\da-z]+)*\.[a-z]{2,}$/iu
const UUID_REGEX = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iu
const IS_INTEGER = Number.isInteger
// valibot 1.3 multipleOf check stores the divisor as the requirement.
const MULTIPLE_OF_REQUIREMENT = 1

describe('error-messages: User', () => {
  it('safeParse valid input -> success', () => {
    const result = v.safeParse(ErrorUser, { name: 'taro', age: 30, tags: ['x', 'y'] })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'taro', age: 30, tags: ['x', 'y'] })
    }
  })

  it('safeParse short name -> Name too short', () => {
    const input = { name: 'a', age: 10, tags: ['x'] }
    const result = v.safeParse(ErrorUser, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'min_length',
          input: 'a',
          expected: '>=3',
          received: '1',
          message: 'Name too short',
          requirement: 3,
          path: [{ type: 'object', origin: 'value', input, key: 'name', value: 'a' }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })

  it('safeParse non-alphabetic name -> regex message', () => {
    const input = { name: 'a1b', age: 10, tags: ['x'] }
    const result = v.safeParse(ErrorUser, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'regex',
          input: 'a1b',
          expected: '/^[a-zA-Z]+$/',
          received: '"a1b"',
          message: 'Only alphabetic characters',
          requirement: NAME_REGEX,
          path: [{ type: 'object', origin: 'value', input, key: 'name', value: 'a1b' }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })

  it('safeParse negative age -> Age must be positive', () => {
    const input = { name: 'taro', age: -1, tags: ['x'] }
    const result = v.safeParse(ErrorUser, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'min_value',
          input: -1,
          expected: '>=0',
          received: '-1',
          message: 'Age must be positive',
          requirement: 0,
          path: [{ type: 'object', origin: 'value', input, key: 'age', value: -1 }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })

  it('safeParse fractional age -> Age must be integer', () => {
    const input = { name: 'taro', age: 1.5, tags: ['x'] }
    const result = v.safeParse(ErrorUser, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'integer',
          input: 1.5,
          expected: null,
          received: '1.5',
          message: 'Invalid age',
          requirement: IS_INTEGER,
          path: [{ type: 'object', origin: 'value', input, key: 'age', value: 1.5 }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'multiple_of',
          input: 1.5,
          expected: '%1',
          received: '1.5',
          message: 'Age must be integer',
          requirement: MULTIPLE_OF_REQUIREMENT,
          path: [{ type: 'object', origin: 'value', input, key: 'age', value: 1.5 }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('allof: Combined', () => {
  it('safeParse valid intersect -> success', () => {
    const result = v.safeParse(Combined, { name: 'taro', age: 30 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'taro', age: 30 })
    }
  })

  it('safeParse missing name -> Invalid key', () => {
    const input = { age: 10 }
    const result = v.safeParse(Combined, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'object',
          expected: '"name"',
          received: 'undefined',
          message: 'Invalid key: Expected "name" but received undefined',
          path: [{ type: 'object', origin: 'key', input, key: 'name', value: undefined }],
          input: undefined,
          issues: undefined,
          lang: undefined,
          requirement: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('allof-message: Merged', () => {
  it('safeParse valid -> success', () => {
    const result = v.safeParse(Merged, { name: 'taro', age: 30 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'taro', age: 30 })
    }
  })

  it('safeParse invalid -> merged validation failed', () => {
    const input = { name: 'ab', age: -1 }
    const result = v.safeParse(Merged, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'raw_check',
          input,
          expected: null,
          received: 'Object',
          message: 'merged validation failed',
          path: [{ type: 'object', origin: 'value', input, key: 'name', value: 'ab' }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'raw_check',
          input,
          expected: null,
          received: 'Object',
          message: 'merged validation failed',
          path: [{ type: 'object', origin: 'value', input, key: 'age', value: -1 }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('anyof: StringOrNumber', () => {
  it('safeParse string -> success', () => {
    const result = v.safeParse(StringOrNumber, 'taro')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe('taro')
    }
  })

  it('safeParse number -> success', () => {
    const result = v.safeParse(StringOrNumber, 42)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe(42)
    }
  })

  it('safeParse boolean -> Must be string or number', () => {
    const result = v.safeParse(StringOrNumber, true)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'union',
          input: true,
          expected: '(string | number)',
          received: 'true',
          message: 'Must be string or number',
          issues: [
            {
              kind: 'schema',
              type: 'string',
              input: true,
              expected: 'string',
              received: 'true',
              message: 'Invalid type: Expected string but received true',
              path: undefined,
              requirement: undefined,
              issues: undefined,
              lang: undefined,
              abortEarly: undefined,
              abortPipeEarly: undefined,
            },
            {
              kind: 'schema',
              type: 'number',
              input: true,
              expected: 'number',
              received: 'true',
              message: 'Invalid type: Expected number but received true',
              path: undefined,
              requirement: undefined,
              issues: undefined,
              lang: undefined,
              abortEarly: undefined,
              abortPipeEarly: undefined,
            },
          ],
          path: undefined,
          requirement: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('oneof: Shape', () => {
  it('safeParse circle -> success', () => {
    const result = v.safeParse(Shape, { kind: 'circle', radius: 3 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ kind: 'circle', radius: 3 })
    }
  })

  it('safeParse rectangle -> success', () => {
    const result = v.safeParse(Shape, { kind: 'rectangle', width: 2, height: 4 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ kind: 'rectangle', width: 2, height: 4 })
    }
  })

  it('safeParse unknown kind -> Must be a valid shape', () => {
    const input = { kind: 'triangle' }
    const result = v.safeParse(Shape, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'variant',
          input: 'triangle',
          expected: '("circle" | "rectangle")',
          received: '"triangle"',
          message: 'Must be a valid shape',
          path: [{ type: 'object', origin: 'value', input, key: 'kind', value: 'triangle' }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('additional-properties: Config', () => {
  it('safeParse valid record -> success', () => {
    const result = v.safeParse(AdditionalConfig, { host: 'localhost', port: '8080' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ host: 'localhost', port: '8080' })
    }
  })

  it('safeParse number value -> Invalid type', () => {
    const input = { a: 1 }
    const result = v.safeParse(AdditionalConfig, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'string',
          input: 1,
          expected: 'string',
          received: '1',
          message: 'Invalid type: Expected string but received 1',
          path: [{ type: 'object', origin: 'value', input, key: 'a', value: 1 }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('nested: Order', () => {
  it('safeParse valid order -> success', () => {
    const input = {
      id: 1,
      customer: { name: 'taro', email: 'a@b.com' },
      items: [{ name: 'item', price: 10, quantity: 2 }],
      status: 'pending' as const,
    }
    const result = v.safeParse(Order, input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual(input)
    }
  })

  it('safeParse invalid order -> multiple issues', () => {
    const customer = { name: '', email: 'x' }
    const input = { id: 1.5, customer, items: [], status: 'unknown' }
    const result = v.safeParse(Order, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'integer',
          input: 1.5,
          expected: null,
          received: '1.5',
          message: 'Invalid integer: Received 1.5',
          requirement: IS_INTEGER,
          path: [{ type: 'object', origin: 'value', input, key: 'id', value: 1.5 }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'min_length',
          input: '',
          expected: '>=1',
          received: '0',
          message: 'Invalid length: Expected >=1 but received 0',
          requirement: 1,
          path: [
            { type: 'object', origin: 'value', input, key: 'customer', value: customer },
            { type: 'object', origin: 'value', input: customer, key: 'name', value: '' },
          ],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'email',
          input: 'x',
          expected: null,
          received: '"x"',
          message: 'Invalid email: Received "x"',
          requirement: EMAIL_REGEX,
          path: [
            { type: 'object', origin: 'value', input, key: 'customer', value: customer },
            { type: 'object', origin: 'value', input: customer, key: 'email', value: 'x' },
          ],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'schema',
          type: 'picklist',
          input: 'unknown',
          expected: '("pending" | "confirmed" | "shipped" | "delivered")',
          received: '"unknown"',
          message:
            'Invalid type: Expected ("pending" | "confirmed" | "shipped" | "delivered") but received "unknown"',
          path: [{ type: 'object', origin: 'value', input, key: 'status', value: 'unknown' }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('brand: BrandedTypes', () => {
  it('safeParse valid branded data -> success', () => {
    const input = {
      userId: '12345678-1234-1234-1234-123456789abc',
      email: 'a@b.com',
      price: 10,
      quantity: 2,
      tags: ['t1'],
      name: 'taro',
    }
    const result = v.safeParse(BrandedTypes, input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual(input)
    }
  })

  it('safeParse invalid branded data -> multiple issues', () => {
    const input = {
      userId: 'not-uuid',
      email: 'x',
      price: -1,
      quantity: 1.5,
      tags: [],
      name: '',
    }
    const result = v.safeParse(BrandedTypes, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'uuid',
          input: 'not-uuid',
          expected: null,
          received: '"not-uuid"',
          message: 'Invalid UUID: Received "not-uuid"',
          requirement: UUID_REGEX,
          path: [{ type: 'object', origin: 'value', input, key: 'userId', value: 'not-uuid' }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'email',
          input: 'x',
          expected: null,
          received: '"x"',
          message: 'Invalid email: Received "x"',
          requirement: EMAIL_REGEX,
          path: [{ type: 'object', origin: 'value', input, key: 'email', value: 'x' }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'min_value',
          input: -1,
          expected: '>=0',
          received: '-1',
          message: 'Invalid value: Expected >=0 but received -1',
          requirement: 0,
          path: [{ type: 'object', origin: 'value', input, key: 'price', value: -1 }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'integer',
          input: 1.5,
          expected: null,
          received: '1.5',
          message: 'Invalid integer: Received 1.5',
          requirement: IS_INTEGER,
          path: [{ type: 'object', origin: 'value', input, key: 'quantity', value: 1.5 }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'min_length',
          input: [],
          expected: '>=1',
          received: '0',
          message: 'Invalid length: Expected >=1 but received 0',
          requirement: 1,
          path: [{ type: 'object', origin: 'value', input, key: 'tags', value: [] }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('$defs: User', () => {
  it('safeParse valid -> success', () => {
    const result = v.safeParse(DefsUser, {
      name: 'taro',
      address: { street: 'main', city: 'tokyo' },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({
        name: 'taro',
        address: { street: 'main', city: 'tokyo' },
      })
    }
  })

  it('safeParse without optional address -> success', () => {
    const result = v.safeParse(DefsUser, { name: 'taro' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'taro' })
    }
  })

  it('safeParse number name -> Invalid type', () => {
    const input = { name: 1 }
    const result = v.safeParse(DefsUser, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'string',
          input: 1,
          expected: 'string',
          received: '1',
          message: 'Invalid type: Expected string but received 1',
          path: [{ type: 'object', origin: 'value', input, key: 'name', value: 1 }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('circular: A', () => {
  it('safeParse empty -> success', () => {
    const result = v.safeParse(CircularA, {})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({})
    }
  })

  it('safeParse nested -> success', () => {
    const input = { b: { a: { b: { a: {} } } } }
    const result = v.safeParse(CircularA, input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual(input)
    }
  })

  it('safeParse string at b -> Invalid type', () => {
    const inner = { b: 'x' }
    const mid = { a: inner }
    const input = { b: mid }
    const result = v.safeParse(CircularA, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'object',
          input: 'x',
          expected: 'Object',
          received: '"x"',
          message: 'Invalid type: Expected Object but received "x"',
          path: [
            { type: 'object', origin: 'value', input, key: 'b', value: mid },
            { type: 'object', origin: 'value', input: mid, key: 'a', value: inner },
            { type: 'object', origin: 'value', input: inner, key: 'b', value: 'x' },
          ],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('definitions: A', () => {
  it('safeParse valid -> success', () => {
    const result = v.safeParse(DefinitionsA, { b: { c: 'taro' } })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ b: { c: 'taro' } })
    }
  })

  it('safeParse number c -> Invalid type', () => {
    const b = { c: 1 }
    const input = { b }
    const result = v.safeParse(DefinitionsA, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'string',
          input: 1,
          expected: 'string',
          received: '1',
          message: 'Invalid type: Expected string but received 1',
          path: [
            { type: 'object', origin: 'value', input, key: 'b', value: b },
            { type: 'object', origin: 'value', input: b, key: 'c', value: 1 },
          ],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('meta: User', () => {
  it('safeParse valid -> success', () => {
    const result = v.safeParse(MetaUser, { id: 1, email: 'a@b.com' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ id: 1, email: 'a@b.com' })
    }
  })

  it('safeParse non-integer id and bad email -> two issues', () => {
    const input = { id: 1.5, email: 'bad' }
    const result = v.safeParse(MetaUser, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'integer',
          input: 1.5,
          expected: null,
          received: '1.5',
          message: 'Invalid integer: Received 1.5',
          requirement: IS_INTEGER,
          path: [{ type: 'object', origin: 'value', input, key: 'id', value: 1.5 }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'email',
          input: 'bad',
          expected: null,
          received: '"bad"',
          message: 'Invalid email: Received "bad"',
          requirement: EMAIL_REGEX,
          path: [{ type: 'object', origin: 'value', input, key: 'email', value: 'bad' }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('not: NotString', () => {
  it('safeParse number -> success', () => {
    const result = v.safeParse(NotString, 1)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe(1)
    }
  })

  it('safeParse string -> Must not be a string', () => {
    const result = v.safeParse(NotString, 'a string')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'custom',
          input: 'a string',
          expected: 'unknown',
          received: '"a string"',
          message: 'Must not be a string',
          path: undefined,
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('readonly: Config', () => {
  it('safeParse valid -> success', () => {
    const result = v.safeParse(ReadonlyConfig, { name: 'taro', tags: ['x'], count: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'taro', tags: ['x'], count: 1 })
    }
  })

  it('safeParse invalid -> two issues', () => {
    const input = { name: 1, tags: 'x' }
    const result = v.safeParse(ReadonlyConfig, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'string',
          input: 1,
          expected: 'string',
          received: '1',
          message: 'Invalid type: Expected string but received 1',
          path: [{ type: 'object', origin: 'value', input, key: 'name', value: 1 }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'schema',
          type: 'array',
          input: 'x',
          expected: 'Array',
          received: '"x"',
          message: 'Invalid type: Expected Array but received "x"',
          path: [{ type: 'object', origin: 'value', input, key: 'tags', value: 'x' }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('self-reference: Schema', () => {
  it('safeParse empty -> success', () => {
    const result = v.safeParse(SelfSchema, {})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({})
    }
  })

  it('safeParse nested children -> success', () => {
    const input = { children: [{ children: [{}] }] }
    const result = v.safeParse(SelfSchema, input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual(input)
    }
  })

  it('safeParse string children -> Invalid type', () => {
    const inner = { children: 'x' }
    const arr = [inner]
    const input = { children: arr }
    const result = v.safeParse(SelfSchema, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'array',
          input: 'x',
          expected: 'Array',
          received: '"x"',
          message: 'Invalid type: Expected Array but received "x"',
          path: [
            { type: 'object', origin: 'value', input, key: 'children', value: arr },
            { type: 'array', origin: 'value', input: arr, key: 0, value: inner },
            { type: 'object', origin: 'value', input: inner, key: 'children', value: 'x' },
          ],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('simple: Schema', () => {
  it('safeParse with age -> success', () => {
    const result = v.safeParse(SimpleSchema, { name: 'taro', age: 30 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'taro', age: 30 })
    }
  })

  it('safeParse without optional age -> success', () => {
    const result = v.safeParse(SimpleSchema, { name: 'taro' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'taro' })
    }
  })

  it('safeParse missing name + wrong age -> two issues', () => {
    const input = { age: 'x' }
    const result = v.safeParse(SimpleSchema, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'object',
          expected: '"name"',
          received: 'undefined',
          message: 'Invalid key: Expected "name" but received undefined',
          path: [{ type: 'object', origin: 'key', input, key: 'name', value: undefined }],
          input: undefined,
          issues: undefined,
          lang: undefined,
          requirement: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'schema',
          type: 'number',
          input: 'x',
          expected: 'number',
          received: '"x"',
          message: 'Invalid type: Expected number but received "x"',
          path: [{ type: 'object', origin: 'value', input, key: 'age', value: 'x' }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('title: User', () => {
  it('safeParse valid -> success', () => {
    const result = v.safeParse(TitleUser, { name: 'taro', email: 'a@b.com' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual({ name: 'taro', email: 'a@b.com' })
    }
  })

  it('safeParse bad email -> Invalid email', () => {
    const input = { name: 'x', email: 'bad' }
    const result = v.safeParse(TitleUser, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'email',
          input: 'bad',
          expected: null,
          received: '"bad"',
          message: 'Invalid email: Received "bad"',
          requirement: EMAIL_REGEX,
          path: [{ type: 'object', origin: 'value', input, key: 'email', value: 'bad' }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('split-nested: Order', () => {
  it('safeParse valid -> success', () => {
    const input = {
      id: 1,
      customer: {
        name: 'taro',
        email: 'a@b.com',
        address: { street: 'main', city: 'tokyo' },
      },
      status: 'shipped' as const,
    }
    const result = v.safeParse(SplitNestedOrder, input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual(input)
    }
  })

  it('safeParse invalid -> three issues', () => {
    const customer = { name: '', email: 'x' }
    const input = { id: 1.5, customer, status: 'unknown' }
    const result = v.safeParse(SplitNestedOrder, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'integer',
          input: 1.5,
          expected: null,
          received: '1.5',
          message: 'Invalid integer: Received 1.5',
          requirement: IS_INTEGER,
          path: [{ type: 'object', origin: 'value', input, key: 'id', value: 1.5 }],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'validation',
          type: 'email',
          input: 'x',
          expected: null,
          received: '"x"',
          message: 'Invalid email: Received "x"',
          requirement: EMAIL_REGEX,
          path: [
            { type: 'object', origin: 'value', input, key: 'customer', value: customer },
            { type: 'object', origin: 'value', input: customer, key: 'email', value: 'x' },
          ],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'schema',
          type: 'picklist',
          input: 'unknown',
          expected: '("pending" | "shipped" | "delivered")',
          received: '"unknown"',
          message:
            'Invalid type: Expected ("pending" | "shipped" | "delivered") but received "unknown"',
          path: [{ type: 'object', origin: 'value', input, key: 'status', value: 'unknown' }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('split-refs: User', () => {
  it('safeParse valid -> success', () => {
    const input = {
      name: 'taro',
      address: { street: 'main', city: 'tokyo', zip: '100-0001' },
    }
    const result = v.safeParse(SplitRefsUser, input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toStrictEqual(input)
    }
  })

  it('safeParse missing name + bad address -> two issues', () => {
    const input = { address: 'x' }
    const result = v.safeParse(SplitRefsUser, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'object',
          expected: '"name"',
          received: 'undefined',
          message: 'Invalid key: Expected "name" but received undefined',
          path: [{ type: 'object', origin: 'key', input, key: 'name', value: undefined }],
          input: undefined,
          issues: undefined,
          lang: undefined,
          requirement: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
        {
          kind: 'schema',
          type: 'object',
          input: 'x',
          expected: 'Object',
          received: '"x"',
          message: 'Invalid type: Expected Object but received "x"',
          path: [{ type: 'object', origin: 'value', input, key: 'address', value: 'x' }],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('valibot fixtures: discriminated-union runtime', () => {
  it('valid: cat', () => {
    expect(v.safeParse(DiscriminatedPet, { kind: 'cat', indoor: true }).success).toBe(true)
  })

  it('valid: dog', () => {
    expect(v.safeParse(DiscriminatedPet, { kind: 'dog', breed: 'shiba' }).success).toBe(true)
  })

  it('invalid: unknown discriminator returns x-oneOf-message', () => {
    const input = { kind: 'fish' }
    const result = v.safeParse(DiscriminatedPet, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'schema',
          type: 'variant',
          input: 'fish',
          expected: '("cat" | "dog")',
          received: '"fish"',
          message: 'Must be a known pet kind',
          path: [
            {
              type: 'object',
              origin: 'value',
              input,
              key: 'kind',
              value: 'fish',
            },
          ],
          requirement: undefined,
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})

describe('valibot fixtures: length-message runtime', () => {
  it('valid: exactly 6 chars passes', () => {
    expect(v.safeParse(LengthMessageCode, { code: 'abcdef' }).success).toBe(true)
  })

  it('invalid: empty code returns x-length-message', () => {
    const input = { code: '' }
    const result = v.safeParse(LengthMessageCode, input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues).toStrictEqual([
        {
          kind: 'validation',
          type: 'length',
          input: '',
          expected: '6',
          received: '0',
          message: 'Code must be exactly 6 characters',
          requirement: 6,
          path: [
            {
              type: 'object',
              origin: 'value',
              input,
              key: 'code',
              value: '',
            },
          ],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ])
    }
  })
})
