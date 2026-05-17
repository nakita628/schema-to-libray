import { describe, expect, it } from 'vite-plus/test'
import { User as DefsUser } from '../$defs/output.ts'
import { Config as AdditionalPropertiesConfig } from '../additional-properties/output.ts'
import { Combined } from '../allof/output.ts'
import { Merged } from '../allof-message/output.ts'
import { StringOrNumber } from '../anyof/output.ts'
import { BrandedTypes } from '../brand/output.ts'
import { A as CircularA } from '../circular/output.ts'
import { A as DefinitionsA } from '../definitions/output.ts'
import { Animal as DiscriminatedAnimal } from '../discriminated-union/output.ts'
import { User as ErrorMessagesUser } from '../error-messages/output.ts'
import { Code as LengthMessageCode } from '../length-message/output.ts'
import { User as MetaUser } from '../meta/output.ts'
import { Order as NestedOrder } from '../nested/output.ts'
import { NotString } from '../not/output.ts'
import { Shape } from '../oneof/output.ts'
import { Config as ReadonlyConfig } from '../readonly/output.ts'
import { Schema as SelfRefSchema } from '../self-reference/output.ts'
import { Schema as SimpleSchema } from '../simple/output.ts'
import { Order as SplitNestedOrder } from '../split-nested/output.ts'
import { User as SplitRefsUser } from '../split-refs/output.ts'
import { User as TitleUser } from '../title/output.ts'

describe('zod fixtures: error-messages runtime', () => {
  it('valid input passes', () => {
    expect(
      ErrorMessagesUser.safeParse({ name: 'taro', age: 25, tags: ['x'] }).success,
    ).toBe(true)
  })

  it('short name returns x-minimum-message', () => {
    const valid = ErrorMessagesUser.safeParse({ name: 'a', age: 25, tags: ['x'] })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'too_small',
          minimum: 3,
          inclusive: true,
          path: ['name'],
          message: 'Name too short',
        },
      ])
    }
  })

  it('name longer than maxLength returns x-maximum-message', () => {
    const valid = ErrorMessagesUser.safeParse({
      name: 'a'.repeat(21),
      age: 25,
      tags: ['x'],
    })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'too_big',
          maximum: 20,
          inclusive: true,
          path: ['name'],
          message: 'Name too long',
        },
      ])
    }
  })

  it('name failing pattern returns x-pattern-message', () => {
    const valid = ErrorMessagesUser.safeParse({ name: 'abc123', age: 25, tags: ['x'] })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'regex',
          pattern: '/^[a-zA-Z]+$/',
          path: ['name'],
          message: 'Only alphabetic characters',
        },
      ])
    }
  })

  it('negative age returns x-minimum-message', () => {
    const valid = ErrorMessagesUser.safeParse({ name: 'taro', age: -1, tags: ['x'] })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          origin: 'number',
          code: 'too_small',
          minimum: 0,
          inclusive: true,
          path: ['age'],
          message: 'Age must be positive',
        },
      ])
    }
  })

  it('empty tags returns x-minimum-message', () => {
    const valid = ErrorMessagesUser.safeParse({ name: 'taro', age: 25, tags: [] })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          origin: 'array',
          code: 'too_small',
          minimum: 1,
          inclusive: true,
          path: ['tags'],
          message: 'Need at least one tag',
        },
      ])
    }
  })
})

describe('zod fixtures: allof runtime', () => {
  it('valid input passes', () => {
    expect(Combined.safeParse({ name: 'taro', age: 30 }).success).toBe(true)
  })

  it('missing age fails with invalid_type', () => {
    const valid = Combined.safeParse({ name: 'taro' })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'number',
          code: 'invalid_type',
          path: ['age'],
          message: 'Invalid input: expected number, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: allof-message runtime', () => {
  it('valid input passes', () => {
    expect(Merged.safeParse({ name: 'taro', age: 25 }).success).toBe(true)
  })

  it('age below minimum rewrites message via x-allOf-message', () => {
    const valid = Merged.safeParse({ name: 'taro', age: -1 })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          origin: 'number',
          code: 'too_small',
          minimum: 0,
          inclusive: true,
          path: ['age'],
          message: 'merged validation failed',
        },
      ])
    }
  })
})

describe('zod fixtures: anyof runtime', () => {
  it('string passes', () => {
    expect(StringOrNumber.safeParse('hello').success).toBe(true)
  })

  it('number passes', () => {
    expect(StringOrNumber.safeParse(42).success).toBe(true)
  })

  it('boolean fails with x-anyOf-message', () => {
    const valid = StringOrNumber.safeParse(true)
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          code: 'invalid_union',
          errors: [
            [
              {
                expected: 'string',
                code: 'invalid_type',
                path: [],
                message: 'Invalid input: expected string, received boolean',
              },
            ],
            [
              {
                expected: 'number',
                code: 'invalid_type',
                path: [],
                message: 'Invalid input: expected number, received boolean',
              },
            ],
          ],
          path: [],
          message: 'Must be string or number',
        },
      ])
    }
  })
})

