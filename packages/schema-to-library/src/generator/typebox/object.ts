import { typeboxMetaOpts } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'
import { typebox } from './typebox.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isTypebox: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return typebox(schema, rootName, isTypebox, options)
  }
  if (typeof schema.additionalProperties === 'object') {
    return `Type.Record(Type.String(),${typebox(schema.additionalProperties)})`
  }
  if (!schema.properties) {
    if (schema.additionalProperties === true) return 'Type.Any()'
    return 'Type.Object({})'
  }
  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties)
    .map(([key, propSchema]) => {
      const parsed = typebox(propSchema, rootName, isTypebox, options)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:Type.Optional(${parsed})`
    })
    .filter((v): v is string => v !== null)
  const optParts = [
    schema.additionalProperties === false ? 'additionalProperties:false' : undefined,
    ...typeboxMetaOpts(schema),
  ].filter((v): v is string => v !== undefined)
  const opts = optParts.length > 0 ? `,{${optParts.join(',')}}` : ''
  return `Type.Object({${props.join(',')}}${opts})`
}
