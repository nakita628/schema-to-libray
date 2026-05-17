import { Either, Schema } from 'effect'
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

const decode = <A, I>(schema: Schema.Schema<A, I, never>, value: unknown) =>
  Schema.decodeUnknownEither(schema)(value)

describe('error-messages runtime', () => {
  it('valid', () => {
    const valid = decode(ErrorMessagesUser, { name: 'tarou', age: 20, tags: ['a'] })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL name too short', () => {
    const valid = decode(ErrorMessagesUser, { name: 'a', age: 20, tags: ['a'] })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: a string matching the pattern ^[a-zA-Z]+$ & minLength(3) & maxLength(20); readonly age: int & greaterThanOrEqualTo(0) & lessThanOrEqualTo(120) & multipleOf(1); readonly tags: minItems(1) & maxItems(5) }\n└─ ["name"]\n   └─ Name too short',
      })
    }
  })
  it('FAIL name pattern', () => {
    const valid = decode(ErrorMessagesUser, { name: 'tar1', age: 20, tags: ['a'] })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: a string matching the pattern ^[a-zA-Z]+$ & minLength(3) & maxLength(20); readonly age: int & greaterThanOrEqualTo(0) & lessThanOrEqualTo(120) & multipleOf(1); readonly tags: minItems(1) & maxItems(5) }\n└─ ["name"]\n   └─ Only alphabetic characters',
      })
    }
  })
  it('FAIL age negative', () => {
    const valid = decode(ErrorMessagesUser, { name: 'tarou', age: -1, tags: ['a'] })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: a string matching the pattern ^[a-zA-Z]+$ & minLength(3) & maxLength(20); readonly age: int & greaterThanOrEqualTo(0) & lessThanOrEqualTo(120) & multipleOf(1); readonly tags: minItems(1) & maxItems(5) }\n└─ ["age"]\n   └─ Age must be positive',
      })
    }
  })
  it('FAIL missing tags', () => {
    const valid = decode(ErrorMessagesUser, { name: 'tarou', age: 20 })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: a string matching the pattern ^[a-zA-Z]+$ & minLength(3) & maxLength(20); readonly age: int & greaterThanOrEqualTo(0) & lessThanOrEqualTo(120) & multipleOf(1); readonly tags: minItems(1) & maxItems(5) }\n└─ ["tags"]\n   └─ is missing',
      })
    }
  })
})

describe('allof runtime', () => {
  it('valid', () => {
    const valid = decode(Combined, { name: 'a', age: 1 })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL missing age', () => {
    const valid = decode(Combined, { name: 'a' })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message: '{ readonly name: string; readonly age: number }\n└─ ["age"]\n   └─ is missing',
      })
    }
  })
  it('FAIL wrong type', () => {
    const valid = decode(Combined, { name: 'a', age: 'x' })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: string; readonly age: number }\n└─ ["age"]\n   └─ Expected number, actual "x"',
      })
    }
  })
})

describe('allof-message runtime', () => {
  it('valid', () => {
    const valid = decode(Merged, { name: 'taro', age: 5 })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL', () => {
    const valid = decode(Merged, { name: 'ab', age: -1 })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '(unknown <-> { readonly name: minLength(3); readonly age: int & greaterThanOrEqualTo(0) })\n└─ Transformation process failure\n   └─ merged validation failed',
      })
    }
  })
})

describe('anyof runtime', () => {
  it('valid string', () => {
    const valid = decode(StringOrNumber, 'hi')
    expect(Either.isRight(valid)).toBe(true)
  })
  it('valid number', () => {
    const valid = decode(StringOrNumber, 5)
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL', () => {
    const valid = decode(StringOrNumber, true)
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message: 'string | number\n├─ Expected string, actual true\n└─ Expected number, actual true',
      })
    }
  })
})

describe('oneof runtime', () => {
  it('valid circle', () => {
    const valid = decode(Shape, { kind: 'circle', radius: 1 })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('valid rectangle', () => {
    const valid = decode(Shape, { kind: 'rectangle', width: 1, height: 2 })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL unknown kind', () => {
    const valid = decode(Shape, { kind: 'triangle' })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly kind: "circle"; readonly radius: number } | { readonly kind: "rectangle"; readonly width: number; readonly height: number }\n└─ { readonly kind: "circle" | "rectangle" }\n   └─ ["kind"]\n      └─ Expected "circle" | "rectangle", actual "triangle"',
      })
    }
  })
})

describe('not runtime', () => {
  it('valid number', () => {
    const valid = decode(NotString, 1)
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL string', () => {
    const valid = decode(NotString, 'x')
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message: 'Must not be a string',
      })
    }
  })
})

describe('additional-properties runtime', () => {
  it('valid', () => {
    const valid = decode(AdditionalPropsConfig, { a: 'b' })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL wrong value type', () => {
    const valid = decode(AdditionalPropsConfig, { a: 1 })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly [x: string]: string }\n└─ ["a"]\n   └─ Expected string, actual 1',
      })
    }
  })
})

