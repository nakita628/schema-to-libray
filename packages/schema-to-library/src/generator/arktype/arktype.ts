import { arktypeWrap } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
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

const isQuoted = (s: string) => s.startsWith('"') && s.endsWith('"')

const unionStr = (schemas: string[]) =>
  schemas.every(isQuoted)
    ? `"${schemas.map((s) => s.slice(1, -1)).join(' | ')}"`
    : schemas.reduce((acc, s) => `type(${acc}).or(${s})`)

const intersectionStr = (schemas: string[]) =>
  schemas.every(isQuoted)
    ? `"${schemas.map((s) => s.slice(1, -1)).join(' & ')}"`
    : schemas.reduce((acc, s) => `type(${acc}).and(${s})`)

export function arktype(
  schema: JSONSchema,
  rootName: string = 'Schema',
  isArktype: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  const readonly = (v: string) => (options?.readonly ? `${v}.readonly()` : v)

  if (schema.$ref) {
    const ref = (s: JSONSchema): string => {
      if (s.$ref === '#' || s.$ref === '') return `"${rootName}"`
      if (options?.openapi && s.$ref) {
        const resolved = resolveOpenAPIRef(s.$ref)
        if (resolved) return `"${resolved}"`
      }
      const toName = options?.openapi ? toIdentifierPascalCase : toPascalCase
      const REF_PREFIXES = ['#/components/schemas/', '#/definitions/', '#/$defs/'] as const
      for (const prefix of REF_PREFIXES) {
        if (s.$ref?.startsWith(prefix)) return `"${toName(s.$ref.slice(prefix.length))}"`
      }
      if (s.$ref?.startsWith('#')) {
        const refName = s.$ref.slice(1)
        return refName === '' ? `"${rootName}"` : `"${toName(refName)}"`
      }
      return '"unknown"'
    }
    if (schema.type === 'array' && schema.items?.$ref) {
      return arktypeWrap(`${ref(schema.items)}.array()`, schema)
    }
    return arktypeWrap(ref(schema), schema)
  }

  const describeWithMessage = (expr: string, msg: unknown): string =>
    typeof msg === 'string'
      ? `${isQuoted(expr) ? `type(${expr})` : expr}.describe(${JSON.stringify(msg)})`
      : expr

  if (schema.oneOf) {
    if (!schema.oneOf.length) return arktypeWrap('"unknown"', schema)
    const schemas = schema.oneOf.map((s) => arktype(s, rootName, isArktype, options))
    return arktypeWrap(describeWithMessage(unionStr(schemas), schema['x-oneOf-message']), schema)
  }

  if (schema.anyOf) {
    if (!schema.anyOf.length) return arktypeWrap('"unknown"', schema)
    const schemas = schema.anyOf.map((s) => arktype(s, rootName, isArktype, options))
    return arktypeWrap(describeWithMessage(unionStr(schemas), schema['x-anyOf-message']), schema)
  }

  if (schema.allOf) {
    if (!schema.allOf.length) return arktypeWrap('"unknown"', schema)
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
    if (!schemas.length) return arktypeWrap('"unknown"', { ...schema, nullable })
    const baseResult = schemas.length === 1 ? schemas[0] : intersectionStr(schemas)
    return arktypeWrap(baseResult, { ...schema, nullable })
  }

  if (schema.not) {
    const inner = schema.not
    if (typeof inner !== 'object' || inner === null) return arktypeWrap('"unknown"', schema)
    const notMessage = schema['x-not-message']
    const narrow = (predicate: string) => {
      const base = `type("unknown").narrow(${predicate})`
      const expr = notMessage ? `${base}.describe(${JSON.stringify(notMessage)})` : base
      return arktypeWrap(expr, schema)
    }
    const typePredicates: { readonly [k: string]: string } = {
      string: `(v: unknown) => typeof v !== 'string'`,
      number: `(v: unknown) => typeof v !== 'number'`,
      integer: `(v: unknown) => typeof v !== 'number' || !Number.isInteger(v)`,
      boolean: `(v: unknown) => typeof v !== 'boolean'`,
      array: '(v: unknown) => !Array.isArray(v)',
      object: `(v: unknown) => typeof v !== 'object' || v === null || Array.isArray(v)`,
      null: '(v: unknown) => v !== null',
    }
    if ('const' in inner) return narrow(`(v: unknown) => v !== ${JSON.stringify(inner.const)}`)
    if (typeof inner.type === 'string') {
      const predicate = typePredicates[inner.type]
      if (predicate) return narrow(predicate)
    }
    if (Array.isArray(inner.type)) {
      const bodies = inner.type
        .map((t) => typePredicates[t])
        .filter((p) => p !== undefined)
        .map((p) => `(${p.replace(/^\(v: unknown\) => /, '')})`)
      if (bodies.length > 0) return narrow(`(v: unknown) => ${bodies.join(' && ')}`)
    }
    if (Array.isArray(inner.enum)) {
      return narrow(`(v: unknown) => !${JSON.stringify(inner.enum)}.includes(v as never)`)
    }
    return arktypeWrap('"unknown"', schema)
  }

  if (schema.const !== undefined) {
    const formatConst = (value: unknown): string => {
      if (typeof value === 'string') return `"'${value}'"`
      if (typeof value === 'number' || typeof value === 'boolean') return `"${String(value)}"`
      return `"${JSON.stringify(value) ?? 'null'}"`
    }
    return arktypeWrap(formatConst(schema.const), schema)
  }
  if (schema.enum) return arktypeWrap(_enum(schema), schema)
  if (schema.properties)
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return arktypeWrap(string(schema), schema)
  if (types.includes('number')) return arktypeWrap(number(schema), schema)
  if (types.includes('integer')) return arktypeWrap(integer(schema), schema)
  if (types.includes('boolean')) return arktypeWrap('"boolean"', schema)

  if (types.includes('array')) {
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => arktype(s, rootName, isArktype, options))
      const tupleExpr = items.every(isQuoted)
        ? `"[${items.map((s) => s.slice(1, -1)).join(', ')}]"`
        : `type([${items.join(',')}])`
      return arktypeWrap(tupleExpr, schema)
    }
    const items = schema.items ? arktype(schema.items, rootName, isArktype, options) : '"unknown"'
    if (!isQuoted(items)) return arktypeWrap(`type(${items}).array()`, schema)
    const inner = items.slice(1, -1)
    const base = `"${inner}[]"`
    const { minItems, maxItems } = schema
    const isFixedLength =
      typeof minItems === 'number' && typeof maxItems === 'number' && minItems === maxItems
    const lengthExpr = isFixedLength
      ? `type(${base}).and(type("unknown[] == ${minItems}"))`
      : typeof minItems === 'number' && typeof maxItems === 'number'
        ? `type(${base}).and(type("${minItems} <= unknown[] <= ${maxItems}"))`
        : typeof minItems === 'number'
          ? `type(${base}).and(type("unknown[] >= ${minItems}"))`
          : typeof maxItems === 'number'
            ? `type(${base}).and(type("unknown[] <= ${maxItems}"))`
            : base
    const arrayExpr =
      schema.uniqueItems === true
        ? `${isQuoted(lengthExpr) ? `type(${lengthExpr})` : lengthExpr}.narrow((items: unknown[]) => new Set(items).size === items.length)`
        : lengthExpr
    return arktypeWrap(arrayExpr, schema)
  }

  if (types.includes('object'))
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))
  if (types.includes('date')) return arktypeWrap('"Date"', schema)
  if (types.length === 1 && types[0] === 'null') return arktypeWrap('"null"', schema)

  return arktypeWrap('"unknown"', schema)
}
