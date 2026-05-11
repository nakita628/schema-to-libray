import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey, zodError } from '../../utils/index.js'
import { zod } from './zod.js'

/**
 * Generate a Zod object schema for a JSON Schema object node.
 *
 * Dispatches `additionalProperties` to `z.looseObject` (true), `z.strictObject`
 * (false), `z.record` (Schema), or default `z.object`. Combinators
 * (oneOf/anyOf/allOf/not) delegate to the main `zod` entry. JSON Schema 2020-12
 * keywords (`minProperties`, `maxProperties`, `propertyNames`,
 * `patternProperties`, `dependentRequired`) are emitted as `.refine(...)`
 * chains.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isZod: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return zod(schema, rootName, isZod, options)
  }

  const errorMessage = schema['x-error-message']
  const errorArg = errorMessage ? `,${zodError(errorMessage)}` : ''
  // v3.0: 1 keyword = 1 message
  const minPropsMessage = schema['x-minProperties-message']
  const minErrorArg = minPropsMessage ? `,${zodError(minPropsMessage)}` : ''
  const maxPropsMessage = schema['x-maxProperties-message']
  const maxErrorArg = maxPropsMessage ? `,${zodError(maxPropsMessage)}` : ''
  const patternPropsMessage = schema['x-patternProperties-message']
  const patternErrorArg = patternPropsMessage ? `,${zodError(patternPropsMessage)}` : ''
  const propNamesMessage = schema['x-propertyNames-message']
  const propNamesErrorArg = propNamesMessage ? `,${zodError(propNamesMessage)}` : ''
  const depReqMessage = schema['x-dependentRequired-message']
  const depReqErrorArg = depReqMessage ? `,${zodError(depReqMessage)}` : errorArg
  const depSchMessage = schema['x-dependentSchemas-message']
  const depSchErrorArg = depSchMessage ? `,${zodError(depSchMessage)}` : errorArg

  // ── additionalProperties: schema → z.record(...) + propertyNames + patternProperties ──
  // NOTE: `.readonly()` is appended by the dispatcher (`zod.ts:readonly`),
  // so this function does NOT add `.readonly()` itself.
  if (typeof schema.additionalProperties === 'object') {
    const record = `z.record(z.string(),${zod(schema.additionalProperties, rootName, isZod, options)})`
    const recordPropNames = schema.propertyNames?.pattern
      ? `.refine((o)=>Object.keys(o).every((k)=>new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(k))${propNamesErrorArg})`
      : schema.propertyNames?.enum
        ? `.refine((o)=>Object.keys(o).every((k)=>${JSON.stringify(schema.propertyNames.enum)}.includes(k))${propNamesErrorArg})`
        : ''
    const recordPatternProps = schema.patternProperties
      ? Object.entries(schema.patternProperties)
          .map(([pattern, propSchema]) => {
            const z = zod(propSchema, rootName, isZod, options)
            return `.refine((o)=>Object.entries(o).every(([k,v])=>!new RegExp(${JSON.stringify(pattern)}).test(k)||${z}.safeParse(v).success)${patternErrorArg})`
          })
          .join('')
      : ''
    return `${record}${recordPropNames}${recordPatternProps}`
  }

  if (!schema.properties) {
    if (schema.additionalProperties === true) return 'z.any()'
    return 'z.object({})'
  }

  const objectType =
    schema.additionalProperties === true
      ? 'looseObject'
      : schema.additionalProperties === false
        ? 'strictObject'
        : 'object'
  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties)
    .map(([key, propSchema]) => {
      const parsed = zod(propSchema, rootName, isZod, options)
      if (!parsed) return null
      const safeKey = makeSafeKey(key)
      return `${safeKey}:${parsed}${required.includes(key) ? '' : '.optional()'}`
    })
    .filter((v) => v !== null)
  // v3.0: x-additionalProperties-message attaches a custom message to the
  // `unrecognized_keys` issue (only meaningful for strictObject).
  const addlPropsMessage = schema['x-additionalProperties-message']
  const objectParams =
    objectType === 'strictObject' && addlPropsMessage
      ? `,{error:(issue)=>issue.code==='unrecognized_keys'?${JSON.stringify(addlPropsMessage)}:${errorMessage ? JSON.stringify(errorMessage) : 'undefined'}}`
      : ''

  const partialBase =
    required.length === 0 && props.every((p) => p.includes('.optional()'))
      ? `z.${objectType}({${props.map((p) => p.replace('.optional()', '')).join(',')}}${objectParams}).partial()`
      : `z.${objectType}({${props.join(',')}}${objectParams})`

  const minProperties =
    typeof schema.minProperties === 'number'
      ? `.refine((o)=>Object.keys(o).length>=${schema.minProperties}${minErrorArg})`
      : ''
  const maxProperties =
    typeof schema.maxProperties === 'number'
      ? `.refine((o)=>Object.keys(o).length<=${schema.maxProperties}${maxErrorArg})`
      : ''
  const propertyNames = schema.propertyNames?.pattern
    ? `.refine((o)=>Object.keys(o).every((k)=>new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(k))${propNamesErrorArg})`
    : schema.propertyNames?.enum
      ? `.refine((o)=>Object.keys(o).every((k)=>${JSON.stringify(schema.propertyNames.enum)}.includes(k))${propNamesErrorArg})`
      : ''
  const patternProperties = schema.patternProperties
    ? Object.entries(schema.patternProperties)
        .map(([pattern, propSchema]) => {
          const z = zod(propSchema, rootName, isZod, options)
          return `.refine((o)=>Object.entries(o).every(([k,v])=>!new RegExp(${JSON.stringify(pattern)}).test(k)||${z}.safeParse(v).success)${patternErrorArg})`
        })
        .join('')
    : ''
  const dependentRequired = schema.dependentRequired
    ? Object.entries(schema.dependentRequired)
        .map(([key, deps]) => {
          const depsCheck = deps.map((d) => `'${d}' in o`).join('&&')
          return `.refine((o)=>!('${key}' in o)||(${depsCheck})${depReqErrorArg})`
        })
        .join('')
    : ''
  // v3.0: dependentSchemas — sub-schema validation when dependency key present.
  // Uses its own x-dependentSchemas-message (distinct from x-dependentRequired-message).
  const dependentSchemas = schema.dependentSchemas
    ? Object.entries(schema.dependentSchemas)
        .map(([key, subSchema]) => {
          const subZod = zod(subSchema, rootName, isZod, options)
          return `.refine((o)=>!('${key}' in o)||${subZod}.safeParse(o).success${depSchErrorArg})`
        })
        .join('')
    : ''

  return `${partialBase}${minProperties}${maxProperties}${propertyNames}${patternProperties}${dependentRequired}${dependentSchemas}`
}