describe('readonly runtime', () => {
  it('valid', () => {
    const valid = decode(ReadonlyConfig, { name: 'a', tags: ['t'] })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL missing tags', () => {
    const valid = decode(ReadonlyConfig, { name: 'a' })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: string; readonly tags: ReadonlyArray<string>; readonly count?: int | undefined }\n└─ ["tags"]\n   └─ is missing',
      })
    }
  })
})

describe('$defs runtime', () => {
  it('valid w/o address', () => {
    const valid = decode(DefsUser, { name: 'a' })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('valid w/ address', () => {
    const valid = decode(DefsUser, { name: 'a', address: { street: 's', city: 'c' } })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL missing city', () => {
    const valid = decode(DefsUser, { name: 'a', address: { street: 's' } })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: string; readonly address?: <suspended schema> | undefined }\n└─ ["address"]\n   └─ <suspended schema> | undefined\n      ├─ { readonly street: string; readonly city: string }\n      │  └─ ["city"]\n      │     └─ is missing\n      └─ Expected undefined, actual {"street":"s"}',
      })
    }
  })
})

describe('definitions runtime', () => {
  it('valid empty', () => {
    const valid = decode(DefinitionsA, {})
    expect(Either.isRight(valid)).toBe(true)
  })
  it('valid nested', () => {
    const valid = decode(DefinitionsA, { b: { c: 'x' } })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL wrong leaf', () => {
    const valid = decode(DefinitionsA, { b: { c: 1 } })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly b?: <suspended schema> | undefined }\n└─ ["b"]\n   └─ <suspended schema> | undefined\n      ├─ { readonly c?: string | undefined }\n      │  └─ ["c"]\n      │     └─ string | undefined\n      │        ├─ Expected string, actual 1\n      │        └─ Expected undefined, actual 1\n      └─ Expected undefined, actual {"c":1}',
      })
    }
  })
})

describe('nested runtime', () => {
  it('valid', () => {
    const valid = decode(NestedOrder, {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [{ name: 'x', price: 1, quantity: 1 }],
      status: 'pending',
    })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL bad status', () => {
    const valid = decode(NestedOrder, {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [],
      status: 'x',
    })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly id: int; readonly customer: { readonly name: minLength(1); readonly email: a string matching the pattern ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$ }; readonly items: ReadonlyArray<{ readonly name: string; readonly price: greaterThanOrEqualTo(0); readonly quantity: int & greaterThanOrEqualTo(1) }>; readonly status: "pending" | "confirmed" | "shipped" | "delivered" }\n└─ ["status"]\n   └─ "pending" | "confirmed" | "shipped" | "delivered"\n      ├─ Expected "pending", actual "x"\n      ├─ Expected "confirmed", actual "x"\n      ├─ Expected "shipped", actual "x"\n      └─ Expected "delivered", actual "x"',
      })
    }
  })
})

describe('simple runtime', () => {
  it('valid', () => {
    const valid = decode(SimpleSchema, { name: 'a' })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL missing name', () => {
    const valid = decode(SimpleSchema, { age: 1 })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: string; readonly age?: number | undefined }\n└─ ["name"]\n   └─ is missing',
      })
    }
  })
})

describe('brand runtime', () => {
  it('valid', () => {
    const valid = decode(BrandedTypes, {
      userId: '00000000-0000-0000-0000-000000000000',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['t'],
      name: 'x',
    })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL bad uuid', () => {
    const valid = decode(BrandedTypes, {
      userId: 'not-uuid',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['t'],
      name: 'x',
    })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly userId: a Universally Unique Identifier & Brand<"UserId">; readonly email: a string matching the pattern ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$ & Brand<"Email">; readonly price: greaterThanOrEqualTo(0) & Brand<"Price">; readonly quantity: int & greaterThanOrEqualTo(0) & Brand<"Quantity">; readonly tags: minItems(1) & maxItems(10) & Brand<"Tags">; readonly name: string }\n└─ ["userId"]\n   └─ a Universally Unique Identifier & Brand<"UserId">\n      └─ Predicate refinement failure\n         └─ Expected a Universally Unique Identifier, actual "not-uuid"',
      })
    }
  })
})

describe('circular runtime', () => {
  it('valid empty', () => {
    const valid = decode(CircularA, {})
    expect(Either.isRight(valid)).toBe(true)
  })
  it('valid nested', () => {
    const valid = decode(CircularA, { b: { a: { b: undefined } } })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL wrong type', () => {
    const valid = decode(CircularA, { b: 1 })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly b?: <suspended schema> | undefined }\n└─ ["b"]\n   └─ <suspended schema> | undefined\n      ├─ Expected { readonly a?: <suspended schema> | undefined }, actual 1\n      └─ Expected undefined, actual 1',
      })
    }
  })
})

