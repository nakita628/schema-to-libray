import { isDeepLocalPointer, typeboxWrap } from '../../helper/index.js'
import { typeboxDefaultOpt, typeboxMetaOpts } from '../../helper/meta.js'
import type { JSONSchema, ParamIn } from '../../parser/index.js'
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
 * Emits a single-argument TypeBox factory call (`Type.X({opts})`), embedding
 * any meta options from the schema. Returns `Type.X()` when no options.
 */
function tbPrim(name: string, schema: JSONSchema, extraOpts: readonly string[] = []): string {
  const opts = [...extraOpts, ...typeboxMetaOpts(schema), ...typeboxDefaultOpt(schema)]
  return opts.length === 0 ? `${name}()` : `${name}({${opts.join(',')}})`
}

/**
 * The `Type.String(...)` input of a string-wire coercion `Codec`. A query/path
 * default is carried here in its string-wire form (`{default:'1'}`), since the
 * Codec decodes from a string.
 */
function wireString(schema: JSONSchema): string {
  const defaultOpt = typeboxDefaultOpt(schema, true)
  return defaultOpt.length > 0 ? `Type.String({${defaultOpt.join(',')}})` : 'Type.String()'
}

/**
 * Emits a two-argument TypeBox factory call (`Type.X(payload, {opts})`),
 * embedding any meta options from the schema. Returns `Type.X(payload)` when
 * no options.
 */
function tbComp(
  name: string,
  payload: string,
  schema: JSONSchema,
  extraOpts: readonly string[] = [],
): string {
  const opts = [...extraOpts, ...typeboxMetaOpts(schema), ...typeboxDefaultOpt(schema)]
  return opts.length === 0 ? `${name}(${payload})` : `${name}(${payload},{${opts.join(',')}})`
}

