import { type } from 'arktype'
import { describe, expect, it } from 'vite-plus/test'
import { User as DefsUser } from '../$defs/output.ts'
import { Config as AdditionalConfig } from '../additional-properties/output.ts'
import { Combined as AllofCombined } from '../allof/output.ts'
import { Merged as AllofMessageMerged } from '../allof-message/output.ts'
import { StringOrNumber as AnyofStringOrNumber } from '../anyof/output.ts'
import { BrandedTypes } from '../brand/output.ts'
import { A as CircularA } from '../circular/output.ts'
import { IntList } from '../contains-min-max/output.ts'
import { ImageBag } from '../content-encoding-base64/output.ts'
import { StyleBag } from '../content-schema-json/output.ts'
import { User as DeepUser } from '../deep-nested-validation/output.ts'
import { A as DefinitionsA } from '../definitions/output.ts'
import { DependentRequired } from '../dependent-schemas/output.ts'
import { Animal } from '../discriminated-union/output.ts'
import { Color } from '../enum-japanese/output.ts'
import { User as ErrUser } from '../error-messages/output.ts'
import { Address } from '../if-then-else/output.ts'
import { User as MetaUser } from '../meta/output.ts'
import { Order as NestedOrder } from '../nested/output.ts'
import { NotString } from '../not/output.ts'
import { MaybeString } from '../nullable-default/output.ts'
import { Shape as OneofShape } from '../oneof/output.ts'
import { PatternBag } from '../pattern-properties/output.ts'
import { Tuple } from '../prefix-items-unevaluated/output.ts'
import { Config as ReadonlyConfig } from '../readonly/output.ts'
import { Schema as SimpleSchema } from '../simple/output.ts'
import { Order as SplitNestedOrder } from '../split-nested/output.ts'
import { User as SplitRefsUser } from '../split-refs/output.ts'
import { User as TitleUser } from '../title/output.ts'
import { Account } from '../write-only-password/output.ts'

const issues = (result: unknown) => {
  if (!(result instanceof type.errors)) {
    throw new Error('expected ArkErrors')
  }
  return [...result].map((e) => ({ path: [...e.path], code: e.code, message: e.message }))
}

describe('simple', () => {
  it('valid', () => {
    const valid = SimpleSchema({ name: 'taro' })
    expect(valid).toStrictEqual({ name: 'taro' })
  })

  it('invalid: missing required', () => {
    const valid = SimpleSchema({ age: 1 })
    expect(issues(valid)).toStrictEqual([
      { path: ['name'], code: 'required', message: 'name must be a string (was missing)' },
    ])
  })

  it('invalid: wrong type', () => {
    const valid = SimpleSchema({ name: 1 })
    expect(issues(valid)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
    ])
  })
})

describe('title', () => {
  it('valid', () => {
    const valid = TitleUser({ name: 'taro', email: 'a@b.com' })
    expect(valid).toStrictEqual({ name: 'taro', email: 'a@b.com' })
  })

  it('invalid: bad email', () => {
    const valid = TitleUser({ name: 'a', email: 'not-email' })
    expect(issues(valid)).toStrictEqual([
      {
        path: ['email'],
        code: 'pattern',
        message: 'email must be an email address (was "not-email")',
      },
    ])
  })
})

describe('error-messages', () => {
  it('valid', () => {
    const valid = ErrUser({ name: 'taro', age: 30, tags: ['a'] })
    expect(valid).toStrictEqual({ name: 'taro', age: 30, tags: ['a'] })
  })

  it('invalid: empty/negative', () => {
    const valid = ErrUser({ name: '', age: -1, tags: [] })
    expect(issues(valid)).toStrictEqual([
      { path: ['age'], code: 'predicate', message: 'age must be Age must be positive (was -1)' },
      {
        path: ['name'],
        code: 'predicate',
        message: 'name must be Only alphabetic characters (was "")',
      },
      { path: ['tags'], code: 'predicate', message: 'tags must be Need at least one tag (was [])' },
    ])
  })

  it('invalid: out-of-bounds', () => {
    const valid = ErrUser({ name: '123', age: 200, tags: ['a', 'b', 'c', 'd', 'e', 'f'] })
    expect(issues(valid)).toStrictEqual([
      { path: ['age'], code: 'predicate', message: 'age must be Age too large (was 200)' },
      {
        path: ['name'],
        code: 'predicate',
        message: 'name must be Only alphabetic characters (was "123")',
      },
      {
        path: ['tags'],
        code: 'predicate',
        message: 'tags must be Too many tags (was ["a","b","c","d","e","f"])',
      },
    ])
  })
})