describe('self-reference runtime', () => {
  it('valid', () => {
    const valid = decode(SelfRefSchema, { children: [{ children: [] }] })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL wrong children', () => {
    const valid = decode(SelfRefSchema, { children: 'x' })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly children?: ReadonlyArray<<suspended schema>> | undefined }\n└─ ["children"]\n   └─ ReadonlyArray<<suspended schema>> | undefined\n      ├─ Expected ReadonlyArray<<suspended schema>>, actual "x"\n      └─ Expected undefined, actual "x"',
      })
    }
  })
})

describe('meta runtime', () => {
  it('valid', () => {
    const valid = decode(MetaUser, { id: 1, email: 'a@b.com' })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL bad email', () => {
    const valid = decode(MetaUser, { id: 1, email: 'x' })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          'A user account\n└─ ["email"]\n   └─ email address\n      └─ Predicate refinement failure\n         └─ Expected email address, actual "x"',
      })
    }
  })
})

describe('title runtime', () => {
  it('valid', () => {
    const valid = decode(TitleUser, { name: 'a', email: 'a@b.com' })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL bad email', () => {
    const valid = decode(TitleUser, { name: 'a', email: 'x' })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: string; readonly email: a string matching the pattern ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$ }\n└─ ["email"]\n   └─ a string matching the pattern ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\n      └─ Predicate refinement failure\n         └─ Expected a string matching the pattern ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$, actual "x"',
      })
    }
  })
})

describe('split-nested runtime', () => {
  it('valid', () => {
    const valid = decode(SplitNestedOrder, {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL bad id', () => {
    const valid = decode(SplitNestedOrder, {
      id: 'x',
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly id: int; readonly customer: { readonly name: string; readonly email: a string matching the pattern ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$; readonly address?: { readonly street: string; readonly city: string } | undefined }; readonly status: "pending" | "shipped" | "delivered" }\n└─ ["id"]\n   └─ int\n      └─ From side refinement failure\n         └─ Expected number, actual "x"',
      })
    }
  })
})

describe('split-refs runtime', () => {
  it('valid w/o address', () => {
    const valid = decode(SplitRefsUser, { name: 'a' })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('valid w/ address', () => {
    const valid = decode(SplitRefsUser, {
      name: 'a',
      address: { street: 's', city: 'c' },
    })
    expect(Either.isRight(valid)).toBe(true)
  })
  it('FAIL missing name', () => {
    const valid = decode(SplitRefsUser, {})
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: string; readonly address?: { readonly street: string; readonly city: string; readonly zip?: string | undefined } | undefined }\n└─ ["name"]\n   └─ is missing',
      })
    }
  })
  it('FAIL bad address', () => {
    const valid = decode(SplitRefsUser, { name: 'a', address: { street: 's' } })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly name: string; readonly address?: { readonly street: string; readonly city: string; readonly zip?: string | undefined } | undefined }\n└─ ["address"]\n   └─ { readonly street: string; readonly city: string; readonly zip?: string | undefined } | undefined\n      ├─ { readonly street: string; readonly city: string; readonly zip?: string | undefined }\n      │  └─ ["city"]\n      │     └─ is missing\n      └─ Expected undefined, actual {"street":"s"}',
      })
    }
  })
})

describe('discriminated-union runtime', () => {
  it('PASS click event', () => {
    const valid = decode(DiscriminatedEvent, { type: 'click', x: 1, y: 2 })
    expect(Either.isRight(valid)).toBe(true)
  })

  it('PASS keypress event', () => {
    const valid = decode(DiscriminatedEvent, { type: 'keypress', key: 'Enter' })
    expect(Either.isRight(valid)).toBe(true)
  })

  it('FAIL unknown discriminator', () => {
    const valid = decode(DiscriminatedEvent, { type: 'unknown' })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly type: "click"; readonly x: int; readonly y: int } | { readonly type: "keypress"; readonly key: string }\n└─ { readonly type: "click" | "keypress" }\n   └─ ["type"]\n      └─ Expected "click" | "keypress", actual "unknown"',
      })
    }
  })
})

describe('length-message runtime', () => {
  it('PASS exactly 6 chars', () => {
    const valid = decode(LengthMessageCode, { code: 'abcdef' })
    expect(Either.isRight(valid)).toBe(true)
  })

  it('FAIL empty code returns x-length-message', () => {
    const valid = decode(LengthMessageCode, { code: '' })
    expect(Either.isLeft(valid)).toBe(true)
    if (Either.isLeft(valid)) {
      expect({ _tag: valid.left._tag, message: valid.left.message }).toStrictEqual({
        _tag: 'ParseError',
        message:
          '{ readonly code: length(6) }\n└─ ["code"]\n   └─ Code must be exactly 6 characters',
      })
    }
  })
})
