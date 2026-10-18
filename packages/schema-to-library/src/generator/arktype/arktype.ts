import {
  DEFAULT_ROOT_NAME,
  DEFINITION_REF_PREFIXES,
  QUOTE_OR_BACKSLASH_PATTERN,
} from '../../constants/index.js'
import {
  hasFixedItemCount,
  isArktypeDefinition,
  isDeepLocalPointer,
  isNullable,
  isNullTypeMember,
  isQuoted,
  isRootRef,
  isSchemaObject,
  isShapelessMember,
  isStringWireLocation,
} from '../../guard/index.js'
import { arktypeWrap as _arktypeWrap, itemsSchemaOf, schemaNamer } from '../../helper/index.js'
import type { ArktypeWrapOptions, EmitOptions } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
import { normalizeTypes, resolveOpenAPIRef } from '../../utils/index.js'
import { _enum } from './enum.js'
import { integer } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

/**
 * The `not` predicates by `type`, as the source of a `(data: unknown) => ...` arrow.
 * `data` is the parameter name every predicate shares, so their bodies can be joined
 * with `&&`.
 */
const NOT_TYPE_PREDICATES: { readonly [k: string]: string } = {
  string: `(data: unknown) => typeof data !== 'string'`,
  number: `(data: unknown) => typeof data !== 'number'`,
  integer: `(data: unknown) => typeof data !== 'number' || !Number.isInteger(data)`,
  boolean: `(data: unknown) => typeof data !== 'boolean'`,
  array: '(data: unknown) => !Array.isArray(data)',
  object: `(data: unknown) => typeof data !== 'object' || data === null || Array.isArray(data)`,
  null: '(data: unknown) => data !== null',
}

/**
 * Combine two ArkType expressions.
 *
 * Inside `scope({...})` a definition may name a scope-local alias, which the
 * global `type(...)` cannot resolve, so scope mode composes with ArkType's
 * tuple expressions — which stay in definition syntax — instead of methods.
 */
function combine(op: '&' | '|', inScope: boolean) {
  return (acc: string, s: string) =>
    inScope && isArktypeDefinition(acc)
      ? `[${acc},"${op}",${s}]`
      : `type(${acc}).${op === '&' ? 'and' : 'or'}(${s})`
}

function unionStr(schemas: string[], inScope = false): string {
  return schemas.every(isQuoted)
    ? `"${schemas.map((s) => s.slice(1, -1)).join(' | ')}"`
    : schemas.reduce(combine('|', inScope))
}

function intersectionStr(schemas: string[], inScope = false): string {
  return schemas.every(isQuoted)
    ? `"${schemas.map((s) => s.slice(1, -1)).join(' & ')}"`
    : schemas.reduce(combine('&', inScope))
}

/** An ArkType expression that carries methods: a quoted definition is wrapped in `type(...)`. */
function asRuntime(source: string): string {
  return isQuoted(source) ? `type(${source})` : source
}

function formatConst(value: unknown): string {
  if (typeof value === 'string') return `"'${value}'"`
  if (typeof value === 'number' || typeof value === 'boolean') return `"${String(value)}"`
  if (value !== null && typeof value === 'object') return '"unknown"'
  return `"${JSON.stringify(value) ?? 'null'}"`
}

