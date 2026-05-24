import { typeboxMetaOpts } from '../../helper/meta.js'
import type { JSONSchema, ParamIn } from '../../parser/index.js'
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
  options?: { openapi?: boolean; readonly?: boolean; paramIn?: ParamIn },
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
  const objectErrorMessageEntries: string[] = []
  const objectErrorMessage = schema['x-error-message']
  if (objectErrorMessage)
    objectErrorMessageEntries.push(`type:${JSON.stringify(objectErrorMessage)}`)
  const objectMinPropertiesMessage = schema['x-minProperties-message']
  if (objectMinPropertiesMessage)
    objectErrorMessageEntries.push(`minProperties:${JSON.stringify(objectMinPropertiesMessage)}`)
  const objectMaxPropertiesMessage = schema['x-maxProperties-message']
  if (objectMaxPropertiesMessage)
    objectErrorMessageEntries.push(`maxProperties:${JSON.stringify(objectMaxPropertiesMessage)}`)
  const objectAdditionalPropertiesMessage = schema['x-additionalProperties-message']
  if (objectAdditionalPropertiesMessage)
    objectErrorMessageEntries.push(
      `additionalProperties:${JSON.stringify(objectAdditionalPropertiesMessage)}`,
    )
  const objectPropertyNamesMessage = schema['x-propertyNames-message']
  if (objectPropertyNamesMessage)
    objectErrorMessageEntries.push(`propertyNames:${JSON.stringify(objectPropertyNamesMessage)}`)
  const objectPatternPropertiesMessage = schema['x-patternProperties-message']
  if (objectPatternPropertiesMessage)
    objectErrorMessageEntries.push(
      `patternProperties:${JSON.stringify(objectPatternPropertiesMessage)}`,
    )
  const objectDependentRequiredMessage = schema['x-dependentRequired-message']
  if (objectDependentRequiredMessage)
    objectErrorMessageEntries.push(
      `dependentRequired:${JSON.stringify(objectDependentRequiredMessage)}`,
    )
  const objectDependentSchemasMessage = schema['x-dependentSchemas-message']
  if (objectDependentSchemasMessage)
    objectErrorMessageEntries.push(
      `dependentSchemas:${JSON.stringify(objectDependentSchemasMessage)}`,
    )
  const objectRequiredMessage = schema['x-required-message']
  if (objectRequiredMessage)
    objectErrorMessageEntries.push(`required:${JSON.stringify(objectRequiredMessage)}`)
  const objectPropertiesMessage = schema['x-properties-message']
  if (objectPropertiesMessage)
    objectErrorMessageEntries.push(`properties:${JSON.stringify(objectPropertiesMessage)}`)
  const objectIfMessage = schema['x-if-message']
  const objectThenMessage = schema['x-then-message'] ?? objectIfMessage
  if (objectThenMessage) objectErrorMessageEntries.push(`then:${JSON.stringify(objectThenMessage)}`)
  const objectElseMessage = schema['x-else-message'] ?? objectIfMessage
  if (objectElseMessage) objectErrorMessageEntries.push(`else:${JSON.stringify(objectElseMessage)}`)
  const objectUnevaluatedPropertiesMessage = schema['x-unevaluatedProperties-message']
  if (objectUnevaluatedPropertiesMessage)
    objectErrorMessageEntries.push(
      `unevaluatedProperties:${JSON.stringify(objectUnevaluatedPropertiesMessage)}`,
    )
  const objectErrorMessageField =
    objectErrorMessageEntries.length > 0
      ? `errorMessage:{${objectErrorMessageEntries.join(',')}}`
      : undefined
  const optParts = [
    schema.additionalProperties === false ? 'additionalProperties:false' : undefined,
    ...buildAdvancedOpts(schema, rootName, isTypebox, options),
    objectErrorMessageField,
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
  options?: { openapi?: boolean; readonly?: boolean; paramIn?: ParamIn },
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
  const ifOpt = schema.if ? `if:${typebox(schema.if, rootName, isTypebox, options)}` : undefined
  const thenOpt = schema.then
    ? `then:${typebox(schema.then, rootName, isTypebox, options)}`
    : undefined
  const elseOpt = schema.else
    ? `else:${typebox(schema.else, rootName, isTypebox, options)}`
    : undefined
  const requiredOpt =
    !schema.properties && Array.isArray(schema.required) && schema.required.length > 0
      ? `required:${JSON.stringify(schema.required)}`
      : undefined
  return [
    typeof schema.minProperties === 'number' ? `minProperties:${schema.minProperties}` : undefined,
    typeof schema.maxProperties === 'number' ? `maxProperties:${schema.maxProperties}` : undefined,
    propertyNamesOpt,
    patternPropertiesOpt,
    dependentRequiredOpt,
    ifOpt,
    thenOpt,
    elseOpt,
    requiredOpt,
  ]
}
