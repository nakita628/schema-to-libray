import type { JSONSchema } from '../../parser/index.js'
import { normalizeTypes, toPascalCase } from '../../utils/index.js'

/**
 * Generate TypeScript type definition from JSON Schema
 *
 * @param schema - JSON Schema object
 * @param rootName - Root schema name for reference resolution
 * @returns TypeScript type definition string
 * @example
 * ```ts
 * type(schema, 'Animal') // 'string' | '{ name: string; species: string; offspring?: AnimalType[] }'
 * ```
 */
export function type(schema: JSONSchema | undefined, rootName: string = 'Schema'): string {
  if (schema === undefined) return ''

  if (schema.$ref) {
    if (schema.$ref === '#' || schema.$ref === '') {
      return `z.infer<typeof ${rootName}>`
    }
    const PREFIXES = ['#/components/schemas/', '#/definitions/', '#/$defs/'] as const
    for (const prefix of PREFIXES) {
      if (schema.$ref.startsWith(prefix)) {
        return `_${toPascalCase(schema.$ref.slice(prefix.length))}`
      }
    }
    if (schema.$ref.startsWith('#')) {
      const refName = schema.$ref.slice(1)
      if (refName === '') return `z.infer<typeof ${rootName}>`
      if (!refName.includes('/')) return `_${toPascalCase(refName)}`
    }
    return 'unknown'
  }

  if (schema.oneOf || schema.anyOf) {
    const members = schema.oneOf ?? schema.anyOf ?? []
    return `(${members.map((s) => type(s, rootName)).join(' | ')})`
  }

  if (schema.allOf) {
    const members = schema.allOf
      .filter((s) => {
        if (s.type === 'null') return false
        if (s.nullable === true && Object.keys(s).length === 1) return false
        if (Object.keys(s).length === 1 && (s.default !== undefined || s.const !== undefined))
          return false
        return true
      })
      .map((s) => type(s, rootName))
    if (members.length === 0) return 'unknown'
    if (members.length === 1) return members[0]
    return `(${members.join(' & ')})`
  }

  if (schema.not) return 'unknown'

  if (schema.const !== undefined) {
    if (typeof schema.const === 'string') return `"${schema.const}"`
    if (typeof schema.const === 'number' || typeof schema.const === 'boolean')
      return String(schema.const)
    return JSON.stringify(schema.const) ?? 'null'
  }

  if (schema.enum) {
    if (schema.enum.length === 1) {
      const v = schema.enum[0]
      return typeof v === 'string' ? `"${v}"` : String(v)
    }
    return `(${schema.enum.map((v: unknown) => (typeof v === 'string' ? `"${v}"` : String(v))).join(' | ')})`
  }

  if (schema.properties) {
    const required = Array.isArray(schema.required) ? schema.required : []
    const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
      const propType = type(propSchema, rootName)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `"${key}"`
      return required.includes(key) ? `${safeKey}: ${propType}` : `${safeKey}?: ${propType}`
    })
    return `{${properties.join('; ')}}`
  }

  const t = normalizeTypes(schema.type)

  if (t.includes('string')) return 'string'
  if (t.includes('number')) return 'number'
  if (t.includes('integer')) return 'number'
  if (t.includes('boolean')) return 'boolean'
  if (t.includes('array')) {
    return schema.items ? `${type(schema.items, rootName)}[]` : 'unknown[]'
  }
  if (t.includes('object')) {
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
  if (t.includes('date')) return 'Date'
  if (t.length === 1 && t[0] === 'null') return 'null'

  return 'unknown'
}
