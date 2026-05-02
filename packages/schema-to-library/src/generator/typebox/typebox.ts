import { typeboxWrap } from '../../helper/index.js'
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

export function typebox(
  schema: JSONSchema,
  rootName: string = 'Schema',
  isTypebox: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  const withReadonly = (s: string) => (options?.readonly ? `Type.Readonly(${s})` : s)

  if (schema.$ref) {
    const ref = (s: JSONSchema): string => {
      if (s.$ref === '#' || s.$ref === '') {
        return typeboxWrap(`Type.Recursive((_Self) => ${rootName})`, s)
      }
      if (options?.openapi && s.$ref) {
        const resolved = resolveOpenAPIRef(s.$ref)
        if (resolved) {
          if (resolved === rootName) return typeboxWrap(`Type.Recursive((_Self) => ${resolved})`, s)
          return typeboxWrap(resolved, s)
        }
      }
      const toName = options?.openapi ? toIdentifierPascalCase : toPascalCase
      const REF_PREFIXES = ['#/components/schemas/', '#/definitions/', '#/$defs/'] as const
      for (const prefix of REF_PREFIXES) {
        if (s.$ref?.startsWith(prefix)) {
          return typeboxWrap(toName(s.$ref.slice(prefix.length)), s)
        }
      }
      if (s.$ref?.startsWith('#')) {
        const refName = s.$ref.slice(1)
        return refName === '' ? rootName : toName(refName)
      }
      if (s.$ref?.includes('#')) return 'Type.Unknown()'
      if (s.$ref?.startsWith('http')) {
        const last = s.$ref.split('/').at(-1)
        if (last) return last.replace(/\.json$/, '')
      }
      return 'Type.Any()'
    }
    if (schema.type === 'array' && schema.items?.$ref) {
      return `Type.Array(${typeboxWrap(ref(schema.items), schema.items)})`
    }
    return typeboxWrap(ref(schema), schema)
  }

  if (schema.oneOf) {
    if (!schema.oneOf.length) return typeboxWrap('Type.Any()', schema)
    const schemas = schema.oneOf.map((s) => typebox(s, rootName, isTypebox, options))
    return typeboxWrap(`Type.Union([${schemas.join(',')}])`, schema)
  }

  if (schema.anyOf) {
    if (!schema.anyOf.length) return typeboxWrap('Type.Any()', schema)
    const schemas = schema.anyOf.map((s) => typebox(s, rootName, isTypebox, options))
    return typeboxWrap(`Type.Union([${schemas.join(',')}])`, schema)
  }

  if (schema.allOf) {
    if (!schema.allOf.length) return typeboxWrap('Type.Any()', schema)
    const isNullType = (s: JSONSchema) =>
      s.type === 'null' || (s.nullable === true && Object.keys(s).length === 1)
    const isDefaultOnly = (s: JSONSchema) => Object.keys(s).length === 1 && s.default !== undefined
    const isConstOnly = (s: JSONSchema) => Object.keys(s).length === 1 && s.const !== undefined
    const nullable =
      schema.nullable === true ||
      (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null') ||
      schema.allOf.some(isNullType)
    const defaultValue = schema.allOf.find(isDefaultOnly)?.default
    const schemas = schema.allOf
      .filter((s) => !(isNullType(s) || isDefaultOnly(s) || isConstOnly(s)))
      .map((s) => typebox(s, rootName, isTypebox, options))
    if (!schemas.length) return typeboxWrap('Type.Any()', { ...schema, nullable })
    const baseResult = schemas.length === 1 ? schemas[0] : `Type.Intersect([${schemas.join(',')}])`
    if (defaultValue !== undefined) {
      const formatLiteral = (value: unknown): string => {
        if (typeof value === 'boolean') return `${value}`
        if (typeof value === 'number') return `${value}`
        return JSON.stringify(value)
      }
      const withDefault = `Type.Optional(${baseResult},{default:${formatLiteral(defaultValue)}})`
      return nullable ? `Type.Union([${withDefault},Type.Null()])` : withDefault
    }
    return typeboxWrap(baseResult, { ...schema, nullable })
  }

  if (schema.not) {
    const inner = schema.not
    if (typeof inner !== 'object' || inner === null) return typeboxWrap('Type.Any()', schema)
    return typeboxWrap(`Type.Not(${typebox(inner, rootName, isTypebox, options)})`, schema)
  }

  if (schema.const !== undefined)
    return typeboxWrap(`Type.Literal(${JSON.stringify(schema.const)})`, schema)
  if (schema.enum) return typeboxWrap(_enum(schema), schema)
  if (schema.properties)
    return withReadonly(typeboxWrap(object(schema, rootName, isTypebox, options), schema))

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return typeboxWrap(string(schema), schema)
  if (types.includes('number')) return typeboxWrap(number(schema), schema)
  if (types.includes('integer')) return typeboxWrap(integer(schema), schema)
  if (types.includes('boolean')) return typeboxWrap('Type.Boolean()', schema)

  if (types.includes('array')) {
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => typebox(s, rootName, isTypebox, options))
      return withReadonly(typeboxWrap(`Type.Tuple([${items.join(',')}])`, schema))
    }
    const items = schema.items ? typebox(schema.items, rootName, isTypebox, options) : 'Type.Any()'
    const opts = [
      typeof schema.minItems === 'number' ? `minItems:${schema.minItems}` : undefined,
      typeof schema.maxItems === 'number' ? `maxItems:${schema.maxItems}` : undefined,
      schema.uniqueItems === true ? `uniqueItems:true` : undefined,
    ].filter((v) => v !== undefined)
    const arrayExpr =
      opts.length > 0 ? `Type.Array(${items},{${opts.join(',')}})` : `Type.Array(${items})`
    return withReadonly(typeboxWrap(arrayExpr, schema))
  }

  if (types.includes('object'))
    return withReadonly(typeboxWrap(object(schema, rootName, isTypebox, options), schema))
  if (types.includes('date')) return typeboxWrap('Type.Date()', schema)
  if (types.length === 1 && types[0] === 'null') return typeboxWrap('Type.Null()', schema)

  return typeboxWrap('Type.Any()', schema)
}
