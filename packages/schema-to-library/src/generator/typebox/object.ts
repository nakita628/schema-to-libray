import { typeboxMetaOpts } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey } from '../../utils/index.js'
import { typebox } from './typebox.js'

/**
 * Generate a TypeBox object schema for a JSON Schema object node.
 *
 * Combinators (oneOf/anyOf/allOf/not) delegate to the main `typebox` entry.
 * JSON Schema 2020-12 keywords (`minProperties`, `maxProperties`,
 * `propertyNames`, `patternProperties`, `dependentRequired`) are emitted as
 * options on the `Type.Object(payload, opts)` constructor — TypeBox forwards
 * these to AJV at runtime.
 *
 * Note: TypeBox has no native runtime refinement API, so all advanced
 * keywords are passed through as JSON Schema options. Custom error messages
 * (via `x-*-message` extensions) are not emitted because TypeBox / AJV require
 * the optional `ajv-errors` plugin for that — we keep generation portable.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isTypebox: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return typebox(schema, rootName, isTypebox, options)
  }

  // ── additionalProperties: schema → Type.Record(...) ──
  if (typeof schema.additionalProperties === 'object') {
    const value = typebox(schema.additionalProperties, rootName, isTypebox, options)
    const recordOpts = [
      ...buildAdvancedOpts(schema, rootName, isTypebox, options),
      ...typeboxMetaOpts(schema),
    ].filter((v) => v !== undefined)
    return recordOpts.length === 0
      ? `Type.Record(Type.String(),${value})`
      : `Type.Record(Type.String(),${value},{${recordOpts.join(',')}})`
  }

  if (!schema.properties) {
    if (schema.additionalProperties === true) return 'Type.Any()'
    const emptyOpts = [
      ...buildAdvancedOpts(schema, rootName, isTypebox, options),
      ...typeboxMetaOpts(schema),
    ].filter((v) => v !== undefined)
    return emptyOpts.length === 0 ? 'Type.Object({})' : `Type.Object({},{${emptyOpts.join(',')}})`
  }

  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties)
    .map(([key, propSchema]) => {
      const parsed = typebox(propSchema, rootName, isTypebox, options)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const safeKey = makeSafeKey(key)
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:Type.Optional(${parsed})`
    })
    .filter((p) => p !== null)

  // v3.0: aggregate all v3.0 object-related x-*-message extensions
  // into a single ajv-errors–compatible `errorMessage` annotation.
  const objErrMsgEntries: string[] = []
  const objErrorMsg = schema['x-error-message']
  if (objErrorMsg) objErrMsgEntries.push(`type:${JSON.stringify(objErrorMsg)}`)
  const objMinPropsMsg = schema['x-minProperties-message']
  if (objMinPropsMsg) objErrMsgEntries.push(`minProperties:${JSON.stringify(objMinPropsMsg)}`)
  const objMaxPropsMsg = schema['x-maxProperties-message']
  if (objMaxPropsMsg) objErrMsgEntries.push(`maxProperties:${JSON.stringify(objMaxPropsMsg)}`)
  const objAddlPropsMsg = schema['x-additionalProperties-message']
  if (objAddlPropsMsg)
    objErrMsgEntries.push(`additionalProperties:${JSON.stringify(objAddlPropsMsg)}`)
  const objPropNamesMsg = schema['x-propertyNames-message']
  if (objPropNamesMsg) objErrMsgEntries.push(`propertyNames:${JSON.stringify(objPropNamesMsg)}`)
  const objPatternPropsMsg = schema['x-patternProperties-message']
  if (objPatternPropsMsg)
    objErrMsgEntries.push(`patternProperties:${JSON.stringify(objPatternPropsMsg)}`)
  const objDepReqMsg = schema['x-dependentRequired-message']
  if (objDepReqMsg) objErrMsgEntries.push(`dependentRequired:${JSON.stringify(objDepReqMsg)}`)
  const objDepSchMsg = schema['x-dependentSchemas-message']
  if (objDepSchMsg) objErrMsgEntries.push(`dependentSchemas:${JSON.stringify(objDepSchMsg)}`)
  const objReqMsg = schema['x-required-message']
  if (objReqMsg) objErrMsgEntries.push(`required:${JSON.stringify(objReqMsg)}`)
  const objErrMsg =
    objErrMsgEntries.length > 0 ? `errorMessage:{${objErrMsgEntries.join(',')}}` : undefined
  const optParts = [
    schema.additionalProperties === false ? 'additionalProperties:false' : undefined,
    ...buildAdvancedOpts(schema, rootName, isTypebox, options),
    objErrMsg,
    ...typeboxMetaOpts(schema),
  ].filter((v) => v !== undefined)
  const opts = optParts.length > 0 ? `,{${optParts.join(',')}}` : ''
  return `Type.Object({${props.join(',')}}${opts})`
}

/**
 * Build TypeBox option entries for advanced JSON Schema 2020-12 keywords.
 * Returns an array of `'key:value'` strings ready to be joined into `{...}`.
 */
function buildAdvancedOpts(
  schema: JSONSchema,
  rootName: string,
  isTypebox: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
): readonly (string | undefined)[] {
  const propertyNamesOpt = schema.propertyNames
    ? `propertyNames:${typebox(schema.propertyNames, rootName, isTypebox, options)}`
    : undefined
  const patternPropertiesOpt = schema.patternProperties
    ? `patternProperties:{${Object.entries(schema.patternProperties)
        .map(
          ([pattern, propSchema]) =>
            `${JSON.stringify(pattern)}:${typebox(propSchema, rootName, isTypebox, options)}`,
        )
        .join(',')}}`
    : undefined
  const dependentRequiredOpt = schema.dependentRequired
    ? `dependentRequired:{${Object.entries(schema.dependentRequired)
        .map(([key, deps]) => `${JSON.stringify(key)}:${JSON.stringify(deps)}`)
        .join(',')}}`
    : undefined
  return [
    typeof schema.minProperties === 'number' ? `minProperties:${schema.minProperties}` : undefined,
    typeof schema.maxProperties === 'number' ? `maxProperties:${schema.maxProperties}` : undefined,
    propertyNamesOpt,
    patternPropertiesOpt,
    dependentRequiredOpt,
  ]
}
