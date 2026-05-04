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
  const minimumMessage = schema['x-minimum-message']
  const minErrorArg = minimumMessage ? `,${effectError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maximum-message']
  const maxErrorArg = maximumMessage ? `,${effectError(maximumMessage)}` : ''
  const patternMessage = schema['x-pattern-message']
  const patternErrorArg = patternMessage ? `,${effectError(patternMessage)}` : ''
  const propNamesMessage = schema['x-propertyNames-message']
  const propNamesErrorArg = propNamesMessage
    ? `,${effectError(propNamesMessage)}`
    : patternErrorArg
  const depReqMessage = schema['x-dependentRequired-message']
  const depReqErrorArg = depReqMessage ? `,${effectError(depReqMessage)}` : errorArg

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
    const actions = [propertyNamesFilter(), ...patternPropertiesFilters()].filter(
      (a) => a !== '',
    )
    return actions.length > 0 ? `${record}.pipe(${actions.join(',')})` : record
  }

  if (!schema.properties) {
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
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:Schema.optional(${parsed})`
    })
    .filter((p) => p !== null)

  const partialBase =
    required.length === 0 && props.every((p) => p.includes('Schema.optional('))
      ? `Schema.partial(Schema.Struct({${props
          .map((p) => p.replace(/^(.+?):Schema\.optional\((.+)\)$/, '$1:$2'))
          .join(',')}}))`
      : `Schema.Struct({${props.join(',')}})`

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

  const actions = [
    minPropertiesFilter,
    maxPropertiesFilter,
    propertyNamesFilter(),
    ...patternPropertiesFilters(),
    ...dependentRequiredFilters,
  ].filter((a) => a !== '')

  return actions.length > 0 ? `${partialBase}.pipe(${actions.join(',')})` : partialBase
}
