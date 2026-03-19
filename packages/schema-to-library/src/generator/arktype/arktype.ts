import type { GeneratorOptions, JSONSchema } from '../../helper/index.js'
import {
  normalizeTypes,
  resolveOpenAPIRef,
  toIdentifierPascalCase,
  toPascalCase,
} from '../../utils/index.js'
import { _enum } from './enum.js'
import { integer } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

export function arktype(
  schema: JSONSchema,
  rootName: string = 'Schema',
  isArktype: boolean = false,
  options?: GeneratorOptions,
): string {
  // $ref
  if (schema.$ref) {
    if (Boolean(schema.$ref) === true) {
      return wrap(ref(schema, rootName, options), schema)
    }
    if (schema.type === 'array' && Boolean(schema.items?.$ref)) {
      if (schema.items?.$ref) {
        return wrap(`${ref(schema.items, rootName, options)}.array()`, schema)
      }
      return wrap('"unknown[]"', schema)
    }
    return wrap('"unknown"', schema)
  }
  // combinators
  if (schema.oneOf) {
    if (!schema.oneOf?.length) return wrap('"unknown"', schema)
    const schemas = schema.oneOf.map((s: JSONSchema) => arktype(s, rootName, isArktype, options))
    return wrap(unionStr(schemas), schema)
  }
  if (schema.anyOf) {
    if (!schema.anyOf?.length) return wrap('"unknown"', schema)
    const schemas = schema.anyOf.map((s: JSONSchema) => arktype(s, rootName, isArktype, options))
    return wrap(unionStr(schemas), schema)
  }
  if (schema.allOf) {
    return allOf(schema, rootName, isArktype, options)
  }
  // not
  if (schema.not) {
    return wrap('"unknown"', schema)
  }
  // const
  if (schema.const) {
    const v = typeof schema.const === 'string' ? `"'${schema.const}'"` : `"${schema.const}"`
    return wrap(v, schema)
  }
  // enum
  if (schema.enum) return wrap(_enum(schema), schema)
  // properties
  if (schema.properties) return wrap(object(schema, rootName, isArktype, arktype, options), schema)

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return wrap(string(schema), schema)
  if (types.includes('number')) return wrap(number(schema), schema)
  if (types.includes('integer')) return wrap(integer(schema), schema)
  if (types.includes('boolean')) return wrap('"boolean"', schema)
  if (types.includes('array')) return wrap(array(schema, rootName, isArktype, options), schema)
  if (types.includes('object'))
    return wrap(object(schema, rootName, isArktype, arktype, options), schema)
  if (types.includes('date')) return wrap('"Date"', schema)
  if (types.length === 1 && types[0] === 'null') return wrap('"null"', schema)

  return wrap('"unknown"', schema)
}

function allOf(
  schema: JSONSchema,
  rootName: string,
  isArktype: boolean,
  options?: GeneratorOptions,
): string {
  if (!schema.allOf?.length) return wrap('"unknown"', schema)

  const isNullType = (s: JSONSchema) =>
    s.type === 'null' || (s.nullable === true && Object.keys(s).length === 1)

  const isDefaultOnly = (s: JSONSchema) => Object.keys(s).length === 1 && s.default !== undefined

  const isConstOnly = (s: JSONSchema) => Object.keys(s).length === 1 && s.const !== undefined

  const nullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null') ||
    schema.allOf.some(isNullType)

  const schemas = schema.allOf
    .filter((s) => !(isNullType(s) || isDefaultOnly(s) || isConstOnly(s)))
    .map((s) => arktype(s, rootName, isArktype, options))

  if (!schemas.length) return wrap('"unknown"', { ...schema, nullable })

  const baseResult = schemas.length === 1 ? schemas[0] : intersectionStr(schemas)

  return wrap(baseResult, { ...schema, nullable })
}

function array(
  schema: JSONSchema,
  rootName: string,
  isArktype: boolean = false,
  options?: GeneratorOptions,
): string {
  const items = schema.items ? arktype(schema.items, rootName, isArktype, options) : '"unknown"'

  // For simple string types, use inline syntax
  if (items.startsWith('"') && items.endsWith('"')) {
    const inner = items.slice(1, -1)
    const base = `"${inner}[]"`

    const isFixedLength =
      typeof schema.minItems === 'number' &&
      typeof schema.maxItems === 'number' &&
      schema.minItems === schema.maxItems

    if (isFixedLength) return `type(${base}).and(type("unknown[] == ${schema.minItems}"))`

    const hasMin = typeof schema.minItems === 'number'
    const hasMax = typeof schema.maxItems === 'number'
    if (hasMin && hasMax)
      return `type(${base}).and(type("${schema.minItems} <= unknown[] <= ${schema.maxItems}"))`
    if (hasMin) return `type(${base}).and(type("unknown[] >= ${schema.minItems}"))`
    if (hasMax) return `type(${base}).and(type("unknown[] <= ${schema.maxItems}"))`

    return base
  }

  // Complex items type
  return `type(${items}).array()`
}

export function wrap(arktypeStr: string, schema: JSONSchema): string {
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')

  if (isNullable) {
    // If it's a simple string type, combine with | null
    if (arktypeStr.startsWith('"') && arktypeStr.endsWith('"')) {
      const inner = arktypeStr.slice(1, -1)
      return `"${inner} | null"`
    }
    return `type(${arktypeStr}).or("null")`
  }

  return arktypeStr
}

function unionStr(schemas: string[]): string {
  // If all are simple string types, combine them
  if (schemas.every((s) => s.startsWith('"') && s.endsWith('"'))) {
    const inner = schemas.map((s) => s.slice(1, -1)).join(' | ')
    return `"${inner}"`
  }
  // Otherwise use .or() chaining
  return schemas.reduce((acc, s) => `type(${acc}).or(${s})`)
}

function intersectionStr(schemas: string[]): string {
  // If all are simple string types, combine them
  if (schemas.every((s) => s.startsWith('"') && s.endsWith('"'))) {
    const inner = schemas.map((s) => s.slice(1, -1)).join(' & ')
    return `"${inner}"`
  }
  return schemas.reduce((acc, s) => `type(${acc}).and(${s})`)
}

function ref(schema: JSONSchema, rootName: string, options?: GeneratorOptions): string {
  if (schema.$ref === '#' || schema.$ref === '') {
    return `"${rootName}"`
  }

  // OpenAPI component-aware resolution
  if (options?.openapi && schema.$ref) {
    const resolved = resolveOpenAPIRef(schema.$ref)
    if (resolved) {
      return `"${resolved}"`
    }
  }

  const TABLE = [
    ['#/components/schemas/', 'Schema'],
    ['#/definitions/', 'Schema'],
    ['#/$defs/', 'Schema'],
  ] as const

  const toName = options?.openapi ? toIdentifierPascalCase : toPascalCase

  for (const [prefix] of TABLE) {
    if (schema.$ref?.startsWith(prefix)) {
      const name = toName(schema.$ref.slice(prefix.length))
      return `"${name}"`
    }
  }

  if (schema.$ref?.startsWith('#')) {
    const refName = schema.$ref.slice(1)
    if (refName === '') return `"${rootName}"`
    return `"${toName(refName)}"`
  }

  return '"unknown"'
}
