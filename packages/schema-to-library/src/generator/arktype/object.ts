import type { JSONSchema } from '../../parser/index.js'
import { arktype } from './arktype.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isArktype: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return arktype(schema, rootName, isArktype, options)
  }
  if (typeof schema.additionalProperties === 'object') {
    const inner = `{"[string]":${arktype(schema.additionalProperties, rootName, isArktype, options)}}`
    return isArktype ? inner : `type(${inner})`
  }
  if (!schema.properties) {
    if (schema.additionalProperties === true) return '"unknown"'
    return isArktype ? '{}' : 'type({})'
  }
  const additionalMode =
    schema.additionalProperties === true
      ? 'delete'
      : schema.additionalProperties === false
        ? 'reject'
        : undefined
  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties)
    .map(([key, propSchema]) => {
      const parsed = arktype(propSchema, rootName, isArktype, options)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
        ? isRequired
          ? key
          : `"${key}?"`
        : isRequired
          ? JSON.stringify(key)
          : JSON.stringify(`${key}?`)
      return `${safeKey}:${parsed}`
    })
    .filter((v): v is string => v !== null)
  const additionalProp = additionalMode ? `"+":"${additionalMode}"` : undefined
  const allProps = [...props, additionalProp].filter((v): v is string => v !== undefined)
  return isArktype ? `{${allProps.join(',')}}` : `type({${allProps.join(',')}})`
}
