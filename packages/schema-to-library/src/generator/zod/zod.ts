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

/**
 * Generate Zod schema code from JSON Schema
 *
 * @param schema - JSON Schema object to convert
 * @param rootName - Root schema name for reference resolution
 * @param isZod - Whether this is called from zod function
 * @param options - Generator options
 * @returns Generated Zod schema code string
 * @example
 * ```ts
 * zod({ type: 'string' }, 'MySchema') // 'z.string()'
 * ```
 */
export function zod(
  schema: JSONSchema,
  rootName: string = 'Schema',
  isZod: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  const ro = (s: string): string => (options?.readonly ? `${s}.readonly()` : s)

  // $ref
  if (schema.$ref) {
    if (Boolean(schema.$ref) === true) {
      return wrap(ref(schema, rootName, isZod, options), schema)
    }
    if (schema.type === 'array' && Boolean(schema.items?.$ref)) {
      if (schema.items?.$ref) {
        return `z.array(${wrap(ref(schema.items, rootName, isZod, options), schema.items)})`
      }
      return wrap('z.array(z.any())', schema)
    }
    return wrap('z.any()', schema)
  }
  // combinators
  if (schema.oneOf) {
    if (!schema.oneOf?.length) return wrap('z.any()', schema)
    const schemas = schema.oneOf.map((s: JSONSchema) => zod(s, rootName, isZod, options))
    return wrap(`z.union([${schemas.join(',')}])`, schema)
  }
  if (schema.anyOf) {
    if (!schema.anyOf?.length) return wrap('z.any()', schema)
    const schemas = schema.anyOf.map((s: JSONSchema) => zod(s, rootName, isZod, options))
    return wrap(`z.union([${schemas.join(',')}])`, schema)
  }
  if (schema.allOf) {
    return allOf(schema, rootName, isZod, options)
  }
  // not
  if (schema.not) {
    return wrap('z.any()', schema)
  }
  // const
  if (schema.const) {
    return wrap(`z.literal(${JSON.stringify(schema.const)})`, schema)
  }
  // enum
  if (schema.enum) return wrap(_enum(schema), schema)
  // properties
  if (schema.properties) return ro(wrap(object(schema, rootName, isZod, zod, options), schema))

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return wrap(string(schema), schema)
  if (types.includes('number')) return wrap(number(schema), schema)
  if (types.includes('integer')) return wrap(integer(schema), schema)
  if (types.includes('boolean')) return wrap('z.boolean()', schema)
  if (types.includes('array')) return ro(wrap(array(schema, rootName, isZod, options), schema))
  if (types.includes('object'))
    return ro(wrap(object(schema, rootName, isZod, zod, options), schema))
  if (types.includes('date')) return wrap('z.date()', schema)
  if (types.length === 1 && types[0] === 'null') return wrap('z.null()', schema)

  return wrap('z.any()', schema)
}

/**
 * Handle allOf combinator
 */
function allOf(
  schema: JSONSchema,
  rootName: string,
  isZod: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  if (!schema.allOf?.length) return wrap('z.any()', schema)

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
    .map((s) => zod(s, rootName, isZod, options))

  if (!schemas.length) return wrap('z.any()', { ...schema, nullable })

  const baseResult = schemas.length === 1 ? schemas[0] : `z.intersection(${schemas.join(',')})`

  if (defaultValue !== undefined) {
    const formatLiteral = (v: unknown): string =>
      typeof v === 'number' ? `${v}` : JSON.stringify(v)
    return wrap(`${baseResult}.default(${formatLiteral(defaultValue)})`, { ...schema, nullable })
  }

  return wrap(baseResult, { ...schema, nullable })
}

/**
 * Generate Zod array schema from JSON Schema
 */
function array(
  schema: JSONSchema,
  rootName: string,
  isZod: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  const base = `z.array(${schema.items ? zod(schema.items, rootName, isZod, options) : 'z.any()'})`

  if (typeof schema.minItems === 'number' && typeof schema.maxItems === 'number') {
    if (schema.minItems === schema.maxItems) return `${base}.length(${schema.minItems})`
    return `${base}.min(${schema.minItems}).max(${schema.maxItems})`
  }
  if (typeof schema.minItems === 'number') return `${base}.min(${schema.minItems})`
  if (typeof schema.maxItems === 'number') return `${base}.max(${schema.maxItems})`
  return base
}

/**
 * Wrap Zod schema with default value and nullable modifiers
 */
export function wrap(zodStr: string, schema: JSONSchema): string {
  const formatLiteral = (v: unknown): string => {
    if (typeof v === 'boolean') return `${v}`
    if (typeof v === 'number') {
      if (schema.format === 'int64') return `${v}n`
      if (schema.format === 'bigint') return `BigInt(${v})`
      return `${v}`
    }
    if (schema.type === 'date' && typeof v === 'string') return `new Date(${JSON.stringify(v)})`
    if (typeof v === 'string') return JSON.stringify(v)
    return JSON.stringify(v)
  }

  const withDefault =
    schema.default !== undefined ? `${zodStr}.default(${formatLiteral(schema.default)})` : zodStr

  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')

  const withNullable = isNullable ? `${withDefault}.nullable()` : withDefault
  return schema['x-brand'] ? `${withNullable}.brand<"${schema['x-brand']}">()` : withNullable
}

/**
 * Generate Zod reference schema from JSON Schema $ref
 */
function ref(
  schema: JSONSchema,
  rootName: string,
  isZod: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  // self reference (#)
  if (schema.$ref === '#' || schema.$ref === '') {
    return wrap(`z.lazy(() => ${rootName})`, schema)
  }

  // OpenAPI component-aware resolution
  if (options?.openapi && schema.$ref) {
    const resolved = resolveOpenAPIRef(schema.$ref)
    if (resolved) {
      if (resolved === rootName) {
        return wrap(`z.lazy(() => ${resolved})`, schema)
      }
      return wrap(isZod ? `z.lazy(() => ${resolved})` : resolved, schema)
    }
  }

  // components / definitions / $defs
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
        return wrap(`z.lazy(() => ${pascalCaseName})`, schema)
      }
      const z = isZod
        ? `z.lazy(() => ${pascalCaseName})`
        : rootName === 'Schema'
          ? `${pascalCaseName}Schema`
          : `z.lazy(() => ${pascalCaseName})`
      return wrap(z, schema)
    }
  }

  // relative reference (#~)
  if (schema.$ref?.startsWith('#')) {
    const refName = schema.$ref.slice(1)
    if (refName === '') return `z.lazy(() => ${rootName})`
    const pascalCaseName = toName(refName)
    return isZod
      ? `z.lazy(() => ${pascalCaseName})`
      : rootName === 'Schema'
        ? `${pascalCaseName}Schema`
        : `z.lazy(() => ${pascalCaseName})`
  }

  // external file with fragment
  if (schema.$ref?.includes('#')) return 'z.unknown()'

  // external file or URL without fragment
  if (schema.$ref?.startsWith('http')) {
    const parts = schema.$ref?.split('/')
    const last = parts?.[parts.length - 1]
    if (last) return last.replace(/\.json$/, '')
  }

  return 'z.any()'
}
