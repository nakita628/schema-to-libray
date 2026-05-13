import { Value } from 'typebox/value'
import { describe, expect, it } from 'vite-plus/test'
import { User as DefsUser } from '../$defs/output.ts'
import { Config as AdditionalConfig } from '../additional-properties/output.ts'
import { Combined as AllofCombined } from '../allof/output.ts'
import { StringOrNumber as AnyofStringOrNumber } from '../anyof/output.ts'
import { A as DefinitionsA } from '../definitions/output.ts'
import { User as ErrUser } from '../error-messages/output.ts'
import { User as MetaUser } from '../meta/output.ts'
import { Order as NestedOrder } from '../nested/output.ts'
import { Shape as OneofShape } from '../oneof/output.ts'
import { Config as ReadonlyConfig } from '../readonly/output.ts'
import { Schema as SimpleSchema } from '../simple/output.ts'
import { Order as SplitNestedOrder } from '../split-nested/output.ts'
import { User as SplitRefsUser } from '../split-refs/output.ts'
import { User as TitleUser } from '../title/output.ts'

describe('simple', () => {
  it('valid', () => {
    const valid = Value.Check(SimpleSchema, { name: 'taro' })
    const errors = [...Value.Errors(SimpleSchema, { name: 'taro' })]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: missing name', () => {
    const valid = Value.Check(SimpleSchema, { age: 1 })
    const errors = [...Value.Errors(SimpleSchema, { age: 1 })]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'required',
        schemaPath: '#',
        instancePath: '',
        params: { requiredProperties: ['name'] },
        message: 'must have required properties name',
      },
    ])
  })

  it('invalid: wrong type', () => {
    const valid = Value.Check(SimpleSchema, { name: 1 })
    const errors = [...Value.Errors(SimpleSchema, { name: 1 })]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('title', () => {
  it('valid', () => {
    const valid = Value.Check(TitleUser, { name: 'taro', email: 'a@b.com' })
    const errors = [...Value.Errors(TitleUser, { name: 'taro', email: 'a@b.com' })]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: bad email format', () => {
    const valid = Value.Check(TitleUser, { name: 'a', email: 'not-email' })
    const errors = [...Value.Errors(TitleUser, { name: 'a', email: 'not-email' })]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'format',
        schemaPath: '#/properties/email',
        instancePath: '/email',
        params: { format: 'email' },
        message: 'must match format "email"',
      },
    ])
  })
})

describe('error-messages', () => {
  it('valid', () => {
    const value = { name: 'taro', age: 30, tags: ['a'] }
    const valid = Value.Check(ErrUser, value)
    const errors = [...Value.Errors(ErrUser, value)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: minimum bounds', () => {
    const value = { name: '', age: -1, tags: [] }
    const valid = Value.Check(ErrUser, value)
    const errors = [...Value.Errors(ErrUser, value)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'minLength',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { limit: 3 },
        message: 'must not have fewer than 3 characters',
      },
      {
        keyword: 'pattern',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { pattern: '^[a-zA-Z]+$' },
        message: 'must match pattern "^[a-zA-Z]+$"',
      },
      {
        keyword: 'minimum',
        schemaPath: '#/properties/age',
        instancePath: '/age',
        params: { comparison: '>=', limit: 0 },
        message: 'must be >= 0',
      },
      {
        keyword: 'minItems',
        schemaPath: '#/properties/tags',
        instancePath: '/tags',
        params: { limit: 1 },
        message: 'must not have fewer than 1 items',
      },
    ])
  })

  it('invalid: maximum bounds', () => {
    const value = { name: '123', age: 200, tags: ['a', 'b', 'c', 'd', 'e', 'f'] }
    const valid = Value.Check(ErrUser, value)
    const errors = [...Value.Errors(ErrUser, value)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'pattern',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { pattern: '^[a-zA-Z]+$' },
        message: 'must match pattern "^[a-zA-Z]+$"',
      },
      {
        keyword: 'maximum',
        schemaPath: '#/properties/age',
        instancePath: '/age',
        params: { comparison: '<=', limit: 120 },
        message: 'must be <= 120',
      },
      {
        keyword: 'maxItems',
        schemaPath: '#/properties/tags',
        instancePath: '/tags',
        params: { limit: 5 },
        message: 'must not have more than 5 items',
      },
    ])
  })
})

describe('allof', () => {
  it('valid', () => {
    const value = { name: 'x', age: 1 }
    const valid = Value.Check(AllofCombined, value)
    const errors = [...Value.Errors(AllofCombined, value)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: missing required from second schema', () => {
    const value = { name: 'x' }
    const valid = Value.Check(AllofCombined, value)
    const errors = [...Value.Errors(AllofCombined, value)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'required',
        schemaPath: '#/allOf/1',
        instancePath: '',
        params: { requiredProperties: ['age'] },
        message: 'must have required properties age',
      },
    ])
  })
})

