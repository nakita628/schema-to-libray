import {
  type CodeExtensionOptions,
  isDeepLocalPointer,
  valibotWrap as _valibotWrap,
} from '../../helper/index.js'
import type { JSONSchema, ParamIn } from '../../parser/index.js'
import {
  normalizeTypes,
  resolveOpenAPIRef,
  toIdentifierPascalCase,
  toPascalCase,
  valibotError,
} from '../../utils/index.js'
import { _enum } from './enum.js'
import { integer } from './integer.js'
import { number } from './number.js'
import { object } from './object.js'
import { string } from './string.js'

export function valibot(
  schema: JSONSchema,
  rootName: string = 'Schema',
  isValibot: boolean = false,
  options?: {
    openapi?: boolean
    readonly?: boolean
    unsafeCodeExtensions?: boolean
    paramIn?: ParamIn
  },
): string {
  const isStringWireParam =
    (options?.paramIn === 'query' || options?.paramIn === 'path') && schema['x-coerce'] !== false
  const prependPipe = (prefix: readonly string[], inner: string): string => {
    if (inner.startsWith('v.pipe(') && inner.endsWith(')')) {
      const body = inner.slice('v.pipe('.length, -1)
      return `v.pipe(${prefix.join(',')},${body})`
    }
    return `v.pipe(${prefix.join(',')},${inner})`
  }
  const codeExtOpts: CodeExtensionOptions =
    options?.unsafeCodeExtensions === true ? { unsafeCodeExtensions: true } : {}
  const valibotWrap = (valibotStr: string, s: JSONSchema): string =>
    _valibotWrap(valibotStr, s, codeExtOpts)
  const readonly = (v: string) => (options?.readonly ? `v.pipe(${v},v.readonly())` : v)

  if (schema.$ref) {
    const ref = (s: JSONSchema): string => {
      if (s.$ref === '#' || s.$ref === '') {
        return valibotWrap(`v.lazy(() => ${rootName})`, s)
      }
      if (typeof s.$ref === 'string' && isDeepLocalPointer(s.$ref)) {
        return valibotWrap('v.unknown()', s)
      }
      if (options?.openapi && s.$ref) {
        const resolved = resolveOpenAPIRef(s.$ref)
        if (resolved) {
          if (resolved === rootName) return valibotWrap(`v.lazy(() => ${resolved})`, s)
          return valibotWrap(isValibot ? `v.lazy(() => ${resolved})` : resolved, s)
        }
      }
      const toName = options?.openapi ? toIdentifierPascalCase : toPascalCase
      const REF_PREFIXES = ['#/components/schemas/', '#/definitions/', '#/$defs/'] as const
      for (const prefix of REF_PREFIXES) {
        if (s.$ref?.startsWith(prefix)) {
          const pascalCaseName = toName(s.$ref.slice(prefix.length))
          if (pascalCaseName === rootName) return valibotWrap(`v.lazy(() => ${pascalCaseName})`, s)
          const refExpr = isValibot
            ? `v.lazy(() => ${pascalCaseName})`
            : rootName === 'Schema'
              ? `${pascalCaseName}Schema`
              : `v.lazy(() => ${pascalCaseName})`
          return valibotWrap(refExpr, s)
        }
      }
      if (s.$ref?.startsWith('#')) {
        const refName = s.$ref.slice(1)
        if (refName === '') return `v.lazy(() => ${rootName})`
        const pascalCaseName = toName(refName)
        return isValibot
          ? `v.lazy(() => ${pascalCaseName})`
          : rootName === 'Schema'
            ? `${pascalCaseName}Schema`
            : `v.lazy(() => ${pascalCaseName})`
      }
      if (s.$ref?.includes('#')) return 'v.unknown()'
      if (s.$ref?.startsWith('http')) {
        const last = s.$ref.split('/').at(-1)
        if (last) return last.replace(/\.json$/, '')
      }
      return 'v.any()'
    }
    if (schema.type === 'array' && schema.items?.$ref) {
      return `v.array(${valibotWrap(ref(schema.items), schema.items)})`
    }
    return valibotWrap(ref(schema), schema)
  }

  if (schema.oneOf) {
    if (!schema.oneOf.length) return valibotWrap('v.any()', schema)
    const schemas = schema.oneOf.map((s) => valibot(s, rootName, isValibot, options))
    const oneOfMessage = schema['x-oneOf-message']
    const errorPart = oneOfMessage ? `,${valibotError(oneOfMessage)}` : ''
    const discriminator = schema.discriminator?.propertyName
    const hasRefOrAllOf = schema.oneOf.some((s) => s.$ref !== undefined || s.allOf !== undefined)
    const expr =
      discriminator && !hasRefOrAllOf
        ? `v.variant('${discriminator}',[${schemas.join(',')}]${errorPart})`
        : `v.union([${schemas.join(',')}]${errorPart})`
    return valibotWrap(expr, schema)
  }

  if (schema.anyOf) {
    if (!schema.anyOf.length) return valibotWrap('v.any()', schema)
    const schemas = schema.anyOf.map((s) => valibot(s, rootName, isValibot, options))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    const errorPart = anyOfMessage ? `,${valibotError(anyOfMessage)}` : ''
    return valibotWrap(`v.union([${schemas.join(',')}]${errorPart})`, schema)
  }

  if (schema.allOf) {
    if (!schema.allOf.length) return valibotWrap('v.any()', schema)
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
      .map((s) => valibot(s, rootName, isValibot, options))
    if (!schemas.length) return valibotWrap('v.any()', { ...schema, nullable })
    const intersected = schemas.length === 1 ? schemas[0] : `v.intersect([${schemas.join(',')}])`
    const allOfMessage = schema['x-allOf-message']
    const baseResult = allOfMessage
      ? (() => {
          const isArrow = /^\s*\(.*?\)\s*=>/.test(allOfMessage)
          const msgExpr = isArrow ? `(${allOfMessage})(issue)` : JSON.stringify(allOfMessage)
          return `v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(${intersected},dataset.value);if(!result.success){for(const issue of result.issues){addIssue({message:${msgExpr},path:issue.path})}}}))`
        })()
      : intersected
    if (defaultValue !== undefined) {
      const formatLiteral = (value: unknown): string => {
        if (typeof value === 'boolean') return `${value}`
        if (typeof value === 'number') return `${value}`
        return JSON.stringify(value)
      }
      const withDefault = `v.optional(${baseResult},${formatLiteral(defaultValue)})`
      return nullable ? `v.nullable(${withDefault})` : withDefault
    }
    return valibotWrap(baseResult, { ...schema, nullable })
  }

  if (schema.not) {
    const inner = schema.not
    if (typeof inner !== 'object' || inner === null) return valibotWrap('v.any()', schema)
    const notMessage = schema['x-not-message']
    const errorPart = notMessage ? `,${valibotError(notMessage)}` : ''
    const custom = (predicate: string) =>
      valibotWrap(`v.custom<unknown>(${predicate}${errorPart})`, schema)
    const typePredicates: { readonly [k: string]: string } = {
      string: `(val) => typeof val !== 'string'`,
      number: `(val) => typeof val !== 'number'`,
      integer: `(val) => typeof val !== 'number' || !Number.isInteger(val)`,
      boolean: `(val) => typeof val !== 'boolean'`,
      array: '(val) => !Array.isArray(val)',
      object: `(val) => typeof val !== 'object' || val === null || Array.isArray(val)`,
      null: '(val) => val !== null',
    }
    if ('const' in inner) return custom(`(val) => val !== ${JSON.stringify(inner.const)}`)
    if (typeof inner.type === 'string') {
      const predicate = typePredicates[inner.type]
      if (predicate) return custom(predicate)
    }
    if (Array.isArray(inner.type)) {
      const bodies = inner.type
        .map((t) => typePredicates[t])
        .filter((p) => p !== undefined)
        .map((p) => `(${p.replace(/^\(val\) => /, '')})`)
      if (bodies.length > 0) return custom(`(val) => ${bodies.join(' && ')}`)
    }
    if (Array.isArray(inner.enum)) {
      return custom(`(val) => !${JSON.stringify(inner.enum)}.includes(val)`)
    }
    const innerExpr = valibot(inner, rootName, isValibot, options)
    return custom(`(val) => !v.safeParse(${innerExpr},val).success`)
  }

  if (schema.const !== undefined) {
    // v3.0: x-const-message overrides x-error-message for `const` mismatch.
    const value = schema.const
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    const msgArg = constMessage ? valibotError(constMessage) : ''
    const errorPart = msgArg ? `,${msgArg}` : ''
    // `v.literal` only accepts string/number/boolean. `null` maps to `v.null()`,
    // and array/object consts to a deep-equality `v.custom` (mirrors zod's
    // `z.custom<T>()` fallback) since Valibot has no literal for them.
    if (value === null) return valibotWrap(`v.null(${msgArg})`, schema)
    const isPrimitive =
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    return valibotWrap(
      isPrimitive
        ? `v.literal(${JSON.stringify(value)}${errorPart})`
        : `v.custom<${JSON.stringify(value)}>((input) => JSON.stringify(input) === ${JSON.stringify(JSON.stringify(value))}${errorPart})`,
      schema,
    )
  }
  if (schema.enum) return valibotWrap(_enum(schema), schema)
  if (schema.properties)
    return readonly(valibotWrap(object(schema, rootName, isValibot, options), schema))

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return valibotWrap(string(schema), schema)
  if (types.includes('number')) {
    const base = number(schema)
    if (isStringWireParam) {
      return valibotWrap(prependPipe(['v.string()', 'v.transform(Number)'], base), schema)
    }
    return valibotWrap(base, schema)
  }
  if (types.includes('integer')) {
    const base = integer(schema)
    if (isStringWireParam) {
      return valibotWrap(prependPipe(['v.string()', 'v.transform(Number)'], base), schema)
    }
    return valibotWrap(base, schema)
  }
  if (types.includes('boolean')) {
    if (isStringWireParam) {
      return valibotWrap(
        `v.pipe(v.picklist(['true','false']),v.transform((s)=>s==='true'))`,
        schema,
      )
    }
    return valibotWrap('v.boolean()', schema)
  }

  if (types.includes('array')) {
    const elementMessageWrap = (inner: string, msg: string) => {
      const isArrow = /^\s*\(.*?\)\s*=>/.test(msg)
      const msgExpr = isArrow ? `(${msg})(issue)` : JSON.stringify(msg)
      return `v.pipe(v.unknown(),v.rawCheck(({dataset,addIssue})=>{if(!dataset.typed)return;const result=v.safeParse(${inner},dataset.value);if(!result.success){for(const issue of result.issues){if(issue.path&&issue.path.length>0){addIssue({message:${msgExpr},path:issue.path})}else{addIssue(issue)}}}}))`
    }
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => valibot(s, rootName, isValibot, options))
      // JSON Schema 2020-12 §11.3: unevaluatedItems applies beyond prefixItems.
      // `v.tuple` accepts extras by default; `v.strictTuple` rejects them.
      // `unevaluatedItems: schema` → `v.tupleWithRest(...)`.
      const u = schema.unevaluatedItems
      const unevaluatedItemsMessage = schema['x-unevaluatedItems-message']
      const unevaluatedItemsArg = unevaluatedItemsMessage
        ? `,${valibotError(unevaluatedItemsMessage)}`
        : ''
      const tupleExpr =
        u !== undefined && u !== true && typeof u === 'object'
          ? `v.tupleWithRest([${items.join(',')}],${valibot(u, rootName, isValibot, options)})`
          : u === false
            ? `v.strictTuple([${items.join(',')}]${unevaluatedItemsArg})`
            : `v.tuple([${items.join(',')}])`
      const prefixItemsMessage = schema['x-prefixItems-message']
      const wrapped = prefixItemsMessage
        ? elementMessageWrap(tupleExpr, prefixItemsMessage)
        : tupleExpr
      return readonly(valibotWrap(wrapped, schema))
    }
    const items = schema.items ? valibot(schema.items, rootName, isValibot, options) : 'v.any()'
    const itemsMessage = schema['x-items-message']
    const arrayBase = `v.array(${items})`
    const base = itemsMessage ? elementMessageWrap(arrayBase, itemsMessage) : arrayBase
    const isFixedLength =
      typeof schema.minItems === 'number' &&
      typeof schema.maxItems === 'number' &&
      schema.minItems === schema.maxItems
    // Per-keyword messages
    const lengthMessage = schema['x-length-message']
    const minItemsMessage = schema['x-minItems-message'] ?? lengthMessage
    const minArg = minItemsMessage ? `,${valibotError(minItemsMessage)}` : ''
    const maxItemsMessage = schema['x-maxItems-message'] ?? lengthMessage
    const maxArg = maxItemsMessage ? `,${valibotError(maxItemsMessage)}` : ''
    const tupleItemsMessage = minItemsMessage ?? maxItemsMessage
    const sizeArg = tupleItemsMessage ? `,${valibotError(tupleItemsMessage)}` : ''
    const uniqueItemsMessage = schema['x-uniqueItems-message']
    const uniqueArg = uniqueItemsMessage ? `,${valibotError(uniqueItemsMessage)}` : ''
    // v3.0: contains / minContains / maxContains as separate checks
    const containsActions = (() => {
      const c = schema.contains
      if (!c) return [] as readonly string[]
      const containsSchema = valibot(c, rootName, isValibot, options)
      const minC = schema.minContains
      const maxC = schema.maxContains
      const errorMessage = schema['x-error-message']
      const fallback = schema['x-contains-message'] ?? errorMessage
      const out: string[] = []
      if (minC === undefined && maxC === undefined) {
        const containsArg = fallback ? `,${valibotError(fallback)}` : ''
        out.push(
          `v.check((arr)=>arr.some((i)=>v.safeParse(${containsSchema},i).success)${containsArg})`,
        )
      } else {
        const effectiveMin = minC ?? 1
        if (effectiveMin > 0) {
          const minContainsMessage = schema['x-minContains-message'] ?? fallback
          const minContainsArg = minContainsMessage ? `,${valibotError(minContainsMessage)}` : ''
          out.push(
            `v.check((arr)=>arr.filter((i)=>v.safeParse(${containsSchema},i).success).length>=${effectiveMin}${minContainsArg})`,
          )
        }
        if (maxC !== undefined) {
          const maxContainsMessage = schema['x-maxContains-message'] ?? fallback
          const maxContainsArg = maxContainsMessage ? `,${valibotError(maxContainsMessage)}` : ''
          out.push(
            `v.check((arr)=>arr.filter((i)=>v.safeParse(${containsSchema},i).success).length<=${maxC}${maxContainsArg})`,
          )
        }
      }
      return out
    })()
    // unevaluatedItems is handled in the prefixItems branch; with `items` alone,
    // JSON Schema 2020-12 §11.3 makes the keyword redundant.
    const actions = [
      isFixedLength ? `v.length(${schema.minItems}${sizeArg})` : undefined,
      !isFixedLength && typeof schema.minItems === 'number'
        ? `v.minLength(${schema.minItems}${minArg})`
        : undefined,
      !isFixedLength && typeof schema.maxItems === 'number'
        ? `v.maxLength(${schema.maxItems}${maxArg})`
        : undefined,
      schema.uniqueItems === true
        ? `v.check((items) => new Set(items).size === items.length${uniqueArg})`
        : undefined,
      ...containsActions,
    ].filter((v) => v !== undefined)
    const arrayExpr = actions.length > 0 ? `v.pipe(${base},${actions.join(',')})` : base
    return readonly(valibotWrap(arrayExpr, schema))
  }

  if (types.includes('object'))
    return readonly(valibotWrap(object(schema, rootName, isValibot, options), schema))
  if (types.includes('date')) {
    if (isStringWireParam) {
      return valibotWrap(`v.pipe(v.string(),v.transform((s)=>new Date(s)),v.date())`, schema)
    }
    return valibotWrap('v.date()', schema)
  }
  if (types.length === 1 && types[0] === 'null') return valibotWrap('v.null()', schema)

  return valibotWrap('v.any()', schema)
}
