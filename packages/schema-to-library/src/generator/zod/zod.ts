import { DEFAULT_ROOT_NAME, DEFINITION_REF_PREFIXES } from '../../constants/index.js'
import {
  canBeNull,
  canBeString,
  hasCombinator,
  hasNumericKeyword,
  hasStringKeyword,
  isDeepLocalPointer,
  isDefaultOnlyMember,
  isNullable,
  isNullTypeMember,
  isPrimitive,
  isRootRef,
  isSchemaObject,
  isShapelessMember,
  isStringWireLocation,
} from '../../guard/index.js'
import { itemsSchemaOf, schemaNamer, zodWrap as _zodWrap } from '../../helper/index.js'
import type { CodeExtensionOptions, EmitOptions } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import {
  issueMessageExpression,
  normalizeTypes,
  resolveOpenAPIRef,
  zodError,
} from '../../utils/index.js'
import { _enum } from './enum.js'
import { int64Input, integer, isInt64 } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { parameter, hasParameterSerialization, withoutParameterSerialization } from './parameter.js'
import { string } from './string.js'

/**
 * Zod v4 issue codes, in the order `zod/v4/core/errors.d.ts` declares them. The
 * `x-allOf-message` wrapper matches each in turn and replaces its message.
 */
const ZOD_ISSUE_CODES = [
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

/**
 * The `not` predicates by `type`, as the source of a `(val) => ...` arrow. `val` is the
 * parameter name every predicate shares, so their bodies can be joined with `&&`.
 */
const NOT_TYPE_PREDICATES: { readonly [k: string]: string } = {
  string: `(val) => typeof val !== 'string'`,
  number: `(val) => typeof val !== 'number'`,
  integer: `(val) => typeof val !== 'number' || !Number.isInteger(val)`,
  boolean: `(val) => typeof val !== 'boolean'`,
  array: '(val) => !Array.isArray(val)',
  object: `(val) => typeof val !== 'object' || val === null || Array.isArray(val)`,
  null: '(val) => val !== null',
}

/** A wire array sent once arrives as its one element: wrapped, it is an array of one. */
const WIRE_ARRAY_PREPROCESS = '(val)=>(val===undefined||Array.isArray(val)?val:[val])'

/** The text `null` on the wire, read as the `null` a nullable non-string schema takes. */
const WIRE_NULL_PREPROCESS = `(val)=>(val==='null'?null:val)`

/** The `type` values a value on the wire is coerced to, in the order a union tries them. */
const WIRE_PRIMITIVE_ORDER = ['integer', 'number', 'boolean', 'string'] as const

/**
 * The `not` predicate of an inner schema, as the source of a `(val) => ...` arrow, or
 * `undefined` when the inner schema has none this generator can express.
 */
function notPredicate(inner: JSONSchema): string | undefined {
  if (inner.$ref) return undefined
  if ('const' in inner) return `(val) => val !== ${JSON.stringify(inner.const)}`
  if (typeof inner.type === 'string') return NOT_TYPE_PREDICATES[inner.type]
  if (Array.isArray(inner.type)) {
    const bodies = normalizeTypes(inner.type)
      .map((t) => NOT_TYPE_PREDICATES[t])
      .filter((p) => p !== undefined)
      .map((p) => `(${p.replace(/^\(val\) => /u, '')})`)
    if (bodies.length > 0) return `(val) => ${bodies.join(' && ')}`
  }
  if (Array.isArray(inner.enum)) return `(val) => !${JSON.stringify(inner.enum)}.includes(val)`
  if (inner.oneOf || inner.anyOf || inner.allOf) {
    return `(val) => !${zod(inner)}.safeParse(val).success`
  }
  return undefined
}

function elementMessageWrap(inner: string, msg: string) {
  const msgExpr = issueMessageExpression(msg)
  return `(()=>{const Schema=${inner};return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){if(issue.path.length>0){ctx.issues.push({...issue,message:${msgExpr}})}else{ctx.issues.push(issue)}}}}).pipe(Schema)})()`
}

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
  rootName: string = DEFAULT_ROOT_NAME,
  isZod = false,
  options?: EmitOptions,
): string {
  // The parameter's serialization reads the root's text; the nodes under it see none.
  if (hasParameterSerialization(options)) {
    const inner = zod(schema, rootName, isZod, withoutParameterSerialization(options))
    return parameter(schema, inner, options)
  }
  const expression = node(schema, rootName, isZod, options)
  const isWireCoerced = isStringWireLocation(options?.paramIn) && schema['x-coerce'] !== false
  if (!isWireCoerced || !canBeNull(schema) || canBeString(schema)) return expression
  // A combinator's members coerce `null` to `0` or `false` before a `null` member is
  // tried, so the null is matched ahead of them; the other nodes already match it first.
  const isNullMatchedFirst =
    isNullable(schema) || schema.const === null || schema.enum?.includes(null) === true
  const nullFirst = isNullMatchedFirst ? expression : `${expression}.nullable()`
  return `z.preprocess(${WIRE_NULL_PREPROCESS},${nullFirst})`
}