describe('zod fixtures: oneof runtime', () => {
  it('circle passes', () => {
    expect(Shape.safeParse({ kind: 'circle', radius: 1 }).success).toBe(true)
  })

  it('rectangle passes', () => {
    expect(Shape.safeParse({ kind: 'rectangle', width: 1, height: 2 }).success).toBe(true)
  })

  it('unknown discriminator returns x-oneOf-message', () => {
    const valid = Shape.safeParse({ kind: 'triangle', side: 1 })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          code: 'invalid_union',
          errors: [],
          note: 'No matching discriminator',
          discriminator: 'kind',
          path: ['kind'],
          message: 'Must be a valid shape',
        },
      ])
    }
  })
})

describe('zod fixtures: not runtime', () => {
  it('number passes (not string)', () => {
    expect(NotString.safeParse(42).success).toBe(true)
  })

  it('boolean passes (not string)', () => {
    expect(NotString.safeParse(true).success).toBe(true)
  })

  it('string fails with x-not-message', () => {
    const valid = NotString.safeParse('hello')
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          code: 'custom',
          path: [],
          message: 'Must not be a string',
        },
      ])
    }
  })
})

describe('zod fixtures: additional-properties runtime', () => {
  it('record of strings passes', () => {
    expect(AdditionalPropertiesConfig.safeParse({ a: 'x', b: 'y' }).success).toBe(true)
  })

  it('non-string value fails with invalid_type', () => {
    const valid = AdditionalPropertiesConfig.safeParse({ a: 1 })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['a'],
          message: 'Invalid input: expected string, received number',
        },
      ])
    }
  })
})

describe('zod fixtures: nested runtime', () => {
  it('valid order passes', () => {
    expect(
      NestedOrder.safeParse({
        id: 1,
        customer: { name: 'taro', email: 'a@b.com' },
        items: [{ name: 'apple', price: 100, quantity: 2 }],
        status: 'pending',
      }).success,
    ).toBe(true)
  })

  it('invalid status returns enum invalid_value', () => {
    const valid = NestedOrder.safeParse({
      id: 1,
      customer: { name: 'taro', email: 'a@b.com' },
      items: [],
      status: 'invalid',
    })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          code: 'invalid_value',
          values: ['pending', 'confirmed', 'shipped', 'delivered'],
          path: ['status'],
          message: 'Invalid option: expected one of "pending"|"confirmed"|"shipped"|"delivered"',
        },
      ])
    }
  })
})

describe('zod fixtures: brand runtime', () => {
  it('valid branded types pass', () => {
    expect(
      BrandedTypes.safeParse({
        userId: '00000000-0000-4000-8000-000000000000',
        email: 'a@b.com',
        price: 10,
        quantity: 1,
        tags: ['x'],
        name: 'item',
      }).success,
    ).toBe(true)
  })

  it('bad uuid fails with invalid_format', () => {
    const valid = BrandedTypes.safeParse({
      userId: 'not-uuid',
      email: 'a@b.com',
      price: 1,
      quantity: 1,
      tags: ['x'],
      name: 'a',
    })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'uuid',
          pattern:
            '/^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/',
          path: ['userId'],
          message: 'Invalid UUID',
        },
      ])
    }
  })
})

describe('zod fixtures: readonly runtime', () => {
  it('valid config passes (count optional)', () => {
    expect(ReadonlyConfig.safeParse({ name: 'a', tags: ['x'] }).success).toBe(true)
  })

  it('valid config with count passes', () => {
    expect(ReadonlyConfig.safeParse({ name: 'a', tags: ['x', 'y'], count: 2 }).success).toBe(
      true,
    )
  })

  it('missing required name fails', () => {
    const valid = ReadonlyConfig.safeParse({ tags: ['x'] })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['name'],
          message: 'Invalid input: expected string, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: circular runtime', () => {
  it('deeply nested cycle passes', () => {
    expect(CircularA.safeParse({ b: { a: { b: { a: {} } } } }).success).toBe(true)
  })

  it('non-object at deep path fails', () => {
    const valid = CircularA.safeParse({ b: { a: 'bad' } })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'object',
          code: 'invalid_type',
          path: ['b', 'a'],
          message: 'Invalid input: expected object, received string',
        },
      ])
    }
  })
})

describe('zod fixtures: definitions runtime', () => {
  it('valid chained $ref passes', () => {
    expect(DefinitionsA.safeParse({ b: { c: 'hello' } }).success).toBe(true)
  })

  it('wrong leaf type fails', () => {
    const valid = DefinitionsA.safeParse({ b: { c: 123 } })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['b', 'c'],
          message: 'Invalid input: expected string, received number',
        },
      ])
    }
  })
})