describe('allof', () => {
  it('valid', () => {
    const valid = AllofCombined({ name: 'x', age: 1 })
    expect(valid).toStrictEqual({ name: 'x', age: 1 })
  })

  it('invalid: missing one branch', () => {
    const valid = AllofCombined({ name: 'x' })
    expect(issues(valid)).toStrictEqual([
      { path: ['age'], code: 'required', message: 'age must be a number (was missing)' },
    ])
  })
})

describe('allof-message', () => {
  it('valid', () => {
    const valid = AllofMessageMerged({ name: 'taro', age: 1 })
    expect(valid).toStrictEqual({ name: 'taro', age: 1 })
  })

  it('invalid: aggregated x-allOf-message', () => {
    const valid = AllofMessageMerged({ name: 'ab', age: -1 })
    expect(issues(valid)).toStrictEqual([
      { path: ['age'], code: 'predicate', message: 'merged validation failed' },
      { path: ['name'], code: 'predicate', message: 'merged validation failed' },
    ])
  })
})

describe('anyof', () => {
  it('valid: string', () => {
    const valid = AnyofStringOrNumber('hello')
    expect(valid).toBe('hello')
  })

  it('valid: number', () => {
    const valid = AnyofStringOrNumber(42)
    expect(valid).toBe(42)
  })

  it('invalid: boolean', () => {
    const valid = AnyofStringOrNumber(true)
    expect(issues(valid)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be a number or a string (was boolean)',
      },
    ])
  })
})

describe('oneof', () => {
  it('valid: circle', () => {
    const valid = OneofShape({ kind: 'circle', radius: 5 })
    expect(valid).toStrictEqual({ kind: 'circle', radius: 5 })
  })

  it('valid: rectangle', () => {
    const valid = OneofShape({ kind: 'rectangle', width: 1, height: 2 })
    expect(valid).toStrictEqual({ kind: 'rectangle', width: 1, height: 2 })
  })

  it('invalid: unknown discriminator', () => {
    const valid = OneofShape({ kind: 'triangle' })
    expect(issues(valid)).toStrictEqual([
      {
        path: ['kind'],
        code: 'predicate',
        message: 'kind must be "rectangle" or "circle" (was "triangle")',
      },
    ])
  })

  it('invalid: missing branch field', () => {
    const valid = OneofShape({ kind: 'circle' })
    expect(issues(valid)).toStrictEqual([
      { path: ['radius'], code: 'required', message: 'radius must be a number (was missing)' },
    ])
  })
})

describe('additional-properties', () => {
  it('valid', () => {
    const valid = AdditionalConfig({ a: 'hello', b: 'world' })
    expect(valid).toStrictEqual({ a: 'hello', b: 'world' })
  })

  it('invalid: non-string value', () => {
    const valid = AdditionalConfig({ a: 1 })
    expect(issues(valid)).toStrictEqual([
      { path: ['a'], code: 'domain', message: 'a must be a string (was a number)' },
    ])
  })
})

describe('nested', () => {
  it('valid', () => {
    const valid = NestedOrder({
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [{ name: 'x', price: 1, quantity: 1 }],
      status: 'pending',
    })
    expect(valid).toStrictEqual({
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [{ name: 'x', price: 1, quantity: 1 }],
      status: 'pending',
    })
  })

  it('invalid: nested errors', () => {
    const valid = NestedOrder({
      id: 1.5,
      customer: { name: '', email: 'x' },
      items: [],
      status: 'unknown',
    })
    expect(issues(valid)).toStrictEqual([
      {
        path: ['customer', 'email'],
        code: 'pattern',
        message: 'customer.email must be an email address (was "x")',
      },
      {
        path: ['customer', 'name'],
        code: 'minLength',
        message: 'customer.name must be non-empty',
      },
      { path: ['id'], code: 'divisor', message: 'id must be an integer (was 1.5)' },
      {
        path: ['status'],
        code: 'predicate',
        message:
          'status must be "confirmed", "delivered", "pending" or "shipped" (was "unknown")',
      },
    ])
  })
})

