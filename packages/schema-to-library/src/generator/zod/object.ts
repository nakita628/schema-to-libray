import type { JSONSchema } from '../../parser/index.js'
import { zod } from './zod.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isZod: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return zod(schema, rootName, isZod, options)
  }
  if (typeof schema.additionalProperties === 'object') {
    return `z.record(z.string(),${zod(schema.additionalProperties)})`
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
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return `${safeKey}:${parsed}${required.includes(key) ? '' : '.optional()'}`
    })
    .filter((v): v is string => v !== null)
  if (required.length === 0 && props.every((p) => p.includes('.optional()'))) {
    const cleaned = props.map((p) => p.replace('.optional()', ''))
    return `z.${objectType}({${cleaned.join(',')}}).partial()`
  }
  return `z.${objectType}({${props.join(',')}})`
}
