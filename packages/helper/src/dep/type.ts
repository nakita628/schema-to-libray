import type { Schema } from '@schema-to-library/cli'
import { normalizeTypes, toPascalCase } from '../utils/index.js'

export function type(schema: Schema, rootName: string = 'Schema'): string {
  if (schema === undefined) return ''

  // $ref case
  if (schema.$ref) {
    if (schema.$ref === '#' || schema.$ref === '') {
      return `z.infer<typeof ${rootName}>`
    }

    const TABLE = [
      ['#/components/schemas/', 'Schema'],
      ['#/definitions/', 'Schema'],
      ['#/$defs/', 'Schema'],
    ] as const

    for (const [prefix] of TABLE) {
      if (schema.$ref?.startsWith(prefix)) {
        const name = schema.$ref.slice(prefix.length)
        const pascalCaseName = toPascalCase(name)
        // For self-references, use the type name directly
        if (pascalCaseName === rootName) {
          return `${pascalCaseName}Type`
        }
        // For other references, use the type name directly to avoid circular references
        return `${pascalCaseName}Type`
      }
    }

    // Handle relative references like #animal
    if (schema.$ref?.startsWith('#')) {
      const refName = schema.$ref.slice(1) // Remove the leading #
      if (refName === '') {
        return `z.infer<typeof ${rootName}>`
      }
      // Only handle simple references like #animal, not complex paths
      if (!refName.includes('/')) {
        const pascalCaseName = toPascalCase(refName)
        return `${pascalCaseName}Type`
      }
    }

    // Handle external file references with fragments
    if (schema.$ref?.includes('#')) {
      const [filePath, fragment] = schema.$ref.split('#')

      // All external references are unknown
      return 'unknown'
    }

    // Handle HTTP references without fragments
    if (schema.$ref?.startsWith('http')) {
      return 'unknown'
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
    const allStrings = schema.enum.every((v: unknown) => typeof v === 'string')
    if (allStrings) {
      return `(${schema.enum.map((v: unknown) => `"${v}"`).join(' | ')})`
    }
    return `(${schema.enum.map((v: unknown) => (typeof v === 'string' ? `"${v}"` : String(v))).join(' | ')})`
  }

  // properties
  if (schema.properties) return object(schema, rootName)

  const t = normalizeTypes(schema.type)

  // primitive types
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

function union(schemas: Schema[], rootName: string): string {
  const types = schemas.map((s) => type(s, rootName))
  return `(${types.join(' | ')})`
}

function intersection(schemas: Schema[], rootName: string): string {
  const types = schemas
    .filter((s) => {
      // null type is excluded
      if (s.type === 'null') return false
      // nullable: true only is excluded
      if (s.nullable === true && Object.keys(s).length === 1) return false
      // simple properties (default, const, etc.) are excluded
      if (Object.keys(s).length === 1 && (s.default !== undefined || s.const !== undefined))
        return false
      return true
    })
    .map((s) => type(s, rootName))

  if (types.length === 0) return 'unknown'
  if (types.length === 1) return types[0]

  return `(${types.join(' & ')})`
}

function array(schema: Schema, rootName: string): string {
  if (schema.items) {
    const itemType = type(schema.items, rootName)
    return `${itemType}[]`
  }
  return 'unknown[]'
}

function object(schema: Schema, rootName: string): string {
  if (!schema.properties) {
    if (schema.additionalProperties) {
      if (typeof schema.additionalProperties === 'boolean') {
        return schema.additionalProperties ? 'Record<string, unknown>' : 'Record<string, never>'
      }
      const valueType = type(schema.additionalProperties, rootName)
      return `Record<string, ${valueType}>`
    }
    return 'Record<string, unknown>'
  }

  const properties: string[] = []
  const required = Array.isArray(schema.required) ? schema.required : []

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const propType = type(propSchema, rootName)
    const isRequired = required.includes(key)
    const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `"${key}"`

    if (isRequired) {
      properties.push(`${safeKey}: ${propType}`)
    } else {
      properties.push(`${safeKey}?: ${propType}`)
    }
  }

  return `{${properties.join('; ')}}`
}