describe('brand', () => {
  it('valid', () => {
    const valid = BrandedTypes({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['x'],
      name: 'foo',
    })
    expect(valid).toStrictEqual({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['x'],
      name: 'foo',
    })
  })

  it('invalid: multiple branded field errors', () => {
    const valid = BrandedTypes({
      userId: 'not-uuid',
      email: 'bad',
      price: -1,
      quantity: -1,
      tags: [],
      name: 1,
    })
    expect(issues(valid)).toStrictEqual([
      { path: ['email'], code: 'pattern', message: 'email must be an email address (was "bad")' },
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
      { path: ['price'], code: 'min', message: 'price must be non-negative (was -1)' },
      { path: ['quantity'], code: 'min', message: 'quantity must be non-negative (was -1)' },
      { path: ['tags'], code: 'minLength', message: 'tags must be non-empty' },
      { path: ['userId'], code: 'pattern', message: 'userId must be a UUID (was "not-uuid")' },
    ])
  })
})

describe('$defs', () => {
  it('valid', () => {
    const valid = DefsUser({ name: 'taro', address: { street: 's', city: 'c' } })
    expect(valid).toStrictEqual({ name: 'taro', address: { street: 's', city: 'c' } })
  })

  it('invalid: nested ref errors', () => {
    const valid = DefsUser({ name: 1, address: { street: 1 } })
    expect(issues(valid)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
      {
        path: ['address', 'city'],
        code: 'required',
        message: 'address.city must be a string (was missing)',
      },
      {
        path: ['address', 'street'],
        code: 'domain',
        message: 'address.street must be a string (was a number)',
      },
    ])
  })
})

describe('circular', () => {
  it('valid', () => {
    const valid = CircularA({ b: { a: {} } })
    expect(valid).toStrictEqual({ b: { a: {} } })
  })

  it('invalid: deep wrong type', () => {
    const valid = CircularA({ b: { a: { b: 'wrong' } } })
    expect(issues(valid)).toStrictEqual([
      {
        path: ['b', 'a', 'b'],
        code: 'domain',
        message: 'b.a.b must be an object (was a string)',
      },
    ])
  })
})

describe('definitions', () => {
  it('valid', () => {
    const valid = DefinitionsA({ b: { c: 'hello' } })
    expect(valid).toStrictEqual({ b: { c: 'hello' } })
  })

  it('invalid: nested ref chain error', () => {
    const valid = DefinitionsA({ b: { c: 1 } })
    expect(issues(valid)).toStrictEqual([
      { path: ['b', 'c'], code: 'domain', message: 'b.c must be a string (was a number)' },
    ])
  })
})

describe('not', () => {
  it('valid: non-string', () => {
    const valid = NotString(42)
    expect(valid).toBe(42)
  })

  it('invalid: a string', () => {
    const valid = NotString('hello')
    expect(issues(valid)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be Must not be a string (was "hello")',
      },
    ])
  })
})

describe('readonly', () => {
  it('valid', () => {
    const valid = ReadonlyConfig({ name: 'foo', tags: ['x'] })
    expect(valid).toStrictEqual({ name: 'foo', tags: ['x'] })
  })

  it('invalid: wrong types', () => {
    const valid = ReadonlyConfig({ name: 1, tags: [1] })
    expect(issues(valid)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
      {
        path: ['tags', 0],
        code: 'domain',
        message: 'tags[0] must be a string (was a number)',
      },
    ])
  })
})

describe('split-refs', () => {
  it('valid', () => {
    const valid = SplitRefsUser({ name: 'taro', address: { street: 's', city: 'c' } })
    expect(valid).toStrictEqual({ name: 'taro', address: { street: 's', city: 'c' } })
  })

  it('invalid: nested ref errors', () => {
    const valid = SplitRefsUser({ name: 1, address: { street: 1, city: 1 } })
    expect(issues(valid)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
      {
        path: ['address', 'city'],
        code: 'domain',
        message: 'address.city must be a string (was a number)',
      },
      {
        path: ['address', 'street'],
        code: 'domain',
        message: 'address.street must be a string (was a number)',
      },
    ])
  })
})

