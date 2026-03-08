import type { JSONSchema } from '../types/index.js'
import type { effect } from './effect.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean,
  effectFn: typeof effect,
): string {
  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'boolean') {
      if (schema.properties) {
        return propertiesSchema(
          schema.properties,
          Array.isArray(schema.required) ? schema.required : [],
          rootName,
          isEffect,
          effectFn,
        )
      }
      return 'Schema.Unknown'
    }
    return `Schema.Record({key:Schema.String,value:${effectFn(schema.additionalProperties)}})`
  }
  if (schema.properties) {
    const result = propertiesSchema(
      schema.properties,
      Array.isArray(schema.required) ? schema.required : [],
      rootName,
      isEffect,
      effectFn,
    )
    return result
  }
  // allOf, oneOf, anyOf, not
  if (schema.oneOf) return effectFn(schema, rootName, isEffect)
  if (schema.anyOf) return effectFn(schema, rootName, isEffect)
  if (schema.allOf) return effectFn(schema, rootName, isEffect)
  if (schema.not) return effectFn(schema, rootName, isEffect)
  return 'Schema.Struct({})'
}

function propertiesSchema(
  properties: Record<string, JSONSchema>,
  required: readonly string[],
  rootName: string,
  isEffect: boolean,
  effectFn: typeof effect,
): string {
  const objectProperties = Object.entries(properties)
    .map(([key, schema]) => {
      const parsed = effectFn(schema, rootName, isEffect)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:Schema.optional(${parsed})`
    })
    .filter((v): v is string => v !== null)

  const allOptional = objectProperties.every((prop) => prop.includes('Schema.optional('))
  if (required.length === 0 && allOptional) {
    const cleanProperties = objectProperties.map((prop) =>
      prop.replace(/^(.+?):Schema\.optional\((.+)\)$/, '$1:$2'),
    )
    return `Schema.partial(Schema.Struct({${cleanProperties}}))`
  }
  return `Schema.Struct({${objectProperties}})`
}
