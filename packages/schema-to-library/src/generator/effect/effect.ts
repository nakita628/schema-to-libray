import {
  effectWrap as _effectWrap,
  isDeepLocalPointer,
  isDefaultOnlyMember,
  isNullTypeMember,
  isShapelessMember,
  jsLiteral,
} from '../../helper/index.js'
import type { CodeExtensionOptions } from '../../helper/index.js'
import type { JSONSchema, ParamIn } from '../../parser/index.js'
import {
  effectError,
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

function replaceBase(inner: string, from: string, to: string): string {
  return inner.replace(from, to)
}

/**
 * The `"true" | "false"` wire form of a boolean, for query and path
 * parameters. v3 shipped this as `Schema.BooleanFromString`; v4 has no such
 * schema, so the transformation is spelled out.
 */
const BOOLEAN_FROM_STRING =
  `Schema.Literals(["true","false"]).pipe(Schema.decodeTo(Schema.Boolean,` +
  `SchemaTransformation.transform({decode:(s)=>s==="true",` +
  `encode:(b)=>b?"true":"false"})))`

/**
 * True when a generated expression is a `Schema.Struct({...})`, optionally
 * followed by `.check(...)` / `.annotate(...)` chains — the shapes whose
 * `.fields` property survives (v4 rebuilds a struct as a struct).
 */
function isStructExpr(code: string): boolean {
  return code.startsWith('Schema.Struct({')
}

/**
 * The Effect Schema v4 spelling of an `allOf` intersection.
 *
 * v4 has no general `Schema.extend`. Structs intersect by spreading `.fields`,
 * which is the documented replacement and keeps the full combined type. For
 * anything else — a refined string, a union, a record — the first member
 * becomes the base and each remaining member is enforced as a filter, which
 * validates correctly but types the result as the base member alone.
 */
function intersect(schemas: readonly string[]): string {
  const [first, ...rest] = schemas
  if (first === undefined) return 'Schema.Unknown'
  if (schemas.every(isStructExpr)) {
    return `Schema.Struct({${schemas.map((s) => `...${s}.fields`).join(',')}})`
  }
  return `${first}.check(${rest.map((s) => `Schema.makeFilter((v)=>Schema.is(${s})(v))`).join(',')})`
}

/**
 * Replace every decoding failure of `inner` with a single message.
 *
 * v4 annotates a node with a plain `message` string, but that only covers
 * issues the node itself reports — a missing or mistyped key is reported
 * deeper and keeps its own message. Validating the whole value through one
 * filter and then decoding restores the v3 `transformOrFail` behaviour of
 * collapsing any failure into the given message, and `decodeTo` carries the
 * inner schema's type through.
 */
export function wholeValueMessage(inner: string, message: string): string {
  return `Schema.Unknown.check(Schema.makeFilter((v)=>Schema.is(${inner})(v),${effectError(message)})).pipe(Schema.decodeTo(${inner}))`
}

/**
 * Generate Effect Schema code from a JSON Schema.
 *
 * The `options.readonly` flag is accepted for API symmetry with the other
 * generators but is a no-op for Effect Schema: fields produced by
 * `Schema.Struct({...})` are already `readonly` at the TypeScript type level,
 * and `Schema.Array(...)` returns `ReadonlyArray<T>` by default. Effect Schema
 * has no separate runtime "readonly" wrapper.
 */
export function effect(
  schema: JSONSchema,
  rootName = 'Schema',
  isEffect = false,
  options?: {
    openapi?: boolean
    readonly?: boolean
    unsafeCodeExtensions?: boolean
    paramIn?: ParamIn
  },
): string {
  const isStringWireParam =
    (options?.paramIn === 'query' || options?.paramIn === 'path') && schema['x-coerce'] !== false
  const codeExtOpts: CodeExtensionOptions =
    options?.unsafeCodeExtensions === true ? { unsafeCodeExtensions: true } : {}
  const effectWrap = (effectStr: string, s: JSONSchema): string =>
    _effectWrap(effectStr, s, codeExtOpts)
  if (schema.$ref) {
    const ref = (s: JSONSchema): string => {
      if (s.$ref === '#' || s.$ref === '') {
        return effectWrap(`Schema.suspend(() => ${rootName})`, s)
      }
      if (typeof s.$ref === 'string' && isDeepLocalPointer(s.$ref)) {
        return effectWrap('Schema.Unknown', s)
      }
      if (options?.openapi && s.$ref) {
        const resolved = resolveOpenAPIRef(s.$ref)
        if (resolved) {
          if (resolved === rootName) return effectWrap(`Schema.suspend(() => ${resolved})`, s)
          return effectWrap(isEffect ? `Schema.suspend(() => ${resolved})` : resolved, s)
        }
      }
      const toName = options?.openapi ? toIdentifierPascalCase : toPascalCase
      const REF_PREFIXES = ['#/components/schemas/', '#/definitions/', '#/$defs/'] as const
      for (const prefix of REF_PREFIXES) {
        if (s.$ref?.startsWith(prefix)) {
          const pascalCaseName = toName(s.$ref.slice(prefix.length))
          if (pascalCaseName === rootName) {
            return effectWrap(`Schema.suspend(() => ${pascalCaseName})`, s)
          }
          const refExpr = isEffect
            ? `Schema.suspend(() => ${pascalCaseName})`
            : rootName === 'Schema'
              ? `${pascalCaseName}Schema`
              : `Schema.suspend(() => ${pascalCaseName})`
          return effectWrap(refExpr, s)
        }
      }
      if (s.$ref?.startsWith('#')) {
        const refName = s.$ref.slice(1)
        if (refName === '') return `Schema.suspend(() => ${rootName})`
        const pascalCaseName = toName(refName)
        return isEffect
          ? `Schema.suspend(() => ${pascalCaseName})`
          : rootName === 'Schema'
            ? `${pascalCaseName}Schema`
            : `Schema.suspend(() => ${pascalCaseName})`
      }
      if (s.$ref?.includes('#')) return 'Schema.Unknown'
      if (s.$ref?.startsWith('http')) {
        const last = s.$ref.split('/').at(-1)
        if (last) return last.replace(/\.json$/, '')
      }
      return 'Schema.Unknown'
    }
    if (schema.type === 'array' && schema.items?.$ref) {
      return `Schema.Array(${effectWrap(ref(schema.items), schema.items)})`
    }
    return effectWrap(ref(schema), schema)
  }

  if (schema.oneOf) {
    if (schema.oneOf.length === 0) return effectWrap('Schema.Unknown', schema)
    const schemas = schema.oneOf.map((s) => effect(s, rootName, isEffect, options))
    const oneOfMessage = schema['x-oneOf-message']
    const expr = `Schema.Union([${schemas.join(',')}])`
    return effectWrap(
      oneOfMessage ? `${expr}.annotate(${effectError(oneOfMessage)})` : expr,
      schema,
    )
  }

  if (schema.anyOf) {
    if (schema.anyOf.length === 0) return effectWrap('Schema.Unknown', schema)
    const schemas = schema.anyOf.map((s) => effect(s, rootName, isEffect, options))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    const expr = `Schema.Union([${schemas.join(',')}])`
    return effectWrap(
      anyOfMessage ? `${expr}.annotate(${effectError(anyOfMessage)})` : expr,
      schema,
    )
  }

  if (schema.allOf) {
    if (schema.allOf.length === 0) return effectWrap('Schema.Unknown', schema)
    const nullable =
      schema.nullable === true ||
      (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null') ||
      schema.allOf.some(isNullTypeMember)
    const defaultValue = schema.allOf.find(isDefaultOnlyMember)?.default
    const schemas = schema.allOf
      .filter((s) => !isShapelessMember(s))
      .map((s) => effect(s, rootName, isEffect, options))
    if (schemas.length === 0) return effectWrap('Schema.Unknown', { ...schema, nullable })
    const intersected = schemas.length === 1 ? schemas[0] : intersect(schemas)
    const allOfMessage = schema['x-allOf-message']
    const baseResult = allOfMessage ? wholeValueMessage(intersected, allOfMessage) : intersected
    if (defaultValue !== undefined) {
      // `Schema.NullOr` wraps a schema, so it stays inside the decoding default.
      const withNullable = nullable ? `Schema.NullOr(${baseResult})` : baseResult
      return `${withNullable}.pipe(Schema.withDecodingDefault(Effect.succeed(${jsLiteral(defaultValue)})))`
    }
    return effectWrap(baseResult, { ...schema, nullable })
  }

  if (schema.not) {
    const inner = schema.not
    if (typeof inner !== 'object' || inner === null) return effectWrap('Schema.Unknown', schema)
    const notMessage = schema['x-not-message']
    const filterOpts = notMessage ? `,${effectError(notMessage)}` : ''
    const filtered = (predicate: string) =>
      effectWrap(`Schema.Unknown.check(Schema.makeFilter(${predicate}${filterOpts}))`, schema)
    const typePredicates: { readonly [k: string]: string } = {
      string: `(val) => typeof val !== 'string'`,
      number: `(val) => typeof val !== 'number'`,
      integer: `(val) => typeof val !== 'number' || !Number.isInteger(val)`,
      boolean: `(val) => typeof val !== 'boolean'`,
      array: '(val) => !Array.isArray(val)',
      object: `(val) => typeof val !== 'object' || val === null || Array.isArray(val)`,
      null: '(val) => val !== null',
    }
    if ('const' in inner) return filtered(`(val) => val !== ${JSON.stringify(inner.const)}`)
    if (typeof inner.type === 'string') {
      const predicate = typePredicates[inner.type]
      if (predicate) return filtered(predicate)
    }
    if (Array.isArray(inner.type)) {
      const bodies = inner.type
        .map((t) => typePredicates[t])
        .filter((p) => p !== undefined)
        .map((p) => `(${p.replace(/^\(val\) => /, '')})`)
      if (bodies.length > 0) return filtered(`(val) => ${bodies.join(' && ')}`)
    }
    if (Array.isArray(inner.enum)) {
      // `Array<string>.includes(unknown)` is a type error (the predicate's `val`
      // is `unknown`); compare via `.some(===)` which accepts any operand.
      return filtered(`(val) => !${JSON.stringify(inner.enum)}.some((item) => item === val)`)
    }
    return effectWrap('Schema.Unknown', schema)
  }

  if (schema.const !== undefined) {
    // v3.0: x-const-message overrides x-error-message for `const` mismatch.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    const literalCode = `Schema.Literal(${JSON.stringify(schema.const)})`
    const withMessage = constMessage
      ? `${literalCode}.annotate(${effectError(constMessage)})`
      : literalCode
    return effectWrap(withMessage, schema)
  }
  if (schema.enum) return effectWrap(_enum(schema), schema)
  if (schema.properties) return effectWrap(object(schema, rootName, isEffect, options), schema)

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return effectWrap(string(schema), schema)
  if (types.includes('number')) {
    const base = number(schema)
    if (isStringWireParam) {
      return effectWrap(replaceBase(base, 'Schema.Number', 'Schema.NumberFromString'), schema)
    }
    return effectWrap(base, schema)
  }
  if (types.includes('integer')) {
    const base = integer(schema)
    if (isStringWireParam) {
      return effectWrap(replaceBase(base, 'Schema.Number', 'Schema.NumberFromString'), schema)
    }
    return effectWrap(base, schema)
  }
  if (types.includes('boolean')) {
    // v4 has no `Schema.BooleanFromString`; spell the string wire form out.
    if (isStringWireParam) return effectWrap(BOOLEAN_FROM_STRING, schema)
    return effectWrap('Schema.Boolean', schema)
  }

  if (types.includes('array')) {
    const elementMessageWrap = wholeValueMessage
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => effect(s, rootName, isEffect, options))
      // JSON Schema 2020-12 §11.3: unevaluatedItems applies to elements beyond
      // prefixItems. `false` → fixed tuple (the default already rejects
      // extras); a schema → `Schema.TupleWithRest(tuple, [rest])`.
      const u = schema.unevaluatedItems
      const tuple = `Schema.Tuple([${items.join(',')}])`
      const tupleExpr =
        u !== undefined && u !== true && typeof u === 'object'
          ? `Schema.TupleWithRest(${tuple},[${effect(u, rootName, isEffect, options)}])`
          : tuple
      const prefixItemsMessage = schema['x-prefixItems-message']
      const wrapped = prefixItemsMessage
        ? elementMessageWrap(tupleExpr, prefixItemsMessage)
        : tupleExpr
      return effectWrap(wrapped, schema)
    }
    const items = schema.items
      ? effect(schema.items, rootName, isEffect, options)
      : 'Schema.Unknown'
    const itemsMessage = schema['x-items-message']
    const arrayBase = `Schema.Array(${items})`
    const base = itemsMessage ? elementMessageWrap(arrayBase, itemsMessage) : arrayBase
    const isFixedLength =
      typeof schema.minItems === 'number' &&
      typeof schema.maxItems === 'number' &&
      schema.minItems === schema.maxItems
    // Per-keyword array messages
    const lengthMessage = schema['x-length-message']
    const minItemsMessage = schema['x-minItems-message'] ?? lengthMessage
    const minArg = minItemsMessage ? `,${effectError(minItemsMessage)}` : ''
    const maxItemsMessage = schema['x-maxItems-message'] ?? lengthMessage
    const maxArg = maxItemsMessage ? `,${effectError(maxItemsMessage)}` : ''
    const tupleItemsMessage = minItemsMessage ?? maxItemsMessage
    const sizeArg = tupleItemsMessage ? `,${effectError(tupleItemsMessage)}` : ''
    const uniqueItemsMessage = schema['x-uniqueItems-message']
    const uniqueArg = uniqueItemsMessage ? `,${effectError(uniqueItemsMessage)}` : ''
    // v3.0: contains / minContains / maxContains as separate filters
    const containsChecks = (() => {
      const c = schema.contains
      if (!c) return []
      const containsSchema = effect(c, rootName, isEffect, options)
      const minC = schema.minContains
      const maxC = schema.maxContains
      const errorMessage = schema['x-error-message']
      const fallback = schema['x-contains-message'] ?? errorMessage
      const out: string[] = []
      if (minC === undefined && maxC === undefined) {
        const containsArg = fallback ? `,${effectError(fallback)}` : ''
        out.push(
          `Schema.makeFilter((arr)=>arr.some((i)=>Schema.is(${containsSchema})(i))${containsArg})`,
        )
      } else {
        const effectiveMin = minC ?? 1
        if (effectiveMin > 0) {
          const minContainsMessage = schema['x-minContains-message'] ?? fallback
          const minContainsArg = minContainsMessage ? `,${effectError(minContainsMessage)}` : ''
          out.push(
            `Schema.makeFilter((arr)=>arr.filter((i)=>Schema.is(${containsSchema})(i)).length>=${effectiveMin}${minContainsArg})`,
          )
        }
        if (maxC !== undefined) {
          const maxContainsMessage = schema['x-maxContains-message'] ?? fallback
          const maxContainsArg = maxContainsMessage ? `,${effectError(maxContainsMessage)}` : ''
          out.push(
            `Schema.makeFilter((arr)=>arr.filter((i)=>Schema.is(${containsSchema})(i)).length<=${maxC}${maxContainsArg})`,
          )
        }
      }
      return out
    })()
    // unevaluatedItems is handled in the prefixItems branch; with `items` alone,
    // JSON Schema 2020-12 §11.3 makes the keyword redundant.
    const checks = [
      isFixedLength
        ? `Schema.isLengthBetween(${schema.minItems},${schema.minItems}${sizeArg})`
        : undefined,
      !isFixedLength && typeof schema.minItems === 'number'
        ? `Schema.isMinLength(${schema.minItems}${minArg})`
        : undefined,
      !isFixedLength && typeof schema.maxItems === 'number'
        ? `Schema.isMaxLength(${schema.maxItems}${maxArg})`
        : undefined,
      schema.uniqueItems === true ? `Schema.isUnique(${uniqueArg.slice(1)})` : undefined,
      ...containsChecks,
    ].filter((v) => v !== undefined)
    const arrayExpr = checks.length > 0 ? `${base}.check(${checks.join(',')})` : base
    return effectWrap(arrayExpr, schema)
  }

  if (types.includes('object')) {
    return effectWrap(object(schema, rootName, isEffect, options), schema)
  }
  if (types.includes('date')) {
    if (isStringWireParam) return effectWrap('Schema.DateFromString', schema)
    return effectWrap('Schema.Date', schema)
  }
  if (types.length === 1 && types[0] === 'null') return effectWrap('Schema.Null', schema)

  return effectWrap('Schema.Unknown', schema)
}