describe('split-nested', () => {
  it('valid', () => {
    const valid = SplitNestedOrder({
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
    expect(valid).toStrictEqual({
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    })
  })

  it('invalid: nested errors with enum', () => {
    const valid = SplitNestedOrder({
      id: 1.5,
      customer: { name: 1, email: 'x' },
      status: 'bad',
    })
    expect(issues(valid)).toStrictEqual([
      {
        path: ['customer', 'email'],
        code: 'pattern',
        message: 'customer.email must be an email address (was "x")',
      },
      {
        path: ['customer', 'name'],
        code: 'domain',
        message: 'customer.name must be a string (was a number)',
      },
      { path: ['id'], code: 'divisor', message: 'id must be an integer (was 1.5)' },
      {
        path: ['status'],
        code: 'predicate',
        message: 'status must be "delivered", "pending" or "shipped" (was "bad")',
      },
    ])
  })
})

describe('meta', () => {
  it('valid', () => {
    const valid = MetaUser({ id: 1, email: 'a@b.com' })
    expect(valid).toStrictEqual({ id: 1, email: 'a@b.com' })
  })

  it('invalid: description-overridden messages', () => {
    const valid = MetaUser({ id: 1.5, email: 'bad' })
    expect(issues(valid)).toStrictEqual([
      { path: ['email'], code: 'pattern', message: 'email must be email address (was "bad")' },
      { path: ['id'], code: 'divisor', message: 'id must be unique id (was 1.5)' },
    ])
  })
})

describe('discriminated-union', () => {
  it('valid: cat', () => {
    const valid = Animal({ kind: 'cat', meow: true })
    expect(valid).toStrictEqual({ kind: 'cat', meow: true })
  })

  it('valid: dog', () => {
    const valid = Animal({ kind: 'dog', bark: false })
    expect(valid).toStrictEqual({ kind: 'dog', bark: false })
  })

  it('invalid: unknown discriminator', () => {
    const valid = Animal({ kind: 'fish', meow: true })
    expect(issues(valid)).toStrictEqual([
      {
        path: ['kind'],
        code: 'predicate',
        message: 'kind must be "dog" or "cat" (was "fish")',
      },
    ])
  })

  it('invalid: missing branch field', () => {
    const valid = Animal({ kind: 'cat' })
    expect(issues(valid)).toStrictEqual([
      { path: ['meow'], code: 'required', message: 'meow must be boolean (was missing)' },
    ])
  })
})

describe('prefix-items-unevaluated', () => {
  it('valid', () => {
    const valid = Tuple(['hello', true])
    expect(valid).toStrictEqual(['hello', true])
  })

  it('invalid: too short', () => {
    const valid = Tuple(['x'])
    expect(issues(valid)).toStrictEqual([
      { path: [], code: 'exactLength', message: 'must be exactly length 2 (was 1)' },
    ])
  })

  it('invalid: wrong element types', () => {
    const valid = Tuple([1, 'x'])
    expect(issues(valid)).toStrictEqual([
      { path: [0], code: 'domain', message: 'value at [0] must be a string (was a number)' },
      { path: [1], code: 'union', message: 'value at [1] must be boolean (was "x")' },
    ])
  })
})

describe('contains-min-max', () => {
  it('valid: within range', () => {
    const valid = IntList([1, 2, 3])
    expect(valid).toStrictEqual([1, 2, 3])
  })

  it('invalid: too few matches', () => {
    const valid = IntList([1])
    expect(issues(valid)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be must contain at least 2 matching items (was [1])',
      },
    ])
  })

  it('invalid: too many matches', () => {
    const valid = IntList([1, 2, 3, 4])
    expect(issues(valid)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be must contain at most 3 matching items (was [1,2,3,4])',
      },
    ])
  })

  it('invalid: not array', () => {
    const valid = IntList('not array' as never)
    expect(issues(valid)).toStrictEqual([
      { path: [], code: 'proto', message: 'must be an array (was string)' },
    ])
  })
})

// pattern-properties: arktype generator emits `type({})` when only
// `patternProperties` is present (no `properties` / `additionalProperties: schema`).
// JSON Schema 2020-12 patternProperties without sibling `properties` is therefore
// not enforced at runtime — covered by the same gap in the Zod generator.
describe.skip('pattern-properties (skip: not enforced at runtime)', () => {
  it('skipped', () => {
    expect(PatternBag).toBeDefined()
  })
})

// content-encoding-base64: JSON Schema `contentEncoding` / `contentMediaType` are
// metadata-only annotations. ArkType generator emits a plain `string` and does not
// validate base64 payloads. Test only covers the structural type fallback.
describe('content-encoding-base64', () => {
  it('valid: any string passes', () => {
    const valid = ImageBag({ image: 'iVBORw0KGgo=' })
    expect(valid).toStrictEqual({ image: 'iVBORw0KGgo=' })
  })

  it('invalid: non-string image', () => {
    const valid = ImageBag({ image: 1 } as never)
    expect(issues(valid)).toStrictEqual([
      { path: ['image'], code: 'domain', message: 'image must be a string (was a number)' },
    ])
  })
})

