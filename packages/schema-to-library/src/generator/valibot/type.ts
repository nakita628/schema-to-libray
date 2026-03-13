import type { JSONSchema } from '../../types/index.js'
import { normalizeTypes, toPascalCase } from '../../utils/index.js'

export function type(schema: JSONSchema | undefined, rootName: string = 'Schema'): string {
  if (schema === undefined) return ''

  // $ref case
  if (schema.$ref) {
    if (schema.$ref === '#' || schema.$ref === '') {
      return `v.InferOutput<typeof ${rootName}>`
    }

    const TABLE = [
      ['#/components/schemas/', 'Schema'],
      ['#/definitions/', 'Schema'],
      ['#/$defs/', 'Schema'],
    ] as const

    for (const [prefix] of TABLE) {
      if (schema.$ref?.startsWith(prefix)) {
        const name = schema.$ref.slice(prefix.length)
        return `${toPascalCase(name)}Type`
      }
    }

    if (schema.$ref?.startsWith('#')) {
      const refName = schema.$ref.slice(1)
      if (refName === '') return `v.InferOutput<typeof ${rootName}>`
      if (!refName.includes('/')) return `${toPascalCase(refName)}Type`
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
    return typeof schema.const === 'string' ? `"${schema.const}"` : String(schema.const)
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
  if (schema.properties) return object(schema, rootName)

  const t = normalizeTypes(schema.type)
  if (t.includes('string')) return 'string'
  if (t.includes('number')) return 'number'
  if (t.includes('integer')) return 'number'
  if (t.includes('boolean')) return 'boolean'
  if (t.includes('array')) return array(schema, rootName)
  if (t.includes('object')) return object(schema, rootName)
  if (t.includes('date')) return 'Date'
  if (t.length === 1 && t[0] === 'null') return 'null'

  return 'unknown'
}

function union(schemas: JSONSchema[], rootName: string): string {
  return `(${schemas.map((s) => type(s, rootName)).join(' | ')})`
}

function intersection(schemas: JSONSchema[], rootName: string): string {
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

function array(schema: JSONSchema, rootName: string): string {
  if (schema.items) return `${type(schema.items, rootName)}[]`
  return 'unknown[]'
}

function object(schema: JSONSchema, rootName: string): string {
  if (!schema.properties) {
    if (schema.additionalProperties) {
      if (typeof schema.additionalProperties === 'boolean') {
        return schema.additionalProperties ? 'Record<string, unknown>' : 'Record<string, never>'
      }
      return `Record<string, ${type(schema.additionalProperties, rootName)}>`
    }
    return 'Record<string, unknown>'
  }

  const required = Array.isArray(schema.required) ? schema.required : []
  const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
    const propType = type(propSchema, rootName)
    const isRequired = required.includes(key)
    const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `"${key}"`
    return isRequired ? `${safeKey}: ${propType}` : `${safeKey}?: ${propType}`
  })

  return `{${properties.join('; ')}}`
}
