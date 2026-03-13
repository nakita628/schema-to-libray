import type { JSONSchema } from '../../types/index.js'
import { normalizeTypes, toPascalCase } from '../../utils/index.js'
import { _enum } from './enum.js'
import { integer } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

export function typebox(
  schema: JSONSchema,
  rootName: string = 'Schema',
  isTypebox: boolean = false,
): string {
  // $ref
  if (schema.$ref) {
    if (Boolean(schema.$ref) === true) {
      return wrap(ref(schema, rootName), schema)
    }
    if (schema.type === 'array' && Boolean(schema.items?.$ref)) {
      if (schema.items?.$ref) {
        return `Type.Array(${wrap(ref(schema.items, rootName), schema.items)})`
      }
      return wrap('Type.Array(Type.Any())', schema)
    }
    return wrap('Type.Any()', schema)
  }
  // combinators
  if (schema.oneOf) {
    if (!schema.oneOf?.length) return wrap('Type.Any()', schema)
    const schemas = schema.oneOf.map((s: JSONSchema) => typebox(s, rootName, isTypebox))
    return wrap(`Type.Union([${schemas.join(',')}])`, schema)
  }
  if (schema.anyOf) {
    if (!schema.anyOf?.length) return wrap('Type.Any()', schema)
    const schemas = schema.anyOf.map((s: JSONSchema) => typebox(s, rootName, isTypebox))
    return wrap(`Type.Union([${schemas.join(',')}])`, schema)
  }
  if (schema.allOf) {
    return allOf(schema, rootName, isTypebox)
  }
  // const
  if (schema.const) {
    return wrap(`Type.Literal(${JSON.stringify(schema.const)})`, schema)
  }
  // enum
  if (schema.enum) return wrap(_enum(schema), schema)
  // properties
  if (schema.properties) return wrap(object(schema, rootName, isTypebox, typebox), schema)

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return wrap(string(schema), schema)
  if (types.includes('number')) return wrap(number(schema), schema)
  if (types.includes('integer')) return wrap(integer(schema), schema)
  if (types.includes('boolean')) return wrap('Type.Boolean()', schema)
  if (types.includes('array')) return wrap(array(schema, rootName, isTypebox), schema)
  if (types.includes('object')) return wrap(object(schema, rootName, isTypebox, typebox), schema)
  if (types.includes('date')) return wrap('Type.Date()', schema)
  if (types.length === 1 && types[0] === 'null') return wrap('Type.Null()', schema)

  return wrap('Type.Any()', schema)
}

function allOf(schema: JSONSchema, rootName: string, isTypebox: boolean): string {
  if (!schema.allOf?.length) return wrap('Type.Any()', schema)

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
    .map((s) => typebox(s, rootName, isTypebox))

  if (!schemas.length) return wrap('Type.Any()', { ...schema, nullable })

  const baseResult = schemas.length === 1 ? schemas[0] : `Type.Intersect([${schemas.join(',')}])`

  if (defaultValue !== undefined) {
    const formatLiteral = (v: unknown): string =>
      typeof v === 'number' ? `${v}` : JSON.stringify(v)
    const withDefault = `Type.Optional(${baseResult},{default:${formatLiteral(defaultValue)}})`
    return nullable ? `Type.Union([${withDefault},Type.Null()])` : withDefault
  }

  return wrap(baseResult, { ...schema, nullable })
}

function array(schema: JSONSchema, rootName: string, isTypebox: boolean = false): string {
  const items = schema.items ? typebox(schema.items, rootName, isTypebox) : 'Type.Any()'

  const isFixedLength =
    typeof schema.minItems === 'number' &&
    typeof schema.maxItems === 'number' &&
    schema.minItems === schema.maxItems

  const opts = [
    isFixedLength ? `minItems:${schema.minItems}` : undefined,
    isFixedLength ? `maxItems:${schema.maxItems}` : undefined,
    !isFixedLength && typeof schema.minItems === 'number'
      ? `minItems:${schema.minItems}`
      : undefined,
    !isFixedLength && typeof schema.maxItems === 'number'
      ? `maxItems:${schema.maxItems}`
      : undefined,
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.Array(${items},{${opts.join(',')}})`
  }
  return `Type.Array(${items})`
}

export function wrap(typeboxStr: string, schema: JSONSchema): string {
  const formatLiteral = (v: unknown): string => {
    if (typeof v === 'boolean') return `${v}`
    if (typeof v === 'number') return `${v}`
    if (typeof v === 'string') return JSON.stringify(v)
    return JSON.stringify(v)
  }

  const withDefault =
    schema.default !== undefined
      ? `Type.Optional(${typeboxStr},{default:${formatLiteral(schema.default)}})`
      : typeboxStr

  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')

  return isNullable ? `Type.Union([${withDefault},Type.Null()])` : withDefault
}

function ref(schema: JSONSchema, rootName: string): string {
  if (schema.$ref === '#' || schema.$ref === '') {
    return wrap(`Type.Recursive((_Self) => ${rootName})`, schema)
  }

  const TABLE = [
    ['#/components/schemas/', 'Schema'],
    ['#/definitions/', 'Schema'],
    ['#/$defs/', 'Schema'],
  ] as const

  for (const [prefix] of TABLE) {
    if (schema.$ref?.startsWith(prefix)) {
      const pascalCaseName = toPascalCase(schema.$ref.slice(prefix.length))
      return wrap(pascalCaseName, schema)
    }
  }

  if (schema.$ref?.startsWith('#')) {
    const refName = schema.$ref.slice(1)
    if (refName === '') return rootName
    return toPascalCase(refName)
  }

  if (schema.$ref?.includes('#')) return 'Type.Unknown()'
  if (schema.$ref?.startsWith('http')) {
    const parts = schema.$ref?.split('/')
    const last = parts?.[parts.length - 1]
    if (last) return last.replace(/\.json$/, '')
  }

  return 'Type.Any()'
}