describe('zod fixtures: simple runtime', () => {
  it('required name passes (age optional)', () => {
    expect(SimpleSchema.safeParse({ name: 'taro' }).success).toBe(true)
  })

  it('missing name fails', () => {
    const valid = SimpleSchema.safeParse({})
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['name'],
          message: 'Invalid input: expected string, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: title runtime', () => {
  it('valid user passes', () => {
    expect(TitleUser.safeParse({ name: 'taro', email: 'a@b.com' }).success).toBe(true)
  })

  it('bad email fails with invalid_format', () => {
    const valid = TitleUser.safeParse({ name: 'x', email: 'bad' })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'email',
          pattern:
            "/^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$/",
          path: ['email'],
          message: 'Invalid email address',
        },
      ])
    }
  })
})

describe('zod fixtures: meta runtime', () => {
  it('valid user passes (role optional)', () => {
    expect(MetaUser.safeParse({ id: 1, email: 'a@b.com' }).success).toBe(true)
  })

  it('missing required email fails', () => {
    const valid = MetaUser.safeParse({ id: 1 })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['email'],
          message: 'Invalid input: expected string, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: $defs runtime', () => {
  it('user without optional address passes', () => {
    expect(DefsUser.safeParse({ name: 'taro' }).success).toBe(true)
  })

  it('partial address fails', () => {
    const valid = DefsUser.safeParse({ name: 'x', address: { street: 'a' } })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['address', 'city'],
          message: 'Invalid input: expected string, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: self-reference runtime', () => {
  it('nested children pass', () => {
    expect(
      SelfRefSchema.safeParse({
        children: [{ children: [{ children: [] }] }],
      }).success,
    ).toBe(true)
  })

  it('non-array children at depth fails', () => {
    const valid = SelfRefSchema.safeParse({ children: [{ children: 'bad' }] })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'array',
          code: 'invalid_type',
          path: ['children', 0, 'children'],
          message: 'Invalid input: expected array, received string',
        },
      ])
    }
  })
})

describe('zod fixtures: split-refs runtime', () => {
  it('valid split user passes', () => {
    expect(
      SplitRefsUser.safeParse({
        name: 'taro',
        address: { street: 'main', city: 'tokyo' },
      }).success,
    ).toBe(true)
  })

  it('wrong-type field in referenced schema fails', () => {
    const valid = SplitRefsUser.safeParse({
      name: 'x',
      address: { street: 1, city: 'b' },
    })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          expected: 'string',
          code: 'invalid_type',
          path: ['address', 'street'],
          message: 'Invalid input: expected string, received number',
        },
      ])
    }
  })
})

describe('zod fixtures: split-nested runtime', () => {
  it('valid split-nested order passes', () => {
    expect(
      SplitNestedOrder.safeParse({
        id: 1,
        customer: {
          name: 'taro',
          email: 'a@b.com',
          address: { street: 'a', city: 'b' },
        },
        status: 'pending',
      }).success,
    ).toBe(true)
  })

  it('bad email deep inside customer fails', () => {
    const valid = SplitNestedOrder.safeParse({
      id: 1,
      customer: { name: 'x', email: 'bad', address: { street: 'a', city: 'b' } },
      status: 'pending',
    })
    expect(valid.success).toBe(false)
    if (!valid.success) {
      expect(valid.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'email',
          pattern:
            "/^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$/",
          path: ['customer', 'email'],
          message: 'Invalid email address',
        },
      ])
    }
  })
})

describe('zod fixtures: discriminated-union runtime', () => {
  it('valid: cat', () => {
    expect(DiscriminatedAnimal.safeParse({ kind: 'cat', meow: true }).success).toBe(true)
  })

  it('valid: dog', () => {
    expect(DiscriminatedAnimal.safeParse({ kind: 'dog', bark: false }).success).toBe(true)
  })

  it('invalid: unknown discriminator', () => {
    const result = DiscriminatedAnimal.safeParse({ kind: 'fish', meow: true })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          code: 'invalid_union',
          errors: [],
          note: 'No matching discriminator',
          discriminator: 'kind',
          path: ['kind'],
          message: 'Invalid input',
        },
      ])
    }
  })

  it('invalid: missing variant-specific property', () => {
    const result = DiscriminatedAnimal.safeParse({ kind: 'cat' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          expected: 'boolean',
          code: 'invalid_type',
          path: ['meow'],
          message: 'Invalid input: expected boolean, received undefined',
        },
      ])
    }
  })
})

describe('zod fixtures: length-message runtime', () => {
  it('valid: exactly 6 chars passes', () => {
    expect(LengthMessageCode.safeParse({ code: 'abcdef' }).success).toBe(true)
  })

  it('invalid: short code returns x-length-message', () => {
    const result = LengthMessageCode.safeParse({ code: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'too_small',
          minimum: 6,
          inclusive: true,
          exact: true,
          path: ['code'],
          message: 'Code must be exactly 6 characters',
        },
      ])
    }
  })

  it('invalid: long code returns x-length-message', () => {
    const result = LengthMessageCode.safeParse({ code: 'abcdefg' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toStrictEqual([
        {
          origin: 'string',
          code: 'too_big',
          maximum: 6,
          inclusive: true,
          exact: true,
          path: ['code'],
          message: 'Code must be exactly 6 characters',
        },
      ])
    }
  })
})
