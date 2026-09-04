import type { JSONSchema, ParamIn } from '../../parser/index.js'
import { effectError, makeSafeKey } from '../../utils/index.js'
import { effect, wholeValueMessage } from './effect.js'

/**
 * Generate an Effect Schema object node.
 *
 * Dispatches `additionalProperties` to `Schema.Record` (Schema), `Schema.Struct`
 * (otherwise). Combinators (oneOf/anyOf/allOf/not) delegate to the main
 * `effect` entry. JSON Schema 2020-12 keywords (`minProperties`,
 * `maxProperties`, `propertyNames`, `patternProperties`, `dependentRequired`)
 * become `Schema.makeFilter(...)` filters passed to the schema's `.check(...)`.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean,
  options?: { openapi?: boolean; readonly?: boolean; paramIn?: ParamIn },
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
  // x-additionalProperties-message / x-unevaluatedProperties-message: specific
  // keyword takes precedence (additionalProperties > unevaluatedProperties).
  const addlPropsMessage = schema['x-additionalProperties-message']
  const unevalPropsMessage =
    schema.unevaluatedProperties === false ? schema['x-unevaluatedProperties-message'] : undefined
  const strictExtrasMessage = addlPropsMessage ?? unevalPropsMessage

  const propertyNamesFilter = (): string => {
    if (schema.propertyNames?.pattern) {
      return `Schema.makeFilter((o)=>Object.keys(o).every((k)=>new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(k))${propNamesErrorArg})`
    }
    if (schema.propertyNames?.enum) {
      return `Schema.makeFilter((o)=>Object.keys(o).every((k)=>${JSON.stringify(schema.propertyNames.enum)}.includes(k))${propNamesErrorArg})`
    }
    return ''
  }

  const patternPropertiesFilters = (): readonly string[] =>
    schema.patternProperties
      ? Object.entries(schema.patternProperties).map(([pattern, propSchema]) => {
          const s = effect(propSchema, rootName, isEffect, options)
          return `Schema.makeFilter((o)=>Object.entries(o).every(([k,val])=>!new RegExp(${JSON.stringify(pattern)}).test(k)||Schema.is(${s})(val))${patternErrorArg})`
        })
      : []

  // ── additionalProperties: schema → Schema.Record(...) + propertyNames + patternProperties ──
  if (typeof schema.additionalProperties === 'object') {
    const record = `Schema.Record(Schema.String,${effect(schema.additionalProperties, rootName, isEffect, options)})`
    const checks = [propertyNamesFilter(), ...patternPropertiesFilters()].filter((a) => a !== '')
    return checks.length > 0 ? `${record}.check(${checks.join(',')})` : record
  }

  if (!schema.properties) {
    // v3.2: patternProperties without properties → unknown-typed Record + filter.
    if (schema.patternProperties) {
      const record = 'Schema.Record(Schema.String,Schema.Unknown)'
      const checks = [propertyNamesFilter(), ...patternPropertiesFilters()].filter((a) => a !== '')
      return checks.length > 0 ? `${record}.check(${checks.join(',')})` : record
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
      // `Schema.withDecodingDefault` already makes the encoded key optional, so
      // a defaulted property must not be wrapped again.
      const hasDecodingDefault = parsed.includes('Schema.withDecodingDefault(')
      return isRequired || hasDecodingDefault
        ? `${safeKey}:${parsed}`
        : `${safeKey}:Schema.optional(${parsed})`
    })
    .filter((p) => p !== null)

  // `if`/`then`/`else` sub-schemas may name keys the struct does not declare,
  // so the object has to keep unknown keys. v4 spells an index signature as
  // `Schema.StructWithRest(struct, [record])`.
  const conditionalKeysReferenced =
    schema.if !== undefined || schema.then !== undefined || schema.else !== undefined
  const struct = `Schema.Struct({${props.join(',')}})`
  const rawBase = conditionalKeysReferenced
    ? `Schema.StructWithRest(${struct},[Schema.Record(Schema.String,Schema.Unknown)])`
    : struct
  const propsMessage = schema['x-properties-message']
  const partialBase = propsMessage ? wholeValueMessage(rawBase, propsMessage) : rawBase

  const minPropertiesFilter =
    typeof schema.minProperties === 'number'
      ? `Schema.makeFilter((o)=>Object.keys(o).length>=${schema.minProperties}${minErrorArg})`
      : ''
  const maxPropertiesFilter =
    typeof schema.maxProperties === 'number'
      ? `Schema.makeFilter((o)=>Object.keys(o).length<=${schema.maxProperties}${maxErrorArg})`
      : ''
  const dependentRequiredFilters: readonly string[] = schema.dependentRequired
    ? Object.entries(schema.dependentRequired).map(([key, deps]) => {
        const depsCheck = deps.map((d) => `'${d}' in o`).join('&&')
        return `Schema.makeFilter((o)=>!('${key}' in o)||(${depsCheck})${depReqErrorArg})`
      })
    : []
  // v3.0: dependentSchemas — when key present, the whole object must
  // additionally satisfy the named sub-schema.
  const dependentSchemasFilters: readonly string[] = schema.dependentSchemas
    ? Object.entries(schema.dependentSchemas).map(([key, subSchema]) => {
        const s = effect(subSchema, rootName, isEffect, options)
        return `Schema.makeFilter((o)=>!('${key}' in o)||Schema.is(${s})(o)${depSchErrorArg})`
      })
    : []
  // Effect Schema enforces strict decoding via the `parseOptions` annotation,
  // which sets `onExcessProperty: 'error'` at schema level. v4 reports an
  // unexpected key as its own issue, so the custom message goes on
  // `messageUnexpectedKey` rather than the node-wide `message`.
  const isStrictExtras =
    schema.additionalProperties === false || schema.unevaluatedProperties === false
  const strictExtrasAnnotation = isStrictExtras
    ? strictExtrasMessage
      ? `.annotate({parseOptions:{onExcessProperty:"error"},messageUnexpectedKey:${JSON.stringify(strictExtrasMessage)}})`
      : `.annotate({parseOptions:{onExcessProperty:"error"}})`
    : ''

  // v3.2: if/then/else conditional schema. Routed through a filter: when `if`
  // matches, the object must also satisfy `then`; otherwise `else`.
  const ifThenElseFilters = (() => {
    if (!schema.if) return []
    const ifSchema = effect(schema.if, rootName, isEffect, options)
    const thenSchema = schema.then ? effect(schema.then, rootName, isEffect, options) : ''
    const elseSchema = schema.else ? effect(schema.else, rootName, isEffect, options) : ''
    if (!thenSchema && !elseSchema) return []
    const ifMessage = schema['x-if-message']
    const thenMessage = schema['x-then-message'] ?? ifMessage
    const elseMessage = schema['x-else-message'] ?? ifMessage
    const parts: string[] = []
    if (thenSchema) {
      const arg = thenMessage ? `,${effectError(thenMessage)}` : errorArg
      parts.push(
        `Schema.makeFilter((o)=>!Schema.is(${ifSchema})(o)||Schema.is(${thenSchema})(o)${arg})`,
      )
    }
    if (elseSchema) {
      const arg = elseMessage ? `,${effectError(elseMessage)}` : errorArg
      parts.push(
        `Schema.makeFilter((o)=>Schema.is(${ifSchema})(o)||Schema.is(${elseSchema})(o)${arg})`,
      )
    }
    return parts
  })()

  const checks = [
    minPropertiesFilter,
    maxPropertiesFilter,
    propertyNamesFilter(),
    ...patternPropertiesFilters(),
    ...dependentRequiredFilters,
    ...dependentSchemasFilters,
    ...ifThenElseFilters,
  ].filter((a) => a !== '')

  const checked = checks.length > 0 ? `${partialBase}.check(${checks.join(',')})` : partialBase
  return `${checked}${strictExtrasAnnotation}`
}