export function arktype(
  schema: JSONSchema,
  rootName: string = DEFAULT_ROOT_NAME,
  isArktype = false,
  options?: EmitOptions,
): string {
  const codeExtOpts: ArktypeWrapOptions = {
    ...(options?.unsafeCodeExtensions === true && { unsafeCodeExtensions: true }),
    ...(isArktype && { scopeMode: true }),
  }
  const arktypeWrap = (arktypeStr: string, s: JSONSchema): string =>
    _arktypeWrap(arktypeStr, s, codeExtOpts)
  const readonly = (v: string) => (options?.readonly ? `${v}.readonly()` : v)

  if (schema.$ref) {
    // Scope mode (isArktype) resolves refs through `scope({...})` as DSL keywords (`"User"`).
    // Standalone exports (`const X = type(...)`) have no scope, so a cross-schema ref must be a
    // value reference to the imported const (`User`). Self-refs stay quoted: a value ref to the
    // const being defined would hit a TDZ; recursion is only expressible in scope mode.
    const emitRef = (name: string): string => (!isArktype && name !== rootName ? name : `"${name}"`)
    const ref = (s: JSONSchema): string => {
      if (isRootRef(s.$ref)) return `"${rootName}"`
      if (typeof s.$ref === 'string' && isDeepLocalPointer(s.$ref)) return '"unknown"'
      if (options?.openapi && s.$ref) {
        const resolved = resolveOpenAPIRef(s.$ref)
        if (resolved) return emitRef(resolved)
      }
      const toName = schemaNamer(options?.openapi)
      for (const prefix of DEFINITION_REF_PREFIXES) {
        if (s.$ref?.startsWith(prefix)) return emitRef(toName(s.$ref.slice(prefix.length)))
      }
      if (s.$ref?.startsWith('#')) {
        const refName = s.$ref.slice(1)
        return refName === '' ? `"${rootName}"` : emitRef(toName(refName))
      }
      return '"unknown"'
    }
    const items = itemsSchemaOf(schema.items)
    if (schema.type === 'array' && items?.$ref) {
      return arktypeWrap(`${ref(items)}.array()`, schema)
    }
    return arktypeWrap(ref(schema), schema)
  }

  const describeWithMessage = (expr: string, msg: unknown): string => {
    if (typeof msg !== 'string') return expr
    const text = JSON.stringify(msg)
    if (isArktype && isArktypeDefinition(expr)) return `[${expr},"@",${text}]`
    return `${isQuoted(expr) ? `type(${expr})` : expr}.describe(${text})`
  }

  if (schema.oneOf) {
    if (schema.oneOf.length === 0) return arktypeWrap('"unknown"', schema)
    const schemas = schema.oneOf.map((s) => arktype(s, rootName, isArktype, options))
    return arktypeWrap(
      describeWithMessage(unionStr(schemas, isArktype), schema['x-oneOf-message']),
      schema,
    )
  }

  if (schema.anyOf) {
    if (schema.anyOf.length === 0) return arktypeWrap('"unknown"', schema)
    const schemas = schema.anyOf.map((s) => arktype(s, rootName, isArktype, options))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    return arktypeWrap(describeWithMessage(unionStr(schemas, isArktype), anyOfMessage), schema)
  }

  if (schema.allOf) {
    if (schema.allOf.length === 0) return arktypeWrap('"unknown"', schema)
    const nullable = isNullable(schema) || schema.allOf.some(isNullTypeMember)
    const schemas = schema.allOf
      .filter((s) => !isShapelessMember(s))
      .map((s) => arktype(s, rootName, isArktype, options))
    if (schemas.length === 0) return arktypeWrap('"unknown"', { ...schema, nullable })
    const baseResult = schemas.length === 1 ? schemas[0] : intersectionStr(schemas, isArktype)
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
    if ('const' in inner) {
      return narrow(`(data: unknown) => data !== ${JSON.stringify(inner.const)}`)
    }
    if (typeof inner.type === 'string') {
      const predicate = NOT_TYPE_PREDICATES[inner.type]
      if (predicate) return narrow(predicate)
    }
    if (Array.isArray(inner.type)) {
      const bodies = normalizeTypes(inner.type)
        .map((t) => NOT_TYPE_PREDICATES[t])
        .filter((p) => p !== undefined)
        .map((p) => `(${p.replace(/^\(data: unknown\) => /u, '')})`)
      if (bodies.length > 0) return narrow(`(data: unknown) => ${bodies.join(' && ')}`)
    }
    if (Array.isArray(inner.enum)) {
      return narrow(`(data: unknown) => !${JSON.stringify(inner.enum)}.includes(data as never)`)
    }
    return arktypeWrap('"unknown"', schema)
  }

  if (schema.const !== undefined) {
    // v3.0: x-const-message attaches a `.describe(msg)` to the literal type.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    // A quote or backslash in the value breaks both the arktype string DSL
    // literal and the surrounding JS string; such consts use the runtime unit form.
    if (typeof schema.const === 'string' && QUOTE_OR_BACKSLASH_PATTERN.test(schema.const)) {
      const unit = `type.unit(${JSON.stringify(schema.const)})`
      return arktypeWrap(
        constMessage ? `${unit}.describe(${JSON.stringify(constMessage)})` : unit,
        schema,
      )
    }
    const constExpr = formatConst(schema.const)
    if (constMessage) {
      return arktypeWrap(`type(${constExpr}).describe(${JSON.stringify(constMessage)})`, schema)
    }
    return arktypeWrap(constExpr, schema)
  }
  if (schema.enum) return arktypeWrap(_enum(schema), schema)
  if (schema.properties) {
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))
  }

  const types = normalizeTypes(schema.type)
  const isStringWireParam = isStringWireLocation(options?.paramIn) && schema['x-coerce'] !== false
  if (types.includes('string')) return arktypeWrap(string(schema), schema)
  if (types.includes('number')) {
    if (isStringWireParam) {
      const constraint = buildNumericConstraint(schema, 'number')
      return constraint
        ? arktypeWrap(`type("string.numeric.parse").to(${constraint})`, schema)
        : arktypeWrap('"string.numeric.parse"', schema)
    }
    return arktypeWrap(number(schema), schema)
  }
  if (types.includes('integer')) {
    if (isStringWireParam) {
      const constraint = buildNumericConstraint(schema, 'number.integer')
      return constraint
        ? arktypeWrap(`type("string.integer.parse").to(${constraint})`, schema)
        : arktypeWrap('"string.integer.parse"', schema)
    }
    return arktypeWrap(integer(schema), schema)
  }
  if (types.includes('boolean')) {
    if (isStringWireParam) {
      return arktypeWrap(`type("'true' | 'false'").pipe((data) => data === 'true')`, schema)
    }
    return arktypeWrap('"boolean"', schema)
  }

  if (types.includes('array')) {
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => arktype(s, rootName, isArktype, options))
      // JSON Schema 2020-12 §11.3: unevaluatedItems applies to elements beyond
      // prefixItems. ArkType tuples reject extras by default; `unevaluatedItems`
      // as a schema is represented as a trailing variadic `...rest[]`.
      const u = schema.unevaluatedItems
      const tupleExpr = isSchemaObject(u)
        ? (() => {
            const rest = arktype(u, rootName, isArktype, options)
            const restInner = isQuoted(rest) ? rest.slice(1, -1) : rest
            return `type([${items.join(',')},"...","${restInner}[]"])`
          })()
        : `type([${items.join(',')}])`
      const baseTuple = arktypeWrap(
        describeWithMessage(tupleExpr, schema['x-prefixItems-message']),
        schema,
      )
      const unevalItemsMessage = schema['x-unevaluatedItems-message']
      return u === false && unevalItemsMessage
        ? `${baseTuple}.describe(${JSON.stringify(unevalItemsMessage)})`
        : baseTuple
    }
    const itemSchema = itemsSchemaOf(schema.items)
    const items = itemSchema ? arktype(itemSchema, rootName, isArktype, options) : '"unknown"'
    if (!isQuoted(items)) return arktypeWrap(`type(${items}).array()`, schema)
    const inner = items.slice(1, -1)
    const base = `"${inner}[]"`
    const { minItems, maxItems } = schema
    const isFixedLength = hasFixedItemCount(schema)
    // Per-keyword array messages via .narrow() with ctx.mustBe.
    const lengthMessage = schema['x-length-message']
    const minItemsMessage = schema['x-minItems-message'] ?? lengthMessage
    const maxItemsMessage = schema['x-maxItems-message'] ?? lengthMessage
    const uniqueItemsMessage = schema['x-uniqueItems-message']
    const containsMessage = schema['x-contains-message']
    const minContainsMessage = schema['x-minContains-message']
    const maxContainsMessage = schema['x-maxContains-message']
    const fixedItemsMessage = minItemsMessage ?? maxItemsMessage
    // `.some(Boolean)`, not `??`: an empty message is no message, and the branch it
    // guards would emit `ctx.mustBe('')`.
    const hasArrayMessage = [
      minItemsMessage,
      maxItemsMessage,
      uniqueItemsMessage,
      containsMessage,
      minContainsMessage,
      maxContainsMessage,
    ].some(Boolean)
    // `and` / `narrow` on a definition that may name a scope-local alias must
    // stay in definition syntax; the global `type(...)` cannot resolve it.
    const andWith = (a: string, b: string) =>
      isArktype && isArktypeDefinition(a) ? `[${a},"&",${b}]` : `type(${a}).and(type(${b}))`
    const narrowWith = (a: string, fn: string) =>
      isArktype && isArktypeDefinition(a)
        ? `[${a},":",${fn}]`
        : `${isArktypeDefinition(a) ? `type(${a})` : a}.narrow(${fn})`

    const lengthExpr = isFixedLength
      ? hasArrayMessage
        ? narrowWith(
            base,
            `(data: unknown[], ctx) => data.length === ${minItems} || ctx.mustBe(${JSON.stringify(fixedItemsMessage ?? `must contain exactly ${minItems} items`)})`,
          )
        : andWith(base, `"unknown[] == ${minItems}"`)
      : typeof minItems === 'number' && typeof maxItems === 'number'
        ? hasArrayMessage
          ? narrowWith(
              narrowWith(
                base,
                `(data: unknown[], ctx) => data.length >= ${minItems} || ctx.mustBe(${JSON.stringify(minItemsMessage ?? `must contain at least ${minItems} items`)})`,
              ),
              `(data: unknown[], ctx) => data.length <= ${maxItems} || ctx.mustBe(${JSON.stringify(maxItemsMessage ?? `must contain at most ${maxItems} items`)})`,
            )
          : andWith(base, `"${minItems} <= unknown[] <= ${maxItems}"`)
        : typeof minItems === 'number'
          ? hasArrayMessage
            ? narrowWith(
                base,
                `(data: unknown[], ctx) => data.length >= ${minItems} || ctx.mustBe(${JSON.stringify(minItemsMessage ?? `must contain at least ${minItems} items`)})`,
              )
            : andWith(base, `"unknown[] >= ${minItems}"`)
          : typeof maxItems === 'number'
            ? hasArrayMessage
              ? narrowWith(
                  base,
                  `(data: unknown[], ctx) => data.length <= ${maxItems} || ctx.mustBe(${JSON.stringify(maxItemsMessage ?? `must contain at most ${maxItems} items`)})`,
                )
              : andWith(base, `"unknown[] <= ${maxItems}"`)
            : base
    const uniqueExpr =
      schema.uniqueItems === true
        ? narrowWith(
            lengthExpr,
            `(data: unknown[], ctx) => new Set(data).size === data.length${uniqueItemsMessage ? ` || ctx.mustBe(${JSON.stringify(uniqueItemsMessage)})` : ''}`,
          )
        : lengthExpr
    const containsNarrows = ((): readonly string[] => {
      if (!schema.contains) return []
      const containsRt = asRuntime(arktype(schema.contains, rootName, isArktype, options))
      const minC = schema.minContains
      const maxC = schema.maxContains
      if (minC === undefined && maxC === undefined) {
        const msg = containsMessage ?? 'must contain at least one matching item'
        return [
          `.narrow((data: unknown[], ctx) => data.some((item) => ${containsRt}.allows(item)) || ctx.mustBe(${JSON.stringify(msg)}))`,
        ]
      }
      const effectiveMin = minC ?? 1
      const minNarrow =
        effectiveMin > 0
          ? `.narrow((data: unknown[], ctx) => data.filter((item) => ${containsRt}.allows(item)).length >= ${effectiveMin} || ctx.mustBe(${JSON.stringify(minContainsMessage ?? `must contain at least ${effectiveMin} matching items`)}))`
          : undefined
      const maxNarrow =
        maxC !== undefined
          ? `.narrow((data: unknown[], ctx) => data.filter((item) => ${containsRt}.allows(item)).length <= ${maxC} || ctx.mustBe(${JSON.stringify(maxContainsMessage ?? `must contain at most ${maxC} matching items`)}))`
          : undefined
      return [minNarrow, maxNarrow].filter((v): v is string => v !== undefined)
    })()
    // unevaluatedItems is handled in the prefixItems branch; with `items` alone,
    // JSON Schema 2020-12 §11.3 makes the keyword redundant.
    const arrayExpr = containsNarrows.reduce(
      (acc, narrow) => `${asRuntime(acc)}${narrow}`,
      uniqueExpr,
    )
    return arktypeWrap(describeWithMessage(arrayExpr, schema['x-items-message']), schema)
  }

  if (types.includes('object')) {
    return readonly(arktypeWrap(object(schema, rootName, isArktype, options), schema))
  }
  if (types.includes('date')) {
    if (isStringWireParam) return arktypeWrap('"string.date.parse"', schema)
    return arktypeWrap('"Date"', schema)
  }
  if (types.length === 1 && types[0] === 'null') return arktypeWrap('"null"', schema)

  return arktypeWrap('"unknown"', schema)
}

function buildNumericConstraint(
  schema: JSONSchema,
  baseType: 'number' | 'number.integer',
): string | undefined {
  const minimum = (() => {
    if (schema.minimum !== undefined) return `>= ${schema.minimum}`
    if (typeof schema.exclusiveMinimum === 'number') return `> ${schema.exclusiveMinimum}`
    return undefined
  })()
  const maximum = (() => {
    if (schema.maximum !== undefined) return `<= ${schema.maximum}`
    if (typeof schema.exclusiveMaximum === 'number') return `< ${schema.exclusiveMaximum}`
    return undefined
  })()
  const multipleOf = schema.multipleOf !== undefined ? `% ${schema.multipleOf}` : undefined
  const constraints = [minimum, maximum, multipleOf].filter((v) => v !== undefined)
  if (constraints.length === 0) return undefined
  if (constraints.length === 1) return `"${baseType} ${constraints[0]}"`
  const parts = constraints.map((c) => `type("${baseType} ${c}")`)
  return `${parts[0]}${parts
    .slice(1)
    .map((p) => `.and(${p})`)
    .join('')}`
}
