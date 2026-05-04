import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey, valibotError } from '../../utils/index.js'
import { valibot } from './valibot.js'

/**
 * Generate a Valibot object schema for a JSON Schema object node.
 *
 * Dispatches `additionalProperties` to `v.looseObject` (true), `v.strictObject`
 * (false), `v.record` (Schema), or default `v.object`. Combinators
 * (oneOf/anyOf/allOf/not) delegate to the main `valibot` entry. JSON Schema
 * 2020-12 keywords (`minProperties`, `maxProperties`, `propertyNames`,
 * `patternProperties`, `dependentRequired`) are emitted as `v.check(...)`
 * actions composed via `v.pipe(...)`.
 *
 * NOTE: `v.pipe(base, v.readonly())` is appended by the dispatcher
 * (`valibot.ts:readonly`), so this function does NOT add it itself.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isValibot: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return valibot(schema, rootName, isValibot, options)
  }

  const errorMessage = schema['x-error-message']
  const errorArg = errorMessage ? `,${valibotError(errorMessage)}` : ''
  const minimumMessage = schema['x-minimum-message']
  const minErrorArg = minimumMessage ? `,${valibotError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maximum-message']
  const maxErrorArg = maximumMessage ? `,${valibotError(maximumMessage)}` : ''
  const patternMessage = schema['x-pattern-message']
  const patternErrorArg = patternMessage ? `,${valibotError(patternMessage)}` : ''
  const propNamesMessage = schema['x-propertyNames-message']
  const propNamesErrorArg = propNamesMessage
    ? `,${valibotError(propNamesMessage)}`
    : patternErrorArg
  const depReqMessage = schema['x-dependentRequired-message']
  const depReqErrorArg = depReqMessage ? `,${valibotError(depReqMessage)}` : errorArg

  const propertyNamesCheck = (): string => {
    if (schema.propertyNames?.pattern) {
      return `v.check((o)=>Object.keys(o).every((k)=>new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(k))${propNamesErrorArg})`
    }
    if (schema.propertyNames?.enum) {
      return `v.check((o)=>Object.keys(o).every((k)=>${JSON.stringify(schema.propertyNames.enum)}.includes(k))${propNamesErrorArg})`
    }
    return ''
  }

  const patternPropertiesChecks = (): readonly string[] =>
    schema.patternProperties
      ? Object.entries(schema.patternProperties).map(([pattern, propSchema]) => {
          const s = valibot(propSchema, rootName, isValibot, options)
          return `v.check((o)=>Object.entries(o).every(([k,val])=>!new RegExp(${JSON.stringify(pattern)}).test(k)||v.safeParse(${s},val).success)${patternErrorArg})`
        })
      : []

  // ── additionalProperties: schema → v.record(...) + propertyNames + patternProperties ──
  if (typeof schema.additionalProperties === 'object') {
    const record = `v.record(v.string(),${valibot(schema.additionalProperties, rootName, isValibot, options)})`
    const actions = [propertyNamesCheck(), ...patternPropertiesChecks()].filter((a) => a !== '')
    return actions.length > 0 ? `v.pipe(${record},${actions.join(',')})` : record
  }

  if (!schema.properties) {
    if (schema.additionalProperties === true) return 'v.any()'
    return 'v.object({})'
  }

  const objectKind =
    schema.additionalProperties === true
      ? 'looseObject'
      : schema.additionalProperties === false
        ? 'strictObject'
        : 'object'
  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties)
    .map(([key, propSchema]) => {
      const parsed = valibot(propSchema, rootName, isValibot, options)
      if (!parsed) return null
      const safeKey = makeSafeKey(key)
      const isRequired = required.includes(key)
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:v.optional(${parsed})`
    })
    .filter((p) => p !== null)

  const partialBase =
    required.length === 0 && props.every((p) => p.includes('v.optional('))
      ? `v.partial(v.${objectKind}({${props
          .map((p) => p.replace(/^(.+?):v\.optional\((.+)\)$/, '$1:$2'))
          .join(',')}}))`
      : `v.${objectKind}({${props.join(',')}})`

  const minPropertiesCheck =
    typeof schema.minProperties === 'number'
      ? `v.check((o)=>Object.keys(o).length>=${schema.minProperties}${minErrorArg})`
      : ''
  const maxPropertiesCheck =
    typeof schema.maxProperties === 'number'
      ? `v.check((o)=>Object.keys(o).length<=${schema.maxProperties}${maxErrorArg})`
      : ''
  const dependentRequiredChecks: readonly string[] = schema.dependentRequired
    ? Object.entries(schema.dependentRequired).map(([key, deps]) => {
        const depsCheck = deps.map((d) => `'${d}' in o`).join('&&')
        return `v.check((o)=>!('${key}' in o)||(${depsCheck})${depReqErrorArg})`
      })
    : []

  const actions = [
    minPropertiesCheck,
    maxPropertiesCheck,
    propertyNamesCheck(),
    ...patternPropertiesChecks(),
    ...dependentRequiredChecks,
  ].filter((a) => a !== '')

  return actions.length > 0 ? `v.pipe(${partialBase},${actions.join(',')})` : partialBase
}