export function typebox(
  schema: JSONSchema,
  rootName: string = 'Schema',
  isTypebox: boolean = false,
  options?: { openapi?: boolean; readonly?: boolean; paramIn?: ParamIn },
): string {
  const isStringWireParam =
    (options?.paramIn === 'query' || options?.paramIn === 'path') && schema['x-coerce'] !== false
  const readonly = (v: string) => (options?.readonly ? `Type.Readonly(${v})` : v)

  if (schema.$ref) {
    const ref = (s: JSONSchema): string => {
      if (s.$ref === '#' || s.$ref === '') {
        return typeboxWrap(tbComp('Type.Recursive', `(_Self) => ${rootName}`, s), s)
      }
      if (typeof s.$ref === 'string' && isDeepLocalPointer(s.$ref)) {
        return typeboxWrap('Type.Unknown()', s)
      }
      if (options?.openapi && s.$ref) {
        const resolved = resolveOpenAPIRef(s.$ref)
        if (resolved) {
          if (resolved === rootName)
            return typeboxWrap(tbComp('Type.Recursive', `(_Self) => ${resolved}`, s), s)
          return typeboxWrap(resolved, s)
        }
      }
      const toName = options?.openapi ? toIdentifierPascalCase : toPascalCase
      const REF_PREFIXES = ['#/components/schemas/', '#/definitions/', '#/$defs/'] as const
      for (const prefix of REF_PREFIXES) {
        if (s.$ref?.startsWith(prefix)) {
          return typeboxWrap(toName(s.$ref.slice(prefix.length)), s)
        }
      }
      if (s.$ref?.startsWith('#')) {
        const refName = s.$ref.slice(1)
        return refName === '' ? rootName : toName(refName)
      }
      if (s.$ref?.includes('#')) return 'Type.Unknown()'
      if (s.$ref?.startsWith('http')) {
        const last = s.$ref.split('/').at(-1)
        if (last) return last.replace(/\.json$/, '')
      }
      return 'Type.Any()'
    }
    if (schema.type === 'array' && schema.items?.$ref) {
      return `Type.Array(${typeboxWrap(ref(schema.items), schema.items)})`
    }
    return typeboxWrap(ref(schema), schema)
  }

  const messageOpt = (msg: unknown): readonly string[] =>
    typeof msg === 'string' ? [`errorMessage:${JSON.stringify(msg)}`] : []

  if (schema.oneOf) {
    if (!schema.oneOf.length) return typeboxWrap(tbPrim('Type.Any', schema), schema)
    const schemas = schema.oneOf.map((s) => typebox(s, rootName, isTypebox, options))
    return typeboxWrap(
      tbComp('Type.Union', `[${schemas.join(',')}]`, schema, messageOpt(schema['x-oneOf-message'])),
      schema,
    )
  }

  if (schema.anyOf) {
    if (!schema.anyOf.length) return typeboxWrap(tbPrim('Type.Any', schema), schema)
    const schemas = schema.anyOf.map((s) => typebox(s, rootName, isTypebox, options))
    const anyOfMessage = schema['x-implication-message'] ?? schema['x-anyOf-message']
    return typeboxWrap(
      tbComp('Type.Union', `[${schemas.join(',')}]`, schema, messageOpt(anyOfMessage)),
      schema,
    )
  }

  if (schema.allOf) {
    if (!schema.allOf.length) return typeboxWrap(tbPrim('Type.Any', schema), schema)
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
      .map((s) => typebox(s, rootName, isTypebox, options))
    if (!schemas.length) return typeboxWrap(tbPrim('Type.Any', schema), { ...schema, nullable })
    const baseResult =
      schemas.length === 1
        ? schemas[0]
        : tbComp(
            'Type.Intersect',
            `[${schemas.join(',')}]`,
            schema,
            messageOpt(schema['x-allOf-message']),
          )
    if (defaultValue !== undefined) {
      const formatLiteral =
        typeof defaultValue === 'boolean' || typeof defaultValue === 'number'
          ? `${defaultValue}`
          : JSON.stringify(defaultValue)
      // TypeBox v1's `Type.Optional` takes one arg, so the default must live in an
      // inner type's options. Carry it on the `Type.Intersect` wrapper (a single
      // member intersect is the identity, so this is valid for both arities).
      const intersectOpts = [...messageOpt(schema['x-allOf-message']), `default:${formatLiteral}`]
      const baseWithDefault = `Type.Intersect([${schemas.join(',')}],{${intersectOpts.join(',')}})`
      const withDefault = `Type.Optional(${baseWithDefault})`
      return nullable ? `Type.Union([${withDefault},Type.Null()])` : withDefault
    }
    return typeboxWrap(baseResult, { ...schema, nullable })
  }

  if (schema.not) {
    // TypeBox v1 does not expose a runtime `Type.Not(...)` constructor and
    // `Value.Check` does not evaluate the JSON Schema `not` keyword. We emit
    // a permissive `Type.Any()` fallback so the generated file still imports,
    // and surface the omission via a file-level marker in `index.ts`.
    // `x-not-message` rides through `errorMessage` for ajv-compatible
    // downstreams; TypeBox's own `Value.Check` will not surface it.
    return typeboxWrap(tbPrim('Type.Any', schema, messageOpt(schema['x-not-message'])), schema)
  }

  if (schema.const !== undefined) {
    // v3.0: x-const-message overrides x-error-message for literal mismatch.
    const constMessage = schema['x-const-message'] ?? schema['x-error-message']
    // `TLiteralValue` is scalar-only and excludes null: a null const becomes
    // Type.Null(), and an array/object const degrades to Type.Any() (the same
    // fallback the enum path uses for composite members).
    if (schema.const === null) {
      return typeboxWrap(tbPrim('Type.Null', schema, messageOpt(constMessage)), schema)
    }
    if (typeof schema.const === 'object') {
      return typeboxWrap(tbPrim('Type.Any', schema, messageOpt(constMessage)), schema)
    }
    return typeboxWrap(
      tbComp('Type.Literal', JSON.stringify(schema.const), schema, messageOpt(constMessage)),
      schema,
    )
  }
  if (schema.enum) return typeboxWrap(_enum(schema), schema)
  if (schema.properties)
    return readonly(typeboxWrap(object(schema, rootName, isTypebox, options), schema))

  const types = normalizeTypes(schema.type)
  if (types.includes('string')) return typeboxWrap(string(schema), schema)
  if (types.includes('number')) {
    const base = number(schema)
    if (isStringWireParam) {
      const wire = wireString(schema)
      return typeboxWrap(`Codec(${wire}).Decode((v)=>Number(v)).Encode((v)=>String(v))`, schema)
    }
    return typeboxWrap(base, schema)
  }
  if (types.includes('integer')) {
    const base = integer(schema)
    if (isStringWireParam) {
      const wire = wireString(schema)
      return typeboxWrap(
        `Codec(${wire}).Decode((v)=>Number.parseInt(v,10)).Encode((v)=>String(v))`,
        schema,
      )
    }
    return typeboxWrap(base, schema)
  }
  if (types.includes('boolean')) {
    if (isStringWireParam) {
      const defaultOpt = typeboxDefaultOpt(schema, true)
      const union =
        defaultOpt.length > 0
          ? `Type.Union([Type.Literal('true'),Type.Literal('false')],{${defaultOpt.join(',')}})`
          : `Type.Union([Type.Literal('true'),Type.Literal('false')])`
      return typeboxWrap(
        `Codec(${union}).Decode((v)=>v==='true').Encode((v)=>v?'true':'false')`,
        schema,
      )
    }
    return typeboxWrap(tbPrim('Type.Boolean', schema), schema)
  }

  if (types.includes('array')) {
    if (schema.prefixItems?.length) {
      const items = schema.prefixItems.map((s) => typebox(s, rootName, isTypebox, options))
      const prefixItemsMessage = schema['x-prefixItems-message']
      const tupleOpts = prefixItemsMessage
        ? [
            `errorMessage:{prefixItems:${JSON.stringify(prefixItemsMessage)},items:${JSON.stringify(prefixItemsMessage)}}`,
          ]
        : []
      return readonly(
        typeboxWrap(tbComp('Type.Tuple', `[${items.join(',')}]`, schema, tupleOpts), schema),
      )
    }
    const items = schema.items ? typebox(schema.items, rootName, isTypebox, options) : 'Type.Any()'
    // v3.0: per-keyword array messages aggregated into ajv-errors errorMessage.
    const arrayErrorMessageEntries: string[] = []
    const arrayErrorMessage = schema['x-error-message']
    if (arrayErrorMessage)
      arrayErrorMessageEntries.push(`type:${JSON.stringify(arrayErrorMessage)}`)
    const arrayLengthMessage = schema['x-length-message']
    const arrayMinItemsMessage =
      schema['x-minItems-message'] ??
      (typeof schema.minItems === 'number' ? arrayLengthMessage : undefined)
    if (arrayMinItemsMessage)
      arrayErrorMessageEntries.push(`minItems:${JSON.stringify(arrayMinItemsMessage)}`)
    const arrayMaxItemsMessage =
      schema['x-maxItems-message'] ??
      (typeof schema.maxItems === 'number' ? arrayLengthMessage : undefined)
    if (arrayMaxItemsMessage)
      arrayErrorMessageEntries.push(`maxItems:${JSON.stringify(arrayMaxItemsMessage)}`)
    const arrayUniqueItemsMessage = schema['x-uniqueItems-message']
    if (arrayUniqueItemsMessage)
      arrayErrorMessageEntries.push(`uniqueItems:${JSON.stringify(arrayUniqueItemsMessage)}`)
    const arrayContainsMessage = schema['x-contains-message']
    if (arrayContainsMessage)
      arrayErrorMessageEntries.push(`contains:${JSON.stringify(arrayContainsMessage)}`)
    const arrayMinContainsMessage = schema['x-minContains-message']
    if (arrayMinContainsMessage)
      arrayErrorMessageEntries.push(`minContains:${JSON.stringify(arrayMinContainsMessage)}`)
    const arrayMaxContainsMessage = schema['x-maxContains-message']
    if (arrayMaxContainsMessage)
      arrayErrorMessageEntries.push(`maxContains:${JSON.stringify(arrayMaxContainsMessage)}`)
    const arrayItemsMessage = schema['x-items-message']
    if (arrayItemsMessage)
      arrayErrorMessageEntries.push(`items:${JSON.stringify(arrayItemsMessage)}`)
    const arrayUnevaluatedItemsMessage = schema['x-unevaluatedItems-message']
    if (arrayUnevaluatedItemsMessage)
      arrayErrorMessageEntries.push(
        `unevaluatedItems:${JSON.stringify(arrayUnevaluatedItemsMessage)}`,
      )
    const arrayOpts = [
      typeof schema.minItems === 'number' ? `minItems:${schema.minItems}` : undefined,
      typeof schema.maxItems === 'number' ? `maxItems:${schema.maxItems}` : undefined,
      schema.uniqueItems === true ? `uniqueItems:true` : undefined,
      arrayErrorMessageEntries.length > 0
        ? `errorMessage:{${arrayErrorMessageEntries.join(',')}}`
        : undefined,
    ].filter((v) => v !== undefined)
    return readonly(typeboxWrap(tbComp('Type.Array', items, schema, arrayOpts), schema))
  }

  if (types.includes('object'))
    return readonly(typeboxWrap(object(schema, rootName, isTypebox, options), schema))
  if (types.includes('date')) {
    if (isStringWireParam) {
      const wire = wireString(schema)
      return typeboxWrap(
        `Codec(${wire}).Decode((v)=>new Date(v)).Encode((v)=>v.toISOString())`,
        schema,
      )
    }
    return typeboxWrap(tbPrim('Type.Date', schema), schema)
  }
  if (types.length === 1 && types[0] === 'null')
    return typeboxWrap(tbPrim('Type.Null', schema), schema)

  return typeboxWrap(tbPrim('Type.Any', schema), schema)
}