function node(
  schema: JSONSchema,
  rootName: string,
  isZod: boolean,
  options: EmitOptions | undefined,
): string {
  const isStringWireParam = isStringWireLocation(options?.paramIn)
  const isWireCoerced = isStringWireParam && schema['x-coerce'] !== false
  const withForcedCoerce = (s: JSONSchema): JSONSchema =>
    isStringWireParam && s['x-coerce'] !== false ? { ...s, 'x-coerce': true } : s
  const codeExtOpts: CodeExtensionOptions =
    options?.unsafeCodeExtensions === true ? { unsafeCodeExtensions: true } : {}
  const zodWrap = (zodStr: string, s: JSONSchema): string => _zodWrap(zodStr, s, codeExtOpts)
  const readonly = (v: string) => (options?.readonly ? `${v}.readonly()` : v)
  const wireArray = (v: string) =>
    isStringWireParam ? `z.preprocess(${WIRE_ARRAY_PREPROCESS},${v})` : v
  // What reads a literal's input into the literal's type: on the wire the text is coerced,
  // and a 64-bit integer is a bigint wherever it comes from.
  const literalInput = (values: readonly unknown[]): string | undefined => {
    if (values.every((v) => typeof v === 'number')) {
      if (isInt64(schema)) return int64Input(isWireCoerced)
      if (isWireCoerced) return 'z.coerce.number()'
    }
    if (isWireCoerced && values.every((v) => typeof v === 'boolean')) return 'z.stringbool()'
    return undefined
  }
  const ref = (s: JSONSchema, rn: string, iz: boolean): string => {
    if (isRootRef(s.$ref)) {
      return zodWrap(`z.lazy(() => ${rn})`, s)
    }
    if (typeof s.$ref === 'string' && isDeepLocalPointer(s.$ref)) {
      return zodWrap('z.unknown()', s)
    }
    if (options?.openapi && s.$ref) {
      const resolved = resolveOpenAPIRef(s.$ref)
      if (resolved) {
        if (resolved === rn) return zodWrap(`z.lazy(() => ${resolved})`, s)
        return zodWrap(iz ? `z.lazy(() => ${resolved})` : resolved, s)
      }
    }
    const toName = schemaNamer(options?.openapi)
    for (const prefix of DEFINITION_REF_PREFIXES) {
      if (s.$ref?.startsWith(prefix)) {
        const pascalCaseName = toName(s.$ref.slice(prefix.length))
        if (pascalCaseName === rn) return zodWrap(`z.lazy(() => ${pascalCaseName})`, s)
        const refExpr = iz
          ? `z.lazy(() => ${pascalCaseName})`
          : rn === DEFAULT_ROOT_NAME
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
        : rn === DEFAULT_ROOT_NAME
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
    const items = itemsSchemaOf(schema.items)
    if (schema.type === 'array' && items?.$ref) {
      return `z.array(${zodWrap(ref(items, rootName, isZod), items)})`
    }
    return zodWrap(ref(schema, rootName, isZod), schema)
  }

  // On the wire a value is text whatever its schema, so a typeless constraint says which
  // type to read the text as.
  if (
    isWireCoerced &&
    schema.type === undefined &&
    !hasCombinator(schema) &&
    schema.const === undefined &&
    schema.enum === undefined &&
    schema.properties === undefined
  ) {
    const isNumeric = hasNumericKeyword(schema)
    const isString = hasStringKeyword(schema)
    if (isNumeric && !isString) return node({ ...schema, type: 'number' }, rootName, isZod, options)
    if (isString && !isNumeric) return node({ ...schema, type: 'string' }, rootName, isZod, options)
  }

  if (schema.oneOf) {
    if (schema.oneOf.length === 0) return zodWrap('z.any()', schema)
    const schemas = schema.oneOf.map((s) => zod(s, rootName, isZod, options))
    const oneOfMessage = schema['x-oneOf-message']
    const errorPart = oneOfMessage ? `,${zodError(oneOfMessage)}` : ''
    const discriminator = schema.discriminator?.propertyName
    // ZodIntersection (from allOf) is not compatible with discriminatedUnion, so
    // fall back to xor when oneOf contains a $ref or allOf member.
    const hasRefOrAllOf = schema.oneOf.some((s) => s.$ref !== undefined || s.allOf !== undefined)
    // The text `1` is both a number and a stringbool once coerced, so on the wire the
    // first member that reads it wins rather than every match failing the other.
    const z =
      discriminator && !hasRefOrAllOf
        ? `z.discriminatedUnion('${discriminator}',[${schemas.join(',')}]${errorPart})`
        : isWireCoerced
          ? `z.union([${schemas.join(',')}]${errorPart})`
          : `z.xor([${schemas.join(',')}]${errorPart})`
    return zodWrap(z, schema)
  }

  if (schema.anyOf) {
    if (schema.anyOf.length === 0) return zodWrap('z.any()', schema)
    const schemas = schema.anyOf.map((s) => zod(s, rootName, isZod, options))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    const errorPart = anyOfMessage ? `,${zodError(anyOfMessage)}` : ''
    return zodWrap(`z.union([${schemas.join(',')}]${errorPart})`, schema)
  }

  if (schema.allOf) {
    if (schema.allOf.length === 0) return zodWrap('z.any()', schema)
    const nullable = isNullable(schema) || schema.allOf.some(isNullTypeMember)
    const defaultValue = schema.allOf.find(isDefaultOnlyMember)?.default
    const schemas = schema.allOf
      .filter((s) => !isShapelessMember(s))
      .map((s) => zod(s, rootName, isZod, options))
    if (schemas.length === 0) return zodWrap('z.any()', { ...schema, nullable })
    const intersected =
      schemas.length === 1 ? schemas[0] : schemas.reduce((acc, s) => `z.intersection(${acc},${s})`)
    const allOfMessage = schema['x-allOf-message']
    const baseResult = allOfMessage
      ? (() => {
          const msgExpr = issueMessageExpression(allOfMessage)
          const branches = ZOD_ISSUE_CODES.map(
            (c, i) =>
              `${i === 0 ? '' : 'else '}if(issue.code==='${c}'){ctx.issues.push({...issue,input:issue.input,message:${msgExpr}})}`,
          ).join('')
          return `(()=>{const Schema=${intersected};return z.unknown().check((ctx)=>{const result=Schema.safeParse(ctx.value);if(!result.success){for(const issue of result.error.issues){${branches}}}}).pipe(Schema)})()`
        })()
      : intersected
    // Carry the default through `merged` so zodWrap applies `.nullable()` before
    // `.default()`; a `default: null` is only valid against the nullable type.
    const mergedDefault = defaultValue !== undefined ? defaultValue : schema.default
    const merged: JSONSchema = {
      ...schema,
      nullable,
      ...(mergedDefault !== undefined && { default: mergedDefault }),
    }
    return zodWrap(baseResult, merged)
  }

  if (schema.not) {
    const notMessage = schema['x-not-message']
    const errorPart = notMessage ? `,${zodError(notMessage)}` : ''
    const { not: inner, ...withoutNot } = schema
    if (typeof inner !== 'object' || inner === null) return zodWrap('z.any()', schema)
    const predicate = inner.$ref
      ? `(val) => !${ref(inner, '', false)}.safeParse(val).success`
      : notPredicate(inner)
    // A `type` beside `not` still holds: the predicate narrows that type, not any value.
    if (withoutNot.type !== undefined) {
      const base = zod(withoutNot, rootName, isZod, options)
      return predicate ? `${base}.refine(${predicate}${errorPart})` : base
    }
    if (predicate) return zodWrap(`z.any().refine(${predicate}${errorPart})`, schema)
    return zodWrap('z.any()', schema)
  }

  if (schema.const !== undefined) {
    const value = schema.const
    // v3.0: x-const-message overrides x-error-message for `const` mismatch.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    const errorPart = constMessage ? `,${zodError(constMessage)}` : ''
    const literal =
      typeof value === 'number' && isInt64(schema)
        ? `z.literal(${value}n${errorPart})`
        : isPrimitive(value)
          ? `z.literal(${JSON.stringify(value)}${errorPart})`
          : `z.custom<${JSON.stringify(value)}>()`
    const input = literalInput([value])
    return zodWrap(input ? `${input}.pipe(${literal})` : literal, schema)
  }
  if (schema.enum) {
    const values = schema.enum.filter((value) => value !== null)
    const input = values.length > 0 ? literalInput(values) : undefined
    if (input === undefined) return zodWrap(_enum(schema), schema)
    // `null` is matched ahead of the coercion, which would read it as `0` or `false`.
    const hasNull = values.length < schema.enum.length
    const piped = `${input}.pipe(${_enum({ ...schema, enum: values })})`
    return zodWrap(hasNull && !isNullable(schema) ? `${piped}.nullable()` : piped, schema)
  }
  if (schema.properties) return readonly(zodWrap(object(schema, rootName, isZod, options), schema))

  const types = normalizeTypes(schema.type)
  const primitive = (t: string): string | undefined => {
    if (t === 'string') return string(schema)
    if (t === 'number') return number(withForcedCoerce(schema))
    if (t === 'integer') return integer(withForcedCoerce(schema))
    if (t !== 'boolean') return undefined
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    if (isStringWireParam) {
      return `z.stringbool(${errorArg ? `{error:${errorArg.replaceAll(/^{error:|}$/g, '')}}` : ''})`
    }
    const coercePrefix = schema['x-coerce'] === true ? 'coerce.' : ''
    return `z.${coercePrefix}boolean(${errorArg})`
  }
  // `number` already takes every integer, so the two together are one member. On the
  // wire every member reads text, so the string member is tried last.
  const primitiveTypes = (
    isWireCoerced ? WIRE_PRIMITIVE_ORDER.filter((t) => types.includes(t)) : types
  ).filter(
    (t) =>
      (t === 'string' || t === 'number' || t === 'boolean' || t === 'integer') &&
      !(t === 'integer' && types.includes('number')),
  )
  if (primitiveTypes.length > 1 && !types.includes('array') && !types.includes('object')) {
    const members = primitiveTypes.map(primitive).filter((m) => m !== undefined)
    return zodWrap(`z.union([${members.join(',')}])`, schema)
  }
  for (const t of ['string', 'number', 'integer', 'boolean']) {
    if (!types.includes(t)) continue
    const expression = primitive(t)
    if (expression !== undefined) return zodWrap(expression, schema)
  }

  if (types.includes('array')) {
    const errorMessage = schema['x-error-message']
    const baseError = errorMessage ? `,${zodError(errorMessage)}` : ''
    const lengthMessage = schema['x-length-message']
    const minItemsMessage = schema['x-minItems-message'] ?? lengthMessage
    const minError = minItemsMessage ? `,${zodError(minItemsMessage)}` : ''
    const maxItemsMessage = schema['x-maxItems-message'] ?? lengthMessage
    const maxError = maxItemsMessage ? `,${zodError(maxItemsMessage)}` : ''
    const fixedItemsMessage = minItemsMessage ?? maxItemsMessage
    const fixedItemsError = fixedItemsMessage ? `,${zodError(fixedItemsMessage)}` : ''
    const uniqueMessage = schema['x-uniqueItems-message']
    const uniqueError = uniqueMessage ? `,${zodError(uniqueMessage)}` : ''
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => zod(s, rootName, isZod, options))
      // JSON Schema 2020-12 §11.3: unevaluatedItems applies to elements beyond
      // prefixItems. With `false` we keep the fixed tuple (default rejects extras);
      // with a schema we emit a rest argument (`z.tuple([...], rest)`).
      const u = schema.unevaluatedItems
      const unevaluatedItemsMessage = schema['x-unevaluatedItems-message']
      const unevaluatedItemsError = unevaluatedItemsMessage
        ? `,${zodError(unevaluatedItemsMessage)}`
        : ''
      const rest = isSchemaObject(u) ? zod(u, rootName, isZod, options) : undefined
      const tupleArgs = rest ? `[${items.join(',')}],${rest}` : `[${items.join(',')}]`
      const tupleError = u === false && unevaluatedItemsMessage ? unevaluatedItemsError : baseError
      const tupleExpr = `z.tuple(${tupleArgs}${tupleError})`
      const prefixItemsMessage = schema['x-prefixItems-message']
      const wrapped = prefixItemsMessage
        ? elementMessageWrap(tupleExpr, prefixItemsMessage)
        : tupleExpr
      return readonly(zodWrap(wireArray(wrapped), schema))
    }
    // Draft-04 spelled a tuple as `items: [schema, ...]`; its first member stands for all.
    const itemSchema = itemsSchemaOf(schema.items)
    const item = itemSchema ? zod(itemSchema, rootName, isZod, options) : 'z.any()'
    const itemsMessage = schema['x-items-message']
    const arrayBase = `z.array(${item}${baseError})`
    const base = itemsMessage ? elementMessageWrap(arrayBase, itemsMessage) : arrayBase
    const unique =
      schema.uniqueItems === true
        ? `.refine((val)=>new Set(val).size===val.length${uniqueError})`
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
        const containsArg = fallback ? `,${zodError(fallback)}` : ''
        parts.push(
          `.refine((val)=>{const Schema=${containsZod};return val.some((item)=>Schema.safeParse(item).success)}${containsArg})`,
        )
      } else {
        const effectiveMin = minC ?? 1
        if (effectiveMin > 0) {
          const minContainsMessage = schema['x-minContains-message'] ?? fallback
          const minContainsArg = minContainsMessage ? `,${zodError(minContainsMessage)}` : ''
          parts.push(
            `.refine((val)=>{const Schema=${containsZod};return val.filter((item)=>Schema.safeParse(item).success).length>=${effectiveMin}}${minContainsArg})`,
          )
        }
        if (maxC !== undefined) {
          const maxContainsMessage = schema['x-maxContains-message'] ?? fallback
          const maxContainsArg = maxContainsMessage ? `,${zodError(maxContainsMessage)}` : ''
          parts.push(
            `.refine((val)=>{const Schema=${containsZod};return val.filter((item)=>Schema.safeParse(item).success).length<=${maxC}}${maxContainsArg})`,
          )
        }
      }
      return parts.join('')
    })()
    const { minItems, maxItems } = schema
    // unevaluatedItems is handled in the prefixItems branch; with a single
    // `items` schema (no prefixItems), JSON Schema 2020-12 §11.3 makes the
    // keyword redundant — items already validates every element.
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
    return readonly(zodWrap(wireArray(arrayExpr), schema))
  }

  if (types.includes('object')) {
    return readonly(zodWrap(object(schema, rootName, isZod, options), schema))
  }
  if (types.includes('date')) {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    const coercePrefix = schema['x-coerce'] === true || isStringWireParam ? 'coerce.' : ''
    return zodWrap(`z.${coercePrefix}date(${errorArg})`, schema)
  }
  if (types.length === 1 && types[0] === 'null') {
    const errorMessage = schema['x-error-message']
    const errorArg = errorMessage ? zodError(errorMessage) : ''
    return zodWrap(`z.null(${errorArg})`, schema)
  }

  return zodWrap('z.any()', schema)
}
