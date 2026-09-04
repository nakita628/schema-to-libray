import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vite-plus/test'

import { Config as AdditionalPropsConfig } from '../additional-properties/output.ts'
import { Combined } from '../allof/output.ts'
import { Merged } from '../allof-message/output.ts'
import { StringOrNumber } from '../anyof/output.ts'
import { BrandedTypes } from '../brand/output.ts'
import { A as CircularA } from '../circular/output.ts'
import { A as DefinitionsA } from '../definitions/output.ts'
import { User as DefsUser } from '../$defs/output.ts'
import { Event as DiscriminatedEvent } from '../discriminated-union/output.ts'
import { User as ErrorMessagesUser } from '../error-messages/output.ts'
import { Address as IfThenElseAddress } from '../if-then-else/output.ts'
import { Code as LengthMessageCode } from '../length-message/output.ts'
import { User as MetaUser } from '../meta/output.ts'
import { Order as NestedOrder } from '../nested/output.ts'
import { NotString } from '../not/output.ts'
import { Shape } from '../oneof/output.ts'
import { Config as ReadonlyConfig } from '../readonly/output.ts'
import { Schema_ as SelfRefSchema } from '../self-reference/output.ts'
import { Schema_ as SimpleSchema } from '../simple/output.ts'
import { Order as SplitNestedOrder } from '../split-nested/output.ts'
import { User as SplitRefsUser } from '../split-refs/output.ts'
import { User as TitleUser } from '../title/output.ts'

const decode = <A, I>(schema: Schema.Codec<A, I>, value: unknown) =>
  Schema.decodeUnknownResult(schema)(value)

describe('error-messages runtime', () => {
  it('valid', () => {
    const result = decode(ErrorMessagesUser, { name: 'tarou', age: 20, tags: ['a'] })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL name too short', () => {
    const result = decode(ErrorMessagesUser, { name: 'a', age: 20, tags: ['a'] })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Name too short\n  at ["name"]',
      })
    }
  })
  it('FAIL name pattern', () => {
    const result = decode(ErrorMessagesUser, { name: 'tar1', age: 20, tags: ['a'] })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Only alphabetic characters\n  at ["name"]',
      })
    }
  })
  it('FAIL age negative', () => {
    const result = decode(ErrorMessagesUser, { name: 'tarou', age: -1, tags: ['a'] })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Age must be positive\n  at ["age"]',
      })
    }
  })
  it('FAIL missing tags', () => {
    const result = decode(ErrorMessagesUser, { name: 'tarou', age: 20 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["tags"]',
      })
    }
  })
})

describe('allof runtime', () => {
  it('valid', () => {
    const result = decode(Combined, { name: 'a', age: 1 })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing age', () => {
    const result = decode(Combined, { name: 'a' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message: 'Missing key\n  at ["age"]',
      })
    }
  })
  it('FAIL wrong type', () => {
    const result = decode(Combined, { name: 'a', age: 'x' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected number\n  at ["age"]',
      })
    }
  })
})

describe('allof-message runtime', () => {
  it('valid', () => {
    const result = decode(Merged, { name: 'taro', age: 5 })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL', () => {
    const result = decode(Merged, { name: 'ab', age: -1 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'merged validation failed',
      })
    }
  })
})

describe('anyof runtime', () => {
  it('valid string', () => {
    const result = decode(StringOrNumber, 'hi')
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid number', () => {
    const result = decode(StringOrNumber, 5)
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL', () => {
    const result = decode(StringOrNumber, true)
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message: 'Must be string or number',
      })
    }
  })
})

describe('oneof runtime', () => {
  it('valid circle', () => {
    const result = decode(Shape, { kind: 'circle', radius: 1 })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid rectangle', () => {
    const result = decode(Shape, { kind: 'rectangle', width: 1, height: 2 })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL unknown kind', () => {
    const result = decode(Shape, { kind: 'triangle' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Must be a valid shape',
      })
    }
  })
})

describe('not runtime', () => {
  it('valid number', () => {
    const result = decode(NotString, 1)
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL string', () => {
    const result = decode(NotString, 'x')
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message: 'Must not be a string',
      })
    }
  })
})

describe('additional-properties runtime', () => {
  it('valid', () => {
    const result = decode(AdditionalPropsConfig, { a: 'b' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL wrong value type', () => {
    const result = decode(AdditionalPropsConfig, { a: 1 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected string\n  at ["a"]',
      })
    }
  })
})

describe('readonly runtime', () => {
  it('valid', () => {
    const result = decode(ReadonlyConfig, { name: 'a', tags: ['t'] })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing tags', () => {
    const result = decode(ReadonlyConfig, { name: 'a' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["tags"]',
      })
    }
  })
})

describe('$defs runtime', () => {
  it('valid w/o address', () => {
    const result = decode(DefsUser, { name: 'a' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid w/ address', () => {
    const result = decode(DefsUser, { name: 'a', address: { street: 's', city: 'c' } })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing city', () => {
    const result = decode(DefsUser, { name: 'a', address: { street: 's' } })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["address"]["city"]',
      })
    }
  })
})

