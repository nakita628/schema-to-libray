import type { GeneratorOptions, JSONSchema } from '../../helper/index.js'
import type { arktype } from './arktype.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isArktype: boolean,
  arktypeFn: typeof arktype,
  options?: GeneratorOptions,
): string {
  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'boolean') {
      if (schema.properties) {
        return propertiesSchema(
          schema.properties,
          Array.isArray(schema.required) ? schema.required : [],
          rootName,
          isArktype,
          arktypeFn,
          schema.additionalProperties === true ? 'delete' : undefined,
          options,
        )
      }
      return '"unknown"'
    }
    const inner = `{"[string]":${arktypeFn(schema.additionalProperties, rootName, isArktype, options)}}`
    return isArktype ? inner : `type(${inner})`
  }
  if (schema.properties) {
    return propertiesSchema(
      schema.properties,
      Array.isArray(schema.required) ? schema.required : [],
      rootName,
      isArktype,
      arktypeFn,
      schema.additionalProperties === false ? 'reject' : undefined,
      options,
    )
  }
  if (schema.oneOf) return arktypeFn(schema, rootName, isArktype, options)
  if (schema.anyOf) return arktypeFn(schema, rootName, isArktype, options)
  if (schema.allOf) return arktypeFn(schema, rootName, isArktype, options)
  if (schema.not) return arktypeFn(schema, rootName, isArktype, options)
  return isArktype ? '{}' : 'type({})'
}

function propertiesSchema(
  properties: { [k: string]: JSONSchema },
  required: readonly string[],
  rootName: string,
  isArktype: boolean,
  arktypeFn: typeof arktype,
  additionalMode?: 'delete' | 'reject',
  options?: GeneratorOptions,
): string {
  const objectProperties = Object.entries(properties)
    .map(([key, schema]) => {
      const parsed = arktypeFn(schema, rootName, isArktype, options)
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
  const allProps = [...objectProperties, additionalProp].filter((v): v is string => v !== undefined)

  return isArktype ? `{${allProps}}` : `type({${allProps}})`
}
