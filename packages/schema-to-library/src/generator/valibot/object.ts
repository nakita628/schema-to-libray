import type { JSONSchema } from '../../parser/index.js'
import { valibot } from './valibot.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isValibot: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return valibot(schema, rootName, isValibot, options)
  }
  if (typeof schema.additionalProperties === 'object') {
    return `v.record(v.string(),${valibot(schema.additionalProperties)})`
  }
  if (!schema.properties) {
    if (schema.additionalProperties === true) return 'v.any()'
    return 'v.object({})'
  }
  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties)
    .map(([key, propSchema]) => {
      const parsed = valibot(propSchema, rootName, isValibot, options)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:v.optional(${parsed})`
    })
    .filter((v): v is string => v !== null)
  const objectKind =
    schema.additionalProperties === true
      ? 'looseObject'
      : schema.additionalProperties === false
        ? 'strictObject'
        : 'object'
  if (required.length === 0 && props.every((p) => p.includes('v.optional('))) {
    const cleaned = props.map((p) => p.replace(/^(.+?):v\.optional\((.+)\)$/, '$1:$2'))
    return `v.partial(v.${objectKind}({${cleaned.join(',')}}))`
  }
  return `v.${objectKind}({${props.join(',')}})`
}