describe('anyof', () => {
  it('valid: string', () => {
    const valid = Value.Check(AnyofStringOrNumber, 'hello')
    const errors = [...Value.Errors(AnyofStringOrNumber, 'hello')]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('valid: number', () => {
    const valid = Value.Check(AnyofStringOrNumber, 42)
    const errors = [...Value.Errors(AnyofStringOrNumber, 42)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: boolean', () => {
    const valid = Value.Check(AnyofStringOrNumber, true)
    const errors = [...Value.Errors(AnyofStringOrNumber, true)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/anyOf/0',
        instancePath: '',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'type',
        schemaPath: '#/anyOf/1',
        instancePath: '',
        params: { type: 'number' },
        message: 'must be number',
      },
      {
        keyword: 'anyOf',
        schemaPath: '#',
        instancePath: '',
        params: {},
        message: 'must match a schema in anyOf',
      },
    ])
  })
})

describe('oneof', () => {
  it('valid: circle', () => {
    const value = { kind: 'circle', radius: 5 }
    const valid = Value.Check(OneofShape, value)
    const errors = [...Value.Errors(OneofShape, value)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('valid: rectangle', () => {
    const value = { kind: 'rectangle', width: 1, height: 2 }
    const valid = Value.Check(OneofShape, value)
    const errors = [...Value.Errors(OneofShape, value)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: unknown kind', () => {
    const value = { kind: 'triangle' }
    const valid = Value.Check(OneofShape, value)
    const errors = [...Value.Errors(OneofShape, value)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'required',
        schemaPath: '#/anyOf/0',
        instancePath: '',
        params: { requiredProperties: ['radius'] },
        message: 'must have required properties radius',
      },
      {
        keyword: 'const',
        schemaPath: '#/anyOf/0/properties/kind',
        instancePath: '/kind',
        params: { allowedValue: 'circle' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'required',
        schemaPath: '#/anyOf/1',
        instancePath: '',
        params: { requiredProperties: ['width', 'height'] },
        message: 'must have required properties width, height',
      },
      {
        keyword: 'const',
        schemaPath: '#/anyOf/1/properties/kind',
        instancePath: '/kind',
        params: { allowedValue: 'rectangle' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'anyOf',
        schemaPath: '#',
        instancePath: '',
        params: {},
        message: 'must match a schema in anyOf',
      },
    ])
  })
})

describe('additional-properties', () => {
  it('valid', () => {
    const valid = Value.Check(AdditionalConfig, { a: 'hello' })
    const errors = [...Value.Errors(AdditionalConfig, { a: 'hello' })]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: value type mismatch', () => {
    const valid = Value.Check(AdditionalConfig, { a: 1 })
    const errors = [...Value.Errors(AdditionalConfig, { a: 1 })]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/patternProperties/^.*$',
        instancePath: '/a',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('nested', () => {
  it('valid', () => {
    const value = {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      items: [{ name: 'x', price: 1, quantity: 1 }],
      status: 'pending',
    }
    const valid = Value.Check(NestedOrder, value)
    const errors = [...Value.Errors(NestedOrder, value)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: multiple nested errors', () => {
    const value = {
      id: 1.5,
      customer: { name: '', email: 'x' },
      items: [],
      status: 'unknown',
    }
    const valid = Value.Check(NestedOrder, value)
    const errors = [...Value.Errors(NestedOrder, value)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/id',
        instancePath: '/id',
        params: { type: 'integer' },
        message: 'must be integer',
      },
      {
        keyword: 'minLength',
        schemaPath: '#/properties/customer/properties/name',
        instancePath: '/customer/name',
        params: { limit: 1 },
        message: 'must not have fewer than 1 characters',
      },
      {
        keyword: 'format',
        schemaPath: '#/properties/customer/properties/email',
        instancePath: '/customer/email',
        params: { format: 'email' },
        message: 'must match format "email"',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/0',
        instancePath: '/status',
        params: { allowedValue: 'pending' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/1',
        instancePath: '/status',
        params: { allowedValue: 'confirmed' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/2',
        instancePath: '/status',
        params: { allowedValue: 'shipped' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/3',
        instancePath: '/status',
        params: { allowedValue: 'delivered' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'anyOf',
        schemaPath: '#/properties/status',
        instancePath: '/status',
        params: {},
        message: 'must match a schema in anyOf',
      },
    ])
  })
})

describe('$defs', () => {
  it('valid', () => {
    const value = { name: 'taro', address: { street: 's', city: 'c' } }
    const valid = Value.Check(DefsUser, value)
    const errors = [...Value.Errors(DefsUser, value)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: nested ref violations', () => {
    const value = { name: 1, address: { street: 1 } }
    const valid = Value.Check(DefsUser, value)
    const errors = [...Value.Errors(DefsUser, value)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'required',
        schemaPath: '#/properties/address',
        instancePath: '/address',
        params: { requiredProperties: ['city'] },
        message: 'must have required properties city',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/address/properties/street',
        instancePath: '/address/street',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('definitions', () => {
  it('valid', () => {
    const valid = Value.Check(DefinitionsA, { b: { c: 'hello' } })
    const errors = [...Value.Errors(DefinitionsA, { b: { c: 'hello' } })]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: nested type', () => {
    const valid = Value.Check(DefinitionsA, { b: { c: 1 } })
    const errors = [...Value.Errors(DefinitionsA, { b: { c: 1 } })]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/b/properties/c',
        instancePath: '/b/c',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('readonly', () => {
  it('valid', () => {
    const valid = Value.Check(ReadonlyConfig, { name: 'foo', tags: ['x'] })
    const errors = [...Value.Errors(ReadonlyConfig, { name: 'foo', tags: ['x'] })]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: wrong types', () => {
    const valid = Value.Check(ReadonlyConfig, { name: 1, tags: [1] })
    const errors = [...Value.Errors(ReadonlyConfig, { name: 1, tags: [1] })]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/tags/items',
        instancePath: '/tags/0',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('split-refs', () => {
  it('valid', () => {
    const value = { name: 'taro', address: { street: 's', city: 'c' } }
    const valid = Value.Check(SplitRefsUser, value)
    const errors = [...Value.Errors(SplitRefsUser, value)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: nested type mismatches', () => {
    const value = { name: 1, address: { street: 1, city: 1 } }
    const valid = Value.Check(SplitRefsUser, value)
    const errors = [...Value.Errors(SplitRefsUser, value)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/name',
        instancePath: '/name',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/address/properties/street',
        instancePath: '/address/street',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/address/properties/city',
        instancePath: '/address/city',
        params: { type: 'string' },
        message: 'must be string',
      },
    ])
  })
})

describe('split-nested', () => {
  it('valid', () => {
    const value = {
      id: 1,
      customer: { name: 'a', email: 'a@b.com' },
      status: 'pending',
    }
    const valid = Value.Check(SplitNestedOrder, value)
    const errors = [...Value.Errors(SplitNestedOrder, value)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: multiple nested errors', () => {
    const value = { id: 1.5, customer: { name: 1, email: 'x' }, status: 'bad' }
    const valid = Value.Check(SplitNestedOrder, value)
    const errors = [...Value.Errors(SplitNestedOrder, value)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/id',
        instancePath: '/id',
        params: { type: 'integer' },
        message: 'must be integer',
      },
      {
        keyword: 'type',
        schemaPath: '#/properties/customer/properties/name',
        instancePath: '/customer/name',
        params: { type: 'string' },
        message: 'must be string',
      },
      {
        keyword: 'format',
        schemaPath: '#/properties/customer/properties/email',
        instancePath: '/customer/email',
        params: { format: 'email' },
        message: 'must match format "email"',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/0',
        instancePath: '/status',
        params: { allowedValue: 'pending' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/1',
        instancePath: '/status',
        params: { allowedValue: 'shipped' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'const',
        schemaPath: '#/properties/status/anyOf/2',
        instancePath: '/status',
        params: { allowedValue: 'delivered' },
        message: 'must be equal to constant',
      },
      {
        keyword: 'anyOf',
        schemaPath: '#/properties/status',
        instancePath: '/status',
        params: {},
        message: 'must match a schema in anyOf',
      },
    ])
  })
})

describe('meta', () => {
  it('valid', () => {
    const value = { id: 1, email: 'a@b.com' }
    const valid = Value.Check(MetaUser, value)
    const errors = [...Value.Errors(MetaUser, value)]
    expect(valid).toBe(true)
    expect(errors).toStrictEqual([])
  })

  it('invalid: type and format', () => {
    const value = { id: 1.5, email: 'bad' }
    const valid = Value.Check(MetaUser, value)
    const errors = [...Value.Errors(MetaUser, value)]
    expect(valid).toBe(false)
    expect(errors).toStrictEqual([
      {
        keyword: 'type',
        schemaPath: '#/properties/id',
        instancePath: '/id',
        params: { type: 'integer' },
        message: 'must be integer',
      },
      {
        keyword: 'format',
        schemaPath: '#/properties/email',
        instancePath: '/email',
        params: { format: 'email' },
        message: 'must match format "email"',
      },
    ])
  })
})