describe('definitions runtime', () => {
  it('valid empty', () => {
    const result = decode(DefinitionsA, {})
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid nested', () => {
    const result = decode(DefinitionsA, { b: { c: 'x' } })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL wrong leaf', () => {
    const result = decode(DefinitionsA, { b: { c: 1 } })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected string\n  at ["b"]["c"]',
      })
    }
  })
})

describe('nested runtime', () => {
  it('valid', () => {
    const result = decode(NestedOrder, {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [{ name: 'x', price: 1, quantity: 1 }],
      status: 'pending',
    })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad status', () => {
    const result = decode(NestedOrder, {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [],
      status: 'x',
    })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected "pending" | "confirmed" | "shipped" | "delivered"\n  at ["status"]',
      })
    }
  })
})

describe('simple runtime', () => {
  it('valid', () => {
    const result = decode(SimpleSchema, { name: 'a' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing name', () => {
    const result = decode(SimpleSchema, { age: 1 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["name"]',
      })
    }
  })
})

describe('brand runtime', () => {
  it('valid', () => {
    const result = decode(BrandedTypes, {
      userId: '00000000-0000-0000-0000-000000000000',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['t'],
      name: 'x',
    })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad uuid', () => {
    const result = decode(BrandedTypes, {
      userId: 'not-uuid',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['t'],
      name: 'x',
    })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected a UUID\n  at ["userId"]',
      })
    }
  })
})

describe('circular runtime', () => {
  it('valid empty', () => {
    const result = decode(CircularA, {})
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid nested', () => {
    const result = decode(CircularA, { b: { a: { b: undefined } } })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL wrong type', () => {
    const result = decode(CircularA, { b: 1 })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected object\n  at ["b"]',
      })
    }
  })
})

describe('self-reference runtime', () => {
  it('valid', () => {
    const result = decode(SelfRefSchema, { children: [{ children: [] }] })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL wrong children', () => {
    const result = decode(SelfRefSchema, { children: 'x' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected array | undefined\n  at ["children"]',
      })
    }
  })
})

describe('meta runtime', () => {
  it('valid', () => {
    const result = decode(MetaUser, { id: 1, email: 'a@b.com' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad email', () => {
    const result = decode(MetaUser, { id: 1, email: 'x' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected a string matching the RegExp ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\n  at ["email"]',
      })
    }
  })
})

describe('title runtime', () => {
  it('valid', () => {
    const result = decode(TitleUser, { name: 'a', email: 'a@b.com' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad email', () => {
    const result = decode(TitleUser, { name: 'a', email: 'x' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected a string matching the RegExp ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\n  at ["email"]',
      })
    }
  })
})

describe('split-nested runtime', () => {
  it('valid', () => {
    const result = decode(SplitNestedOrder, {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL bad id', () => {
    const result = decode(SplitNestedOrder, {
      id: 'x',
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected number\n  at ["id"]',
      })
    }
  })
})

describe('split-refs runtime', () => {
  it('valid w/o address', () => {
    const result = decode(SplitRefsUser, { name: 'a' })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('valid w/ address', () => {
    const result = decode(SplitRefsUser, {
      name: 'a',
      address: { street: 's', city: 'c' },
    })
    expect(Result.isSuccess(result)).toBe(true)
  })
  it('FAIL missing name', () => {
    const result = decode(SplitRefsUser, {})
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["name"]',
      })
    }
  })
  it('FAIL bad address', () => {
    const result = decode(SplitRefsUser, { name: 'a', address: { street: 's' } })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Missing key\n  at ["address"]["city"]',
      })
    }
  })
})

describe('discriminated-union runtime', () => {
  it('PASS click event', () => {
    const result = decode(DiscriminatedEvent, { type: 'click', x: 1, y: 2 })
    expect(Result.isSuccess(result)).toBe(true)
  })

  it('PASS keypress event', () => {
    const result = decode(DiscriminatedEvent, { type: 'keypress', key: 'Enter' })
    expect(Result.isSuccess(result)).toBe(true)
  })

  it('FAIL unknown discriminator', () => {
    const result = decode(DiscriminatedEvent, { type: 'unknown' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Expected { readonly "type": "click", ... } | { readonly "type": "keypress", ... }',
      })
    }
  })
})

describe('length-message runtime', () => {
  it('PASS exactly 6 chars', () => {
    const result = decode(LengthMessageCode, { code: 'abcdef' })
    expect(Result.isSuccess(result)).toBe(true)
  })

  it('FAIL empty code returns x-length-message', () => {
    const result = decode(LengthMessageCode, { code: '' })
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect({ _tag: result.failure._tag, message: result.failure.message }).toStrictEqual({
        _tag: 'SchemaError',
        message:
          'Code must be exactly 6 characters\n  at ["code"]',
      })
    }
  })
})

describe('if-then-else', () => {
  it('accepts non-JP country without postalCode', () => {
    expect(Schema.is(IfThenElseAddress)({ country: 'US' })).toBe(true)
  })

  it('accepts JP country with matching postalCode', () => {
    expect(Schema.is(IfThenElseAddress)({ country: 'JP', postalCode: '100-0001' })).toBe(true)
  })

  it('rejects JP country missing postalCode', () => {
    expect(Schema.is(IfThenElseAddress)({ country: 'JP' })).toBe(false)
  })
})
