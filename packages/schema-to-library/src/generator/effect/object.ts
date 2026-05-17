import type { JSONSchema } from '../../parser/index.js'
import { effectError, makeSafeKey } from '../../utils/index.js'
import { effect } from './effect.js'

/**
 * Generate an Effect Schema object node.
 *
 * Dispatches `additionalProperties` to `Schema.Record` (Schema), `Schema.Struct`
 * (otherwise). Combinators (oneOf/anyOf/allOf/not) delegate to the main
 * `effect` entry. JSON Schema 2020-12 keywords (`minProperties`,
 * `maxProperties`, `propertyNames`, `patternProperties`, `dependentRequired`)
 * are emitted as `Schema.filter(...)` actions composed via `.pipe(...)`.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return effect(schema, rootName, isEffect, options)
  }

  const errorMessage = schema['x-error-message']
  const errorArg = errorMessage ? `,${effectError(errorMessage)}` : ''
  const minimumMessage = schema['x-minProperties-message']
  const minErrorArg = minimumMessage ? `,${effectError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maxProperties-message']
  const maxErrorArg = maximumMessage ? `,${effectError(maximumMessage)}` : ''
  // v3.0: 1 keyword = 1 message
  const patternPropsMessage = schema['x-patternProperties-message']
  const patternErrorArg = patternPropsMessage ? `,${effectError(patternPropsMessage)}` : ''
  const propNamesMessage = schema['x-propertyNames-message']
  const propNamesErrorArg = propNamesMessage ? `,${effectError(propNamesMessage)}` : ''
  const depReqMessage = schema['x-dependentRequired-message']
  const depReqErrorArg = depReqMessage ? `,${effectError(depReqMessage)}` : errorArg
  const depSchMessage = schema['x-dependentSchemas-message']
  const depSchErrorArg = depSchMessage ? `,${effectError(depSchMessage)}` : errorArg
  const addlPropsMessage = schema['x-additionalProperties-message']
  const addlPropsErrorArg = addlPropsMessage ? `,${effectError(addlPropsMessage)}` : ''

  const propertyNamesFilter = (): string => {
    if (schema.propertyNames?.pattern) {
      return `Schema.filter((o)=>Object.keys(o).every((k)=>new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(k))${propNamesErrorArg})`
    }
    if (schema.propertyNames?.enum) {
      return `Schema.filter((o)=>Object.keys(o).every((k)=>${JSON.stringify(schema.propertyNames.enum)}.includes(k))${propNamesErrorArg})`
    }
    return ''
  }

  const patternPropertiesFilters = (): readonly string[] =>
    schema.patternProperties
      ? Object.entries(schema.patternProperties).map(([pattern, propSchema]) => {
          const s = effect(propSchema, rootName, isEffect, options)
          return `Schema.filter((o)=>Object.entries(o).every(([k,val])=>!new RegExp(${JSON.stringify(pattern)}).test(k)||Schema.is(${s})(val))${patternErrorArg})`
        })
      : []

  // ── additionalProperties: schema → Schema.Record(...) + propertyNames + patternProperties ──
  if (typeof schema.additionalProperties === 'object') {
    const record = `Schema.Record({key:Schema.String,value:${effect(schema.additionalProperties, rootName, isEffect, options)}})`
    const actions = [propertyNamesFilter(), ...patternPropertiesFilters()].filter((a) => a !== '')
    return actions.length > 0 ? `${record}.pipe(${actions.join(',')})` : record
  }

  if (!schema.properties) {
    // v3.2: patternProperties without properties → unknown-typed Record + filter.
    if (schema.patternProperties) {
      const record = 'Schema.Record({key:Schema.String,value:Schema.Unknown})'
      const actions = [propertyNamesFilter(), ...patternPropertiesFilters()].filter((a) => a !== '')
      return actions.length > 0 ? `${record}.pipe(${actions.join(',')})` : record
    }
    if (schema.additionalProperties === true) return 'Schema.Unknown'
    return 'Schema.Struct({})'
  }

  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties)
    .map(([key, propSchema]) => {
      const parsed = effect(propSchema, rootName, isEffect, options)
      if (!parsed) return null
      const safeKey = makeSafeKey(key)
      const isRequired = required.includes(key)
      // Schema.optionalWith already returns a PropertySignature; do not double-wrap.
      const isAlreadyPropertySignature = parsed.startsWith('Schema.optionalWith(')
      return isRequired || isAlreadyPropertySignature
        ? `${safeKey}:${parsed}`
        : `${safeKey}:Schema.optional(${parsed})`
    })
    .filter((p) => p !== null)

  // Schema.partial cannot wrap a Struct that already contains transformation-bearing
  // PropertySignatures (e.g. Schema.optionalWith with default), so only use the
  // partial shorthand when every prop is a plain Schema.optional(Schema) wrapper.
  const rawBase =
    required.length === 0 &&
    props.length > 0 &&
    props.every((p) => /:Schema\.optional\(/.test(p) && !/Schema\.optionalWith\(/.test(p))
      ? `Schema.partial(Schema.Struct({${props
          .map((p) => p.replace(/^(.+?):Schema\.optional\((.+)\)$/, '$1:$2'))
          .join(',')}}))`
      : `Schema.Struct({${props.join(',')}})`
  const propsMessage = schema['x-properties-message']
  const partialBase = propsMessage
    ? (() => {
        const isArrow = /^\s*\(.*?\)\s*=>/.test(propsMessage)
        const msgExpr = isArrow ? `(${propsMessage})(issue)` : JSON.stringify(propsMessage)
        return `Schema.transformOrFail(Schema.Unknown,${rawBase},{decode:(input,_opts,ast)=>{const result=Schema.decodeUnknownEither(${rawBase})(input);return Either.isLeft(result)?ParseResult.fail(new ParseResult.Type(ast,input,${msgExpr})):ParseResult.succeed(result.right)},encode:ParseResult.succeed})`
      })()
    : rawBase

  const minPropertiesFilter =
    typeof schema.minProperties === 'number'
      ? `Schema.filter((o)=>Object.keys(o).length>=${schema.minProperties}${minErrorArg})`
      : ''
  const maxPropertiesFilter =
    typeof schema.maxProperties === 'number'
      ? `Schema.filter((o)=>Object.keys(o).length<=${schema.maxProperties}${maxErrorArg})`
      : ''
  const dependentRequiredFilters: readonly string[] = schema.dependentRequired
    ? Object.entries(schema.dependentRequired).map(([key, deps]) => {
        const depsCheck = deps.map((d) => `'${d}' in o`).join('&&')
        return `Schema.filter((o)=>!('${key}' in o)||(${depsCheck})${depReqErrorArg})`
      })
    : []
  // v3.0: dependentSchemas — when key present, the whole object must
  // additionally satisfy the named sub-schema.
  const dependentSchemasFilters: readonly string[] = schema.dependentSchemas
    ? Object.entries(schema.dependentSchemas).map(([key, subSchema]) => {
        const s = effect(subSchema, rootName, isEffect, options)
        return `Schema.filter((o)=>!('${key}' in o)||Schema.is(${s})(o)${depSchErrorArg})`
      })
    : []
  // v3.0: x-additionalProperties-message rejects extras when
  // additionalProperties: false.
  const additionalPropertiesFilter =
    schema.additionalProperties === false && addlPropsMessage
      ? `Schema.filter((o)=>Object.keys(o).every((k)=>${JSON.stringify(Object.keys(schema.properties))}.includes(k))${addlPropsErrorArg})`
      : ''

  // v3.2: if/then/else conditional schema. Routed through Schema.filter:
  // when `if` matches, the object must also satisfy `then`; otherwise `else`.
  const ifThenElseFilter = (() => {
    if (!schema.if) return ''
    const ifSchema = effect(schema.if, rootName, isEffect, options)
    const thenSchema = schema.then ? effect(schema.then, rootName, isEffect, options) : ''
    const elseSchema = schema.else ? effect(schema.else, rootName, isEffect, options) : ''
    if (!thenSchema && !elseSchema) return ''
    const thenCheck = thenSchema ? `Schema.is(${thenSchema})(o)` : 'true'
    const elseCheck = elseSchema ? `Schema.is(${elseSchema})(o)` : 'true'
    return `Schema.filter((o)=>Schema.is(${ifSchema})(o)?${thenCheck}:${elseCheck}${errorArg})`
  })()

  const actions = [
    minPropertiesFilter,
    maxPropertiesFilter,
    propertyNamesFilter(),
    ...patternPropertiesFilters(),
    ...dependentRequiredFilters,
    ...dependentSchemasFilters,
    additionalPropertiesFilter,
    ifThenElseFilter,
  ].filter((a) => a !== '')

  return actions.length > 0 ? `${partialBase}.pipe(${actions.join(',')})` : partialBase
}
