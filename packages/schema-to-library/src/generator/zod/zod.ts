import { zodWrap } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import {
  normalizeTypes,
  resolveOpenAPIRef,
  toIdentifierPascalCase,
  toPascalCase,
  zodError,
} from '../../utils/index.js'
import { _enum } from './enum.js'
import { integer } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

/**
 * Generate Zod schema code from JSON Schema.
 *
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
  const readonly = (v: string) => (options?.readonly ? `${v}.readonly()` : v)
  const ref = (s: JSONSchema, rn: string, iz: boolean): string => {
    if (s.$ref === '#' || s.$ref === '') {
      return zodWrap(`z.lazy(() => ${rn})`, s)
    }
    if (options?.openapi && s.$ref) {
      const resolved = resolveOpenAPIRef(s.$ref)
      if (resolved) {
        if (resolved === rn) return zodWrap(`z.lazy(() => ${resolved})`, s)
        return zodWrap(iz ? `z.lazy(() => ${resolved})` : resolved, s)
      }
    }
    const toName = options?.openapi ? toIdentifierPascalCase : toPascalCase
    const REF_PREFIXES = ['#/components/schemas/', '#/definitions/', '#/$defs/'] as const
    for (const prefix of REF_PREFIXES) {
      if (s.$ref?.startsWith(prefix)) {
        const pascalCaseName = toName(s.$ref.slice(prefix.length))
        if (pascalCaseName === rn) return zodWrap(`z.lazy(() => ${pascalCaseName})`, s)
        const refExpr = iz
          ? `z.lazy(() => ${pascalCaseName})`
          : rn === 'Schema'
            ? `${pascalCaseName}Schema`
            : `z.lazy(() => ${pascalCaseName})`
        return zodWrap(refExpr, s)
      }
    }
    if (s.$ref?.startsWith('#')) {
      const refName = s.$ref.slice(1)
      if (refName === '') return `z.lazy(() => ${rn})`
      const pascalCaseName = toName(refName)
      return iz
        ? `z.lazy(() => ${pascalCaseName})`
        : rn === 'Schema'
          ? `${pascalCaseName}Schema`
          : `z.lazy(() => ${pascalCaseName})`
    }
    if (s.$ref?.includes('#')) return 'z.unknown()'
    if (s.$ref?.startsWith('http')) {
      const last = s.$ref.split('/').at(-1)
      if (last) return last.replace(/\.json$/, '')
    }
    return 'z.any()'
  }

  if (schema.$ref) {
    if (schema.type === 'array' && schema.items?.$ref) {
      return `z.array(${zodWrap(ref(schema.items, rootName, isZod), schema.items)})`
    }
    return zodWrap(ref(schema, rootName, isZod), schema)
  }

  if (schema.oneOf) {
    if (!schema.oneOf.length) return zodWrap('z.any()', schema)
    const schemas = schema.oneOf.map((s) => zod(s, rootName, isZod, options))
    const oneOfMessage = schema['x-oneOf-message']
    const errorPart = oneOfMessage ? `,${zodError(oneOfMessage)}` : ''
    const discriminator = schema.discriminator?.propertyName
    // ZodIntersection (from allOf) is not compatible with discriminatedUnion, so
    // fall back to xor when oneOf contains a $ref or allOf member.
    const hasRefOrAllOf = schema.oneOf.some((s) => s.$ref !== undefined || s.allOf !== undefined)
    const z =
      discriminator && !hasRefOrAllOf
        ? `z.discriminatedUnion('${discriminator}',[${schemas.join(',')}]${errorPart})`
        : `z.xor([${schemas.join(',')}]${errorPart})`
    return zodWrap(z, schema)
  }

  if (schema.anyOf) {
    if (!schema.anyOf.length) return zodWrap('z.any()', schema)
    const schemas = schema.anyOf.map((s) => zod(s, rootName, isZod, options))
    const anyOfMessage = schema['x-anyOf-message']
    const errorPart = anyOfMessage ? `,${zodError(anyOfMessage)}` : ''
    return zodWrap(`z.union([${schemas.join(',')}]${errorPart})`, schema)
  }

  if (schema.allOf) {
    if (!schema.allOf.length) return zodWrap('z.any()', schema)
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
    if (!schemas.length) return zodWrap('z.any()', { ...schema, nullable })
    const baseResult = schemas.length === 1 ? schemas[0] : `z.intersection(${schemas.join(',')})`
    const merged = { ...schema, nullable }
    if (defaultValue !== undefined) {
      const formatLiteral = (value: unknown): string => {
        if (typeof value === 'boolean') return `${value}`
        if (typeof value === 'number') {
          if (merged.format === 'int64') return `${value}n`
          if (merged.format === 'bigint') return `BigInt(${value})`
          return `${value}`
        }
        if (merged.type === 'date' && typeof value === 'string')
          return `new Date(${JSON.stringify(value)})`
        return JSON.stringify(value)
      }
      return zodWrap(`${baseResult}.default(${formatLiteral(defaultValue)})`, merged)
    }
    return zodWrap(baseResult, merged)
  }

  if (schema.not) {
    const notMessage = schema['x-not-message']
    const errorPart = notMessage ? `,${zodError(notMessage)}` : ''
    const refine = (predicate: string) =>
      zodWrap(`z.any().refine(${predicate}${errorPart})`, schema)
    const inner = schema.not
    const typePredicates: { readonly [k: string]: string } = {
      string: `(v) => typeof v !== 'string'`,
      number: `(v) => typeof v !== 'number'`,
      integer: `(v) => typeof v !== 'number' || !Number.isInteger(v)`,
      boolean: `(v) => typeof v !== 'boolean'`,
      array: '(v) => !Array.isArray(v)',
      object: `(v) => typeof v !== 'object' || v === null || Array.isArray(v)`,
      null: '(v) => v !== null',
    }
    if (typeof inner !== 'object' || inner === null) return zodWrap('z.any()', schema)
    if (inner.$ref) return refine(`(v) => !${ref(inner, '', false)}.safeParse(v).success`)
    if ('const' in inner) return refine(`(v) => v !== ${JSON.stringify(inner.const)}`)
    if (typeof inner.type === 'string') {
      const predicate = typePredicates[inner.type]
      if (predicate) return refine(predicate)
    }
    if (Array.isArray(inner.type)) {
      const bodies = inner.type
        .map((t) => typePredicates[t])
        .filter((p) => p !== undefined)
        .map((p) => `(${p.replace(/^\(v\) => /, '')})`)
      if (bodies.length > 0) return refine(`(v) => ${bodies.join(' && ')}`)
    }
    if (Array.isArray(inner.enum)) {
      return refine(`(v) => !${JSON.stringify(inner.enum)}.includes(v)`)
    }
    if (inner.oneOf || inner.anyOf || inner.allOf) {
      return refine(`(v) => !${zod(inner)}.safeParse(v).success`)
    }
    return zodWrap('z.any()', schema)
  }

  if (schema.const !== undefined) {
    const value = schema.const
    const isPrimitive =
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    const errorMessage = schema['x-error-message']
    const errorPart = errorMessage ? `,${zodError(errorMessage)}` : ''
    return zodWrap(
      isPrimitive
        ? `z.literal(${JSON.stringify(value)}${errorPart})`
        : `z.custom<${JSON.stringify(value)}>()`,
      schema,
    )
  }
  if (schema.enum) return zodWrap(_enum(schema), schema)
  if (schema.properties)
    return readonly(zodWrap(object(schema, rootName, isZod, options), schema))

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return zodWrap(string(schema), schema)
  if (types.includes('number')) return zodWrap(number(schema), schema)
  if (types.includes('integer')) return zodWrap(integer(schema), schema)
  if (types.includes('boolean')) {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    return zodWrap(`z.boolean(${errorArg})`, schema)
  }

  if (types.includes('array')) {
    const errorMessage = schema['x-error-message']
    const baseError = errorMessage ? `,${zodError(errorMessage)}` : ''
    const sizeMessage = schema['x-size-message']
    const sizeError = sizeMessage ? `,${zodError(sizeMessage)}` : ''
    const minimumMessage = schema['x-minimum-message']
    const minError = minimumMessage ? `,${zodError(minimumMessage)}` : ''
    const maximumMessage = schema['x-maximum-message']
    const maxError = maximumMessage ? `,${zodError(maximumMessage)}` : ''
    const patternMessage = schema['x-pattern-message']
    const patternError = patternMessage ? `,${zodError(patternMessage)}` : ''
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => zod(s, rootName, isZod, options))
      return readonly(zodWrap(`z.tuple([${items.join(',')}]${baseError})`, schema))
    }
    const itemSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items
    const item = itemSchema ? zod(itemSchema, rootName, isZod, options) : 'z.any()'
    const base = `z.array(${item}${baseError})`
    const unique =
      schema.uniqueItems === true
        ? `.refine((items)=>new Set(items).size===items.length${patternError})`
        : ''
    const { minItems, maxItems } = schema
    const arrayExpr =
      typeof minItems === 'number' && typeof maxItems === 'number'
        ? minItems === maxItems
          ? `${base}.length(${minItems}${sizeError})${unique}`
          : `${base}.min(${minItems}${minError}).max(${maxItems}${maxError})${unique}`
        : typeof minItems === 'number'
          ? `${base}.min(${minItems}${minError})${unique}`
          : typeof maxItems === 'number'
            ? `${base}.max(${maxItems}${maxError})${unique}`
            : `${base}${unique}`
    return readonly(zodWrap(arrayExpr, schema))
  }

  if (types.includes('object'))
    return readonly(zodWrap(object(schema, rootName, isZod, options), schema))
  if (types.includes('date')) {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    return zodWrap(`z.date(${errorArg})`, schema)
  }
  if (types.length === 1 && types[0] === 'null') {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    return zodWrap(`z.null(${errorArg})`, schema)
  }

  return zodWrap('z.any()', schema)
}
