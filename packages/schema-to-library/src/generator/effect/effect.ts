import { effectWrap } from '../../helper/index.js'
import type { JSONSchema } from '../../parser/index.js'
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
  rootName: string = 'Schema',
  isEffect: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  if (schema.$ref) {
    const ref = (s: JSONSchema): string => {
      if (s.$ref === '#' || s.$ref === '') {
        return effectWrap(`Schema.suspend(() => ${rootName})`, s)
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
          if (pascalCaseName === rootName)
            return effectWrap(`Schema.suspend(() => ${pascalCaseName})`, s)
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
    if (!schema.oneOf.length) return effectWrap('Schema.Unknown', schema)
    const schemas = schema.oneOf.map((s) => effect(s, rootName, isEffect, options))
    const oneOfMessage = schema['x-oneOf-message']
    const expr = `Schema.Union(${schemas.join(',')})`
    return effectWrap(
      oneOfMessage ? `${expr}.annotations(${effectError(oneOfMessage)})` : expr,
      schema,
    )
  }

  if (schema.anyOf) {
    if (!schema.anyOf.length) return effectWrap('Schema.Unknown', schema)
    const schemas = schema.anyOf.map((s) => effect(s, rootName, isEffect, options))
    const anyOfMessage = schema['x-anyOf-message']
    const expr = `Schema.Union(${schemas.join(',')})`
    return effectWrap(
      anyOfMessage ? `${expr}.annotations(${effectError(anyOfMessage)})` : expr,
      schema,
    )
  }

  if (schema.allOf) {
    if (!schema.allOf.length) return effectWrap('Schema.Unknown', schema)
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
    if (!schemas.length) return effectWrap('Schema.Unknown', { ...schema, nullable })
    const intersected = schemas.length === 1 ? schemas[0] : `Schema.extend(${schemas.join(',')})`
    const allOfMessage = schema['x-allOf-message']
    const baseResult = allOfMessage
      ? (() => {
          const isArrow = /^\s*\(.*?\)\s*=>/.test(allOfMessage)
          const msgExpr = isArrow ? `(${allOfMessage})(issue)` : JSON.stringify(allOfMessage)
          return `Schema.transformOrFail(Schema.Unknown,${intersected},{decode:(input,_opts,ast)=>{const result=Schema.decodeUnknownEither(${intersected})(input);return Either.isLeft(result)?ParseResult.fail(new ParseResult.Type(ast,input,${msgExpr})):ParseResult.succeed(result.right)},encode:ParseResult.succeed})`
        })()
      : intersected
    if (defaultValue !== undefined) {
      const formatLiteral = (value: unknown): string => {
        if (typeof value === 'boolean') return `${value}`
        if (typeof value === 'number') return `${value}`
        return JSON.stringify(value)
      }
      // NullOr must wrap a Schema; optionalWith returns PropertySignature, so it
      // must be the outermost wrap. Use Schema.optionalWith (Schema.optional with
      // options is deprecated in Effect Schema 3.x).
      const withNullable = nullable ? `Schema.NullOr(${baseResult})` : baseResult
      return `Schema.optionalWith(${withNullable},{default:() => ${formatLiteral(defaultValue)}})`
    }
    return effectWrap(baseResult, { ...schema, nullable })
  }

  if (schema.not) {
    const inner = schema.not
    if (typeof inner !== 'object' || inner === null) return effectWrap('Schema.Unknown', schema)
    const notMessage = schema['x-not-message']
    const filterOpts = notMessage ? `,{message:()=>${JSON.stringify(notMessage)}}` : ''
    const filtered = (predicate: string) =>
      effectWrap(`Schema.Unknown.pipe(Schema.filter(${predicate}${filterOpts}))`, schema)
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
      return filtered(`(val) => !${JSON.stringify(inner.enum)}.includes(val)`)
    }
    return effectWrap('Schema.Unknown', schema)
  }

  if (schema.const !== undefined) {
    // v3.0: x-const-message overrides x-error-message for `const` mismatch.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    const literalCode = `Schema.Literal(${JSON.stringify(schema.const)})`
    const withMsg = constMessage
      ? `${literalCode}.annotations(${effectError(constMessage)})`
      : literalCode
    return effectWrap(withMsg, schema)
  }
  if (schema.enum) return effectWrap(_enum(schema), schema)
  if (schema.properties) return effectWrap(object(schema, rootName, isEffect, options), schema)

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return effectWrap(string(schema), schema)
  if (types.includes('number')) return effectWrap(number(schema), schema)
  if (types.includes('integer')) return effectWrap(integer(schema), schema)
  if (types.includes('boolean')) return effectWrap('Schema.Boolean', schema)

  if (types.includes('array')) {
    const elementMessageWrap = (inner: string, msg: string) => {
      const isArrow = /^\s*\(.*?\)\s*=>/.test(msg)
      const msgExpr = isArrow ? `(${msg})(issue)` : JSON.stringify(msg)
      return `Schema.transformOrFail(Schema.Unknown,${inner},{decode:(input,_opts,ast)=>{const result=Schema.decodeUnknownEither(${inner})(input);return Either.isLeft(result)?ParseResult.fail(new ParseResult.Type(ast,input,${msgExpr})):ParseResult.succeed(result.right)},encode:ParseResult.succeed})`
    }
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => effect(s, rootName, isEffect, options))
      const tupleExpr = `Schema.Tuple(${items.join(',')})`
      const prefixMsg = schema['x-prefixItems-message']
      const wrapped = prefixMsg ? elementMessageWrap(tupleExpr, prefixMsg) : tupleExpr
      return effectWrap(wrapped, schema)
    }
    const items = schema.items
      ? effect(schema.items, rootName, isEffect, options)
      : 'Schema.Unknown'
    const itemsMsg = schema['x-items-message']
    const arrayBase = `Schema.Array(${items})`
    const base = itemsMsg ? elementMessageWrap(arrayBase, itemsMsg) : arrayBase
    const isFixedLength =
      typeof schema.minItems === 'number' &&
      typeof schema.maxItems === 'number' &&
      schema.minItems === schema.maxItems
    // Per-keyword array messages
    const minItemsMsg = schema['x-minItems-message']
    const minArg = minItemsMsg ? `,${effectError(minItemsMsg)}` : ''
    const maxItemsMsg = schema['x-maxItems-message']
    const maxArg = maxItemsMsg ? `,${effectError(maxItemsMsg)}` : ''
    const fixedItemsMsg = minItemsMsg ?? maxItemsMsg
    const sizeArg = fixedItemsMsg ? `,${effectError(fixedItemsMsg)}` : ''
    const uniqueMsg = schema['x-uniqueItems-message']
    const uniqueArg = uniqueMsg ? `,${effectError(uniqueMsg)}` : ''
    // v3.0: contains / minContains / maxContains as separate filters
    const containsActions = (() => {
      const c = schema.contains
      if (!c) return [] as readonly string[]
      const containsSchema = effect(c, rootName, isEffect, options)
      const minC = schema.minContains
      const maxC = schema.maxContains
      const errorMsg = schema['x-error-message']
      const fallback = schema['x-contains-message'] ?? errorMsg
      const out: string[] = []
      if (minC === undefined && maxC === undefined) {
        const msg = fallback ? `,${effectError(fallback)}` : ''
        out.push(`Schema.filter((arr)=>arr.some((i)=>Schema.is(${containsSchema})(i))${msg})`)
      } else {
        const effectiveMin = minC ?? 1
        if (effectiveMin > 0) {
          const minMsg = schema['x-minContains-message'] ?? fallback
          const minMsgArg = minMsg ? `,${effectError(minMsg)}` : ''
          out.push(
            `Schema.filter((arr)=>arr.filter((i)=>Schema.is(${containsSchema})(i)).length>=${effectiveMin}${minMsgArg})`,
          )
        }
        if (maxC !== undefined) {
          const maxMsg = schema['x-maxContains-message'] ?? fallback
          const maxMsgArg = maxMsg ? `,${effectError(maxMsg)}` : ''
          out.push(
            `Schema.filter((arr)=>arr.filter((i)=>Schema.is(${containsSchema})(i)).length<=${maxC}${maxMsgArg})`,
          )
        }
      }
      return out
    })()
    const actions = [
      isFixedLength ? `Schema.itemsCount(${schema.minItems}${sizeArg})` : undefined,
      !isFixedLength && typeof schema.minItems === 'number'
        ? `Schema.minItems(${schema.minItems}${minArg})`
        : undefined,
      !isFixedLength && typeof schema.maxItems === 'number'
        ? `Schema.maxItems(${schema.maxItems}${maxArg})`
        : undefined,
      schema.uniqueItems === true
        ? `Schema.filter((items) => new Set(items).size === items.length${uniqueArg})`
        : undefined,
      ...containsActions,
    ].filter((v) => v !== undefined)
    const arrayExpr = actions.length > 0 ? `${base}.pipe(${actions.join(',')})` : base
    return effectWrap(arrayExpr, schema)
  }

  if (types.includes('object'))
    return effectWrap(object(schema, rootName, isEffect, options), schema)
  if (types.includes('date')) return effectWrap('Schema.Date', schema)
  if (types.length === 1 && types[0] === 'null') return effectWrap('Schema.Null', schema)

  return effectWrap('Schema.Unknown', schema)
}
