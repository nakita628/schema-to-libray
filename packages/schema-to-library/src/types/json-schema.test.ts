import { describe, expect, it } from 'vitest'
import type { JSONSchema, JSONSchemaFormat, JSONSchemaType } from './json-schema.js'

describe('JSONSchema type', () => {
  it('should accept a minimal schema', () => {
    const schema: JSONSchema = { type: 'string' }
    expect(schema.type).toBe('string')
  })

  it('should accept all standard types', () => {
    const types: JSONSchemaType[] = [
      'string',
      'number',
      'integer',
      'boolean',
      'array',
      'object',
      'null',
      'date',
    ]
    expect(types).toHaveLength(8)
  })

  it('should accept Draft 2020-12 schema', () => {
    const schema: JSONSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schema',
      type: 'object',
      $defs: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
          },
        },
      },
      properties: {
        home: { $ref: '#/$defs/address' },
      },
      required: ['home'],
    }
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(schema.$defs).toBeDefined()
  })

  it('should accept Draft-04 schema with definitions', () => {
    const schema: JSONSchema = {
      type: 'object',
      definitions: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
      properties: {
        user: { $ref: '#/definitions/user' },
      },
    }
    expect(schema.definitions).toBeDefined()
  })

  it('should accept composition keywords', () => {
    const schema: JSONSchema = {
      oneOf: [{ type: 'string' }, { type: 'number' }],
    }
    expect(schema.oneOf).toHaveLength(2)

    const allOfSchema: JSONSchema = {
      allOf: [
        { type: 'object', properties: { a: { type: 'string' } } },
        { type: 'object', properties: { b: { type: 'number' } } },
      ],
    }
    expect(allOfSchema.allOf).toHaveLength(2)
  })

  it('should accept conditional keywords', () => {
    const schema: JSONSchema = {
      if: { properties: { type: { const: 'A' } } },
      then: { properties: { a: { type: 'string' } } },
      else: { properties: { b: { type: 'number' } } },
    }
    expect(schema.if).toBeDefined()
    expect(schema.then).toBeDefined()
    expect(schema.else).toBeDefined()
  })

  it('should accept OpenAPI extensions', () => {
    const schema: JSONSchema = {
      type: 'string',
      nullable: true,
      discriminator: { propertyName: 'type' },
      xml: { name: 'test', wrapped: true },
    }
    expect(schema.nullable).toBe(true)
    expect(schema.discriminator?.propertyName).toBe('type')
  })

  it('should accept string format values', () => {
    const formats: JSONSchemaFormat[] = [
      'email',
      'uuid',
      'uri',
      'date-time',
      'date',
      'time',
      'duration',
      'ipv4',
      'ipv6',
      'jwt',
    ]
    expect(formats).toHaveLength(10)
  })

  it('should accept number constraints', () => {
    const schema: JSONSchema = {
      type: 'number',
      minimum: 0,
      maximum: 100,
      exclusiveMinimum: 0,
      exclusiveMaximum: 100,
      multipleOf: 5,
    }
    expect(schema.minimum).toBe(0)
    expect(schema.multipleOf).toBe(5)
  })

  it('should accept array constraints', () => {
    const schema: JSONSchema = {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 10,
      uniqueItems: true,
    }
    expect(schema.minItems).toBe(1)
    expect(schema.uniqueItems).toBe(true)
  })
})