// content-schema-json: same as above — `contentSchema` is annotation-only and
// the inner JSON shape is not validated by the generator.
describe('content-schema-json', () => {
  it('valid: any string passes', () => {
    const valid = StyleBag({ style: 'eyJuYW1lIjoiZm9vIn0=' })
    expect(valid).toStrictEqual({ style: 'eyJuYW1lIjoiZm9vIn0=' })
  })

  it('invalid: non-string style', () => {
    const valid = StyleBag({ style: 1 } as never)
    expect(issues(valid)).toStrictEqual([
      { path: ['style'], code: 'domain', message: 'style must be a string (was a number)' },
    ])
  })
})

describe('dependent-schemas', () => {
  it('valid: kind + feature both present', () => {
    const valid = DependentRequired({ kind: 'a', feature: 'b' })
    expect(valid).toStrictEqual({ kind: 'a', feature: 'b' })
  })

  it('valid: neither present', () => {
    const valid = DependentRequired({})
    expect(valid).toStrictEqual({})
  })

  it('invalid: kind without feature', () => {
    const valid = DependentRequired({ kind: 'a' })
    expect(issues(valid)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be valid according to an anonymous predicate (was {"kind":"a"})',
      },
    ])
  })
})

// if-then-else: arktype generator does not emit conditional branches for
// JSON Schema `if` / `then` / `else`. Only the base `properties` schema is enforced.
describe('if-then-else (skip: conditionals not generated)', () => {
  it('valid: country only', () => {
    const valid = Address({ country: 'JP' })
    expect(valid).toStrictEqual({ country: 'JP' })
  })

  it.skip('invalid: JP requires postalCode (not enforced)', () => {
    expect(true).toBe(true)
  })
})

describe('nullable-default', () => {
  it('valid: string', () => {
    const valid = MaybeString('hello')
    expect(valid).toBe('hello')
  })

  it('valid: null', () => {
    const valid = MaybeString(null)
    expect(valid).toBe(null)
  })

  it('invalid: number', () => {
    const valid = MaybeString(123 as never)
    expect(issues(valid)).toStrictEqual([
      { path: [], code: 'predicate', message: 'must be a string or null (was a number)' },
    ])
  })
})

describe('enum-japanese', () => {
  it('valid', () => {
    const valid = Color('赤')
    expect(valid).toBe('赤')
  })

  it('invalid: not in enum', () => {
    const valid = Color('黒' as never)
    expect(issues(valid)).toStrictEqual([
      {
        path: [],
        code: 'predicate',
        message: 'must be "緑", "赤" or "青" (was "黒")',
      },
    ])
  })
})

describe('deep-nested-validation', () => {
  it('valid', () => {
    const valid = DeepUser({
      name: 'taro',
      email: 'a@b.com',
      address: { city: 'Tokyo', zip: '100-0001' },
    })
    expect(valid).toStrictEqual({
      name: 'taro',
      email: 'a@b.com',
      address: { city: 'Tokyo', zip: '100-0001' },
    })
  })

  it('invalid: cascade across levels', () => {
    const valid = DeepUser({ name: '', email: 'bad', address: { zip: 'x' } })
    expect(issues(valid)).toStrictEqual([
      { path: ['email'], code: 'pattern', message: 'email must be an email address (was "bad")' },
      { path: ['name'], code: 'minLength', message: 'name must be non-empty' },
      {
        path: ['address', 'zip'],
        code: 'pattern',
        message: 'address.zip must be matched by ^\\d{3}-\\d{4}$ (was "x")',
      },
    ])
  })
})

// write-only-password: JSON Schema `writeOnly` is metadata-only. The generator
// does not attach `.configure({ writeOnly: true })` (would require ArkEnv["meta"]
// augmentation in consumer projects), so password is just a plain `string`.
describe('write-only-password', () => {
  it('valid', () => {
    const valid = Account({ name: 'taro', password: 'secret' })
    expect(valid).toStrictEqual({ name: 'taro', password: 'secret' })
  })

  it('invalid: wrong types', () => {
    const valid = Account({ name: 1 } as never)
    expect(issues(valid)).toStrictEqual([
      { path: ['name'], code: 'domain', message: 'name must be a string (was a number)' },
    ])
  })
})
