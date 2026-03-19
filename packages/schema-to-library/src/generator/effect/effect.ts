import type { JSONSchema } from '../../helper/index.js'
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

export function effect(
  schema: JSONSchema,
  rootName: string = 'Schema',
  isEffect: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  // $ref
  if (schema.$ref) {
    if (Boolean(schema.$ref) === true) {
      return wrap(ref(schema, rootName, isEffect, options), schema)
    }
    if (schema.type === 'array' && Boolean(schema.items?.$ref)) {
      if (schema.items?.$ref) {
        return `Schema.Array(${wrap(ref(schema.items, rootName, isEffect, options), schema.items)})`
      }
      return wrap('Schema.Array(Schema.Unknown)', schema)
    }
    return wrap('Schema.Unknown', schema)
  }
  // combinators
  if (schema.oneOf) {
    if (!schema.oneOf?.length) return wrap('Schema.Unknown', schema)
    const schemas = schema.oneOf.map((s: JSONSchema) => effect(s, rootName, isEffect, options))
    return wrap(`Schema.Union(${schemas.join(',')})`, schema)
  }
  if (schema.anyOf) {
    if (!schema.anyOf?.length) return wrap('Schema.Unknown', schema)
    const schemas = schema.anyOf.map((s: JSONSchema) => effect(s, rootName, isEffect, options))
    return wrap(`Schema.Union(${schemas.join(',')})`, schema)
  }
  if (schema.allOf) {
    return allOf(schema, rootName, isEffect, options)
  }
  // not
  if (schema.not) {
    return wrap('Schema.Unknown', schema)
  }
  // const
  if (schema.const) {
    return wrap(`Schema.Literal(${JSON.stringify(schema.const)})`, schema)
  }
  // enum
  if (schema.enum) return wrap(_enum(schema), schema)
  // properties
  if (schema.properties) return wrap(object(schema, rootName, isEffect, effect, options), schema)

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return wrap(string(schema), schema)
  if (types.includes('number')) return wrap(number(schema), schema)
  if (types.includes('integer')) return wrap(integer(schema), schema)
  if (types.includes('boolean')) return wrap('Schema.Boolean', schema)
  if (types.includes('array')) return wrap(array(schema, rootName, isEffect, options), schema)
  if (types.includes('object'))
    return wrap(object(schema, rootName, isEffect, effect, options), schema)
  if (types.includes('date')) return wrap('Schema.Date', schema)
  if (types.length === 1 && types[0] === 'null') return wrap('Schema.Null', schema)

  return wrap('Schema.Unknown', schema)
}

function allOf(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  if (!schema.allOf?.length) return wrap('Schema.Unknown', schema)

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
    .map((s) => effect(s, rootName, isEffect, options))

  if (!schemas.length) return wrap('Schema.Unknown', { ...schema, nullable })

  // For Effect Schema, use extend for struct intersection
  const baseResult = schemas.length === 1 ? schemas[0] : `Schema.extend(${schemas.join(',')})`

  if (defaultValue !== undefined) {
    const formatLiteral = (v: unknown): string =>
      typeof v === 'number' ? `${v}` : JSON.stringify(v)
    const withDefault = `Schema.optional(${baseResult},{default:() => ${formatLiteral(defaultValue)}})`
    return nullable ? `Schema.NullOr(${withDefault})` : withDefault
  }

  return wrap(baseResult, { ...schema, nullable })
}

function array(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  const items = schema.items ? effect(schema.items, rootName, isEffect, options) : 'Schema.Unknown'
  const base = `Schema.Array(${items})`

  const isFixedLength =
    typeof schema.minItems === 'number' &&
    typeof schema.maxItems === 'number' &&
    schema.minItems === schema.maxItems

  const actions = [
    isFixedLength ? `Schema.itemsCount(${schema.minItems})` : undefined,
    !isFixedLength && typeof schema.minItems === 'number'
      ? `Schema.minItems(${schema.minItems})`
      : undefined,
    !isFixedLength && typeof schema.maxItems === 'number'
      ? `Schema.maxItems(${schema.maxItems})`
      : undefined,
  ].filter((v) => v !== undefined)

  if (actions.length > 0) return `${base}.pipe(${actions.join(',')})`
  return base
}

export function wrap(effectStr: string, schema: JSONSchema): string {
  const formatLiteral = (v: unknown): string => {
    if (typeof v === 'boolean') return `${v}`
    if (typeof v === 'number') return `${v}`
    if (typeof v === 'string') return JSON.stringify(v)
    return JSON.stringify(v)
  }

  const withDefault =
    schema.default !== undefined
      ? `Schema.optionalWith(${effectStr},{default:() => ${formatLiteral(schema.default)}})`
      : effectStr

  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')

  return isNullable ? `Schema.NullOr(${withDefault})` : withDefault
}

function ref(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  if (schema.$ref === '#' || schema.$ref === '') {
    return wrap(`Schema.suspend(() => ${rootName})`, schema)
  }

  // OpenAPI component-aware resolution
  if (options?.openapi && schema.$ref) {
    const resolved = resolveOpenAPIRef(schema.$ref)
    if (resolved) {
      if (resolved === rootName) {
        return wrap(`Schema.suspend(() => ${resolved})`, schema)
      }
      return wrap(isEffect ? `Schema.suspend(() => ${resolved})` : resolved, schema)
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
      const pascalCaseName = toName(schema.$ref.slice(prefix.length))
      if (pascalCaseName === rootName) {
        return wrap(`Schema.suspend(() => ${pascalCaseName})`, schema)
      }
      const v = isEffect
        ? `Schema.suspend(() => ${pascalCaseName})`
        : rootName === 'Schema'
          ? `${pascalCaseName}Schema`
          : `Schema.suspend(() => ${pascalCaseName})`
      return wrap(v, schema)
    }
  }

  if (schema.$ref?.startsWith('#')) {
    const refName = schema.$ref.slice(1)
    if (refName === '') return `Schema.suspend(() => ${rootName})`
    const pascalCaseName = toName(refName)
    return isEffect
      ? `Schema.suspend(() => ${pascalCaseName})`
      : rootName === 'Schema'
        ? `${pascalCaseName}Schema`
        : `Schema.suspend(() => ${pascalCaseName})`
  }

  if (schema.$ref?.includes('#')) return 'Schema.Unknown'
  if (schema.$ref?.startsWith('http')) {
    const parts = schema.$ref?.split('/')
    const last = parts?.[parts.length - 1]
    if (last) return last.replace(/\.json$/, '')
  }

  return 'Schema.Unknown'
}
