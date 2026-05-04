import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey, normalizeTypes, toPascalCase } from '../../utils/index.js'

export function type(schema: JSONSchema | undefined, rootName: string = 'Schema'): string {
  if (schema === undefined) return ''

  // $ref case
  if (schema.$ref) {
    if (schema.$ref === '#' || schema.$ref === '') {
      return `typeof ${rootName}.Encoded`
    }

    const TABLE = [
      ['#/components/schemas/', 'Schema'],
      ['#/definitions/', 'Schema'],
      ['#/$defs/', 'Schema'],
    ] as const

    for (const [prefix] of TABLE) {
      if (schema.$ref?.startsWith(prefix)) {
        const name = schema.$ref.slice(prefix.length)
        return `_${toPascalCase(name)}`
      }
    }

    if (schema.$ref?.startsWith('#')) {
      const refName = schema.$ref.slice(1)
      if (refName === '') return `typeof ${rootName}.Encoded`
      if (!refName.includes('/')) return `_${toPascalCase(refName)}`
    }

    return 'unknown'
  }

  // combinators
  if (schema.oneOf) return union(schema.oneOf, rootName)
  if (schema.anyOf) return union(schema.anyOf, rootName)
  if (schema.allOf) return intersection(schema.allOf, rootName)
  if (schema.not) return 'unknown'

  // const
  if (schema.const !== undefined) {
    if (typeof schema.const === 'string') return `"${schema.const}"`
    if (typeof schema.const === 'number' || typeof schema.const === 'boolean')
      return String(schema.const)
    return JSON.stringify(schema.const) ?? 'null'
  }

  // enum
  if (schema.enum) {
    if (schema.enum.length === 1) {
      const v = schema.enum[0]
      return typeof v === 'string' ? `"${v}"` : String(v)
    }
    return `(${schema.enum.map((v: unknown) => (typeof v === 'string' ? `"${v}"` : String(v))).join(' | ')})`
  }

  // properties
  if (schema.properties) return objectType(schema, rootName)

  const t = normalizeTypes(schema.type)
  if (t.includes('string')) return 'string'
  if (t.includes('number')) return 'number'
  if (t.includes('integer')) return 'number'
  if (t.includes('boolean')) return 'boolean'
  if (t.includes('array')) return arrayType(schema, rootName)
  if (t.includes('object')) return objectType(schema, rootName)
  if (t.includes('date')) return 'Date'
  if (t.length === 1 && t[0] === 'null') return 'null'

  return 'unknown'
}

function union(schemas: readonly JSONSchema[], rootName: string): string {
  return `(${schemas.map((s) => type(s, rootName)).join(' | ')})`
}

function intersection(schemas: readonly JSONSchema[], rootName: string): string {
  const types = schemas
    .filter((s) => {
      if (s.type === 'null') return false
      if (s.nullable === true && Object.keys(s).length === 1) return false
      if (Object.keys(s).length === 1 && (s.default !== undefined || s.const !== undefined))
        return false
      return true
    })
    .map((s) => type(s, rootName))

  if (types.length === 0) return 'unknown'
  if (types.length === 1) return types[0]
  return `(${types.join(' & ')})`
}

function arrayType(schema: JSONSchema, rootName: string): string {
  if (schema.items) return `readonly ${type(schema.items, rootName)}[]`
  return 'readonly unknown[]'
}

function objectType(schema: JSONSchema, rootName: string): string {
  if (!schema.properties) {
    if (schema.additionalProperties) {
      if (typeof schema.additionalProperties === 'boolean') {
        return schema.additionalProperties
          ? '{ [key: string]: unknown }'
          : '{ [key: string]: never }'
      }
      return `{ [key: string]: ${type(schema.additionalProperties, rootName)} }`
    }
    return '{ [key: string]: unknown }'
  }

  const required = Array.isArray(schema.required) ? schema.required : []
  const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
    const propType = type(propSchema, rootName)
    const isRequired = required.includes(key)
    const safeKey = makeSafeKey(key)
    return isRequired ? `readonly ${safeKey}: ${propType}` : `readonly ${safeKey}?: ${propType}`
  })

  return `{${properties.join('; ')}}`
}
