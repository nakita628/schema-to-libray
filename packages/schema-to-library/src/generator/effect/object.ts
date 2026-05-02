import type { JSONSchema } from '../../parser/index.js'
import { effect } from './effect.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return effect(schema, rootName, isEffect, options)
  }
  if (typeof schema.additionalProperties === 'object') {
    return `Schema.Record({key:Schema.String,value:${effect(schema.additionalProperties)}})`
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
      const isRequired = required.includes(key)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:Schema.optional(${parsed})`
    })
    .filter((v): v is string => v !== null)
  if (required.length === 0 && props.every((p) => p.includes('Schema.optional('))) {
    const cleaned = props.map((p) => p.replace(/^(.+?):Schema\.optional\((.+)\)$/, '$1:$2'))
    return `Schema.partial(Schema.Struct({${cleaned.join(',')}}))`
  }
  return `Schema.Struct({${props.join(',')}})`
}
