import type { JSONSchema } from '../../types/index.js'
import { normalizeTypes, toPascalCase } from '../../utils/index.js'
import { _enum } from './enum.js'
import { integer } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

export function valibot(
  schema: JSONSchema,
  rootName: string = 'Schema',
  isValibot: boolean = false,
): string {
  // $ref
  if (schema.$ref) {
    if (Boolean(schema.$ref) === true) {
      return wrap(ref(schema, rootName, isValibot), schema)
    }
    if (schema.type === 'array' && Boolean(schema.items?.$ref)) {
      if (schema.items?.$ref) {
        return `v.array(${wrap(ref(schema.items, rootName, isValibot), schema.items)})`
      }
      return wrap('v.array(v.any())', schema)
    }
    return wrap('v.any()', schema)
  }
  // combinators
  if (schema.oneOf) {
    if (!schema.oneOf?.length) return wrap('v.any()', schema)
    const schemas = schema.oneOf.map((s: JSONSchema) => valibot(s, rootName, isValibot))
    return wrap(`v.union([${schemas.join(',')}])`, schema)
  }
  if (schema.anyOf) {
    if (!schema.anyOf?.length) return wrap('v.any()', schema)
    const schemas = schema.anyOf.map((s: JSONSchema) => valibot(s, rootName, isValibot))
    return wrap(`v.union([${schemas.join(',')}])`, schema)
  }
  if (schema.allOf) {
    return allOf(schema, rootName, isValibot)
  }
  // const
  if (schema.const) {
    return wrap(`v.literal(${JSON.stringify(schema.const)})`, schema)
  }
  // enum
  if (schema.enum) return wrap(_enum(schema), schema)
  // properties
  if (schema.properties) return wrap(object(schema, rootName, isValibot, valibot), schema)

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return wrap(string(schema), schema)
  if (types.includes('number')) return wrap(number(schema), schema)
  if (types.includes('integer')) return wrap(integer(schema), schema)
  if (types.includes('boolean')) return wrap('v.boolean()', schema)
  if (types.includes('array')) return wrap(array(schema, rootName, isValibot), schema)
  if (types.includes('object')) return wrap(object(schema, rootName, isValibot, valibot), schema)
  if (types.includes('date')) return wrap('v.date()', schema)
  if (types.length === 1 && types[0] === 'null') return wrap('v.null()', schema)

  console.warn(`fallback to v.any(): schema=${JSON.stringify(schema)}`)
  return wrap('v.any()', schema)
}

function allOf(schema: JSONSchema, rootName: string, isValibot: boolean): string {
  if (!schema.allOf?.length) return wrap('v.any()', schema)

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
    .map((s) => valibot(s, rootName, isValibot))

  if (!schemas.length) return wrap('v.any()', { ...schema, nullable })

  const baseResult = schemas.length === 1 ? schemas[0] : `v.intersect([${schemas.join(',')}])`

  if (defaultValue !== undefined) {
    const formatLiteral = (v: unknown): string =>
      typeof v === 'number' ? `${v}` : JSON.stringify(v)
    const withDefault = `v.optional(${baseResult},${formatLiteral(defaultValue)})`
    return nullable ? `v.nullable(${withDefault})` : withDefault
  }

  return wrap(baseResult, { ...schema, nullable })
}

function array(schema: JSONSchema, rootName: string, isValibot: boolean = false): string {
  const items = schema.items ? valibot(schema.items, rootName, isValibot) : 'v.any()'
  const base = `v.array(${items})`

  const isFixedLength =
    typeof schema.minItems === 'number' &&
    typeof schema.maxItems === 'number' &&
    schema.minItems === schema.maxItems

  const actions = [
    isFixedLength ? `v.length(${schema.minItems})` : undefined,
    !isFixedLength && typeof schema.minItems === 'number'
      ? `v.minLength(${schema.minItems})`
      : undefined,
    !isFixedLength && typeof schema.maxItems === 'number'
      ? `v.maxLength(${schema.maxItems})`
      : undefined,
  ].filter((v) => v !== undefined)

  if (actions.length > 0) return `v.pipe(${base},${actions.join(',')})`
  return base
}

export function wrap(valibotStr: string, schema: JSONSchema): string {
  const formatLiteral = (v: unknown): string => {
    if (typeof v === 'boolean') return `${v}`
    if (typeof v === 'number') return `${v}`
    if (typeof v === 'string') return JSON.stringify(v)
    return JSON.stringify(v)
  }

  const withDefault =
    schema.default !== undefined
      ? `v.optional(${valibotStr},${formatLiteral(schema.default)})`
      : valibotStr

  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')

  return isNullable ? `v.nullable(${withDefault})` : withDefault
}

function ref(schema: JSONSchema, rootName: string, isValibot: boolean = false): string {
  if (schema.$ref === '#' || schema.$ref === '') {
    return wrap(`v.lazy(() => ${rootName})`, schema)
  }

  const TABLE = [
    ['#/components/schemas/', 'Schema'],
    ['#/definitions/', 'Schema'],
    ['#/$defs/', 'Schema'],
  ] as const

  for (const [prefix] of TABLE) {
    if (schema.$ref?.startsWith(prefix)) {
      const pascalCaseName = toPascalCase(schema.$ref.slice(prefix.length))
      if (pascalCaseName === rootName) {
        return wrap(`v.lazy(() => ${pascalCaseName})`, schema)
      }
      const v = isValibot
        ? `v.lazy(() => ${pascalCaseName})`
        : rootName === 'Schema'
          ? `${pascalCaseName}Schema`
          : `v.lazy(() => ${pascalCaseName})`
      return wrap(v, schema)
    }
  }

  if (schema.$ref?.startsWith('#')) {
    const refName = schema.$ref.slice(1)
    if (refName === '') return `v.lazy(() => ${rootName})`
    const pascalCaseName = toPascalCase(refName)
    return isValibot
      ? `v.lazy(() => ${pascalCaseName})`
      : rootName === 'Schema'
        ? `${pascalCaseName}Schema`
        : `v.lazy(() => ${pascalCaseName})`
  }

  if (schema.$ref?.includes('#')) return 'v.unknown()'
  if (schema.$ref?.startsWith('http')) {
    const parts = schema.$ref?.split('/')
    const last = parts?.[parts.length - 1]
    if (last) return last.replace(/\.json$/, '')
  }

  return 'v.any()'
}
