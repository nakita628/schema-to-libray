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
    const intersected = schemas.length === 1 ? schemas[0] : `z.intersection(${schemas.join(',')})`
    const allOfMessage = schema['x-allOf-message']
    const baseResult = allOfMessage
      ? (() => {
          const isArrow = /^\s*\(.*?\)\s*=>/.test(allOfMessage)
          const msgExpr = isArrow ? `(${allOfMessage})(issue)` : JSON.stringify(allOfMessage)
          // Issue code order follows Zod v4's official source declaration order
          // (zod/v4/core/errors.d.ts).
          const codes = [
            'invalid_type',
            'too_big',
            'too_small',
            'invalid_format',
            'not_multiple_of',
            'unrecognized_keys',
            'invalid_union',
            'invalid_key',
            'invalid_element',
            'invalid_value',
            'custom',
          ] as const
          const branches = codes
            .map(
              (c, i) =>
                `${i === 0 ? '' : 'else '}if(issue.code==='${c}'){ctx.issues.push({...issue,input:issue.input,message:${msgExpr}})}`,
            )
            .join('')
          return `(()=>{const Schema=${intersected};return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){${branches}}}}).pipe(Schema)})()`
        })()
      : intersected
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
      string: `(val) => typeof val !== 'string'`,
      number: `(val) => typeof val !== 'number'`,
      integer: `(val) => typeof val !== 'number' || !Number.isInteger(val)`,
      boolean: `(val) => typeof val !== 'boolean'`,
      array: '(val) => !Array.isArray(val)',
      object: `(val) => typeof val !== 'object' || val === null || Array.isArray(val)`,
      null: '(val) => val !== null',
    }
    if (typeof inner !== 'object' || inner === null) return zodWrap('z.any()', schema)
    if (inner.$ref) return refine(`(val) => !${ref(inner, '', false)}.safeParse(val).success`)
    if ('const' in inner) return refine(`(val) => val !== ${JSON.stringify(inner.const)}`)
    if (typeof inner.type === 'string') {
      const predicate = typePredicates[inner.type]
      if (predicate) return refine(predicate)
    }
    if (Array.isArray(inner.type)) {
      const bodies = inner.type
        .map((t) => typePredicates[t])
        .filter((p) => p !== undefined)
        .map((p) => `(${p.replace(/^\(val\) => /, '')})`)
      if (bodies.length > 0) return refine(`(val) => ${bodies.join(' && ')}`)
    }
    if (Array.isArray(inner.enum)) {
      return refine(`(val) => !${JSON.stringify(inner.enum)}.includes(val)`)
    }
    if (inner.oneOf || inner.anyOf || inner.allOf) {
      return refine(`(val) => !${zod(inner)}.safeParse(val).success`)
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
    // v3.0: x-const-message overrides x-error-message for `const` mismatch.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    const errorPart = constMessage ? `,${zodError(constMessage)}` : ''
    return zodWrap(
      isPrimitive
        ? `z.literal(${JSON.stringify(value)}${errorPart})`
        : `z.custom<${JSON.stringify(value)}>()`,
      schema,
    )
  }
  if (schema.enum) return zodWrap(_enum(schema), schema)
  if (schema.properties) return readonly(zodWrap(object(schema, rootName, isZod, options), schema))

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return zodWrap(string(schema), schema)
  if (types.includes('number')) return zodWrap(number(schema), schema)
  if (types.includes('integer')) return zodWrap(integer(schema), schema)
  if (types.includes('boolean')) {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    const coercePrefix = schema['x-coerce'] === true ? 'coerce.' : ''
    return zodWrap(`z.${coercePrefix}boolean(${errorArg})`, schema)
  }

  if (types.includes('array')) {
    const errorMessage = schema['x-error-message']
    const baseError = errorMessage ? `,${zodError(errorMessage)}` : ''
    const minItemsMessage = schema['x-minItems-message']
    const minError = minItemsMessage ? `,${zodError(minItemsMessage)}` : ''
    const maxItemsMessage = schema['x-maxItems-message']
    const maxError = maxItemsMessage ? `,${zodError(maxItemsMessage)}` : ''
    const fixedItemsMessage = minItemsMessage ?? maxItemsMessage
    const fixedItemsError = fixedItemsMessage ? `,${zodError(fixedItemsMessage)}` : ''
    const uniqueMessage = schema['x-uniqueItems-message']
    const uniqueError = uniqueMessage ? `,${zodError(uniqueMessage)}` : ''
    const elementMessageWrap = (inner: string, msg: string) => {
      const isArrow = /^\s*\(.*?\)\s*=>/.test(msg)
      const msgExpr = isArrow ? `(${msg})(issue)` : JSON.stringify(msg)
      return `(()=>{const Schema=${inner};return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){if(issue.path.length>0){ctx.issues.push({...issue,message:${msgExpr}})}else{ctx.issues.push(issue)}}}}).pipe(Schema)})()`
    }
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => zod(s, rootName, isZod, options))
      const tupleExpr = `z.tuple([${items.join(',')}]${baseError})`
      const prefixMsg = schema['x-prefixItems-message']
      const wrapped = prefixMsg ? elementMessageWrap(tupleExpr, prefixMsg) : tupleExpr
      return readonly(zodWrap(wrapped, schema))
    }
    const itemSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items
    const item = itemSchema ? zod(itemSchema, rootName, isZod, options) : 'z.any()'
    const itemsMsg = schema['x-items-message']
    const arrayBase = `z.array(${item}${baseError})`
    const base = itemsMsg ? elementMessageWrap(arrayBase, itemsMsg) : arrayBase
    const unique =
      schema.uniqueItems === true
        ? `.refine((items)=>new Set(items).size===items.length${uniqueError})`
        : ''
    // v3.0: contains / minContains / maxContains as separate refines for
    // independent error messages (silent-bug fix).
    const containsChain = (() => {
      const c = schema.contains
      if (!c) return ''
      const containsZod = zod(c, rootName, isZod, options)
      const minC = schema.minContains
      const maxC = schema.maxContains
      const fallback = schema['x-contains-message'] ?? errorMessage
      const parts: string[] = []
      if (minC === undefined && maxC === undefined) {
        const msg = fallback ? `,${zodError(fallback)}` : ''
        parts.push(
          `.refine((arr)=>{const Schema=${containsZod};return arr.some((i)=>Schema.safeParse(i).success)}${msg})`,
        )
      } else {
        const effectiveMin = minC ?? 1
        if (effectiveMin > 0) {
          const minMsg = schema['x-minContains-message'] ?? fallback
          const minMsgArg = minMsg ? `,${zodError(minMsg)}` : ''
          parts.push(
            `.refine((arr)=>{const Schema=${containsZod};return arr.filter((i)=>Schema.safeParse(i).success).length>=${effectiveMin}}${minMsgArg})`,
          )
        }
        if (maxC !== undefined) {
          const maxMsg = schema['x-maxContains-message'] ?? fallback
          const maxMsgArg = maxMsg ? `,${zodError(maxMsg)}` : ''
          parts.push(
            `.refine((arr)=>{const Schema=${containsZod};return arr.filter((i)=>Schema.safeParse(i).success).length<=${maxC}}${maxMsgArg})`,
          )
        }
      }
      return parts.join('')
    })()
    const { minItems, maxItems } = schema
    const arrayExpr =
      typeof minItems === 'number' && typeof maxItems === 'number'
        ? minItems === maxItems
          ? `${base}.length(${minItems}${fixedItemsError})${unique}${containsChain}`
          : `${base}.min(${minItems}${minError}).max(${maxItems}${maxError})${unique}${containsChain}`
        : typeof minItems === 'number'
          ? `${base}.min(${minItems}${minError})${unique}${containsChain}`
          : typeof maxItems === 'number'
            ? `${base}.max(${maxItems}${maxError})${unique}${containsChain}`
            : `${base}${unique}${containsChain}`
    return readonly(zodWrap(arrayExpr, schema))
  }

  if (types.includes('object'))
    return readonly(zodWrap(object(schema, rootName, isZod, options), schema))
  if (types.includes('date')) {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    const coercePrefix = schema['x-coerce'] === true ? 'coerce.' : ''
    return zodWrap(`z.${coercePrefix}date(${errorArg})`, schema)
  }
  if (types.length === 1 && types[0] === 'null') {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    return zodWrap(`z.null(${errorArg})`, schema)
  }

  return zodWrap('z.any()', schema)
}
