import type { JSONSchema } from '../../helper/index.js'
import type { effect } from './effect.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isEffect: boolean,
  effectFn: typeof effect,
  options?: { openapi?: boolean; readonly?: boolean },
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
          options,
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
      options,
    )
    return result
  }
  // allOf, oneOf, anyOf, not
  if (schema.oneOf) return effectFn(schema, rootName, isEffect, options)
  if (schema.anyOf) return effectFn(schema, rootName, isEffect, options)
  if (schema.allOf) return effectFn(schema, rootName, isEffect, options)
  if (schema.not) return effectFn(schema, rootName, isEffect, options)
  return 'Schema.Struct({})'
}

function propertiesSchema(
  properties: { [k: string]: JSONSchema },
  required: readonly string[],
  rootName: string,
  isEffect: boolean,
  effectFn: typeof effect,
  options?: { openapi?: boolean; readonly?: boolean },
): string {
  const objectProperties = Object.entries(properties)
    .map(([key, schema]) => {
      const parsed = effectFn(schema, rootName, isEffect, options)
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
    return `Schema.partial(Schema.Struct({${cleanProperties.join(',')}}))`
  }
  return `Schema.Struct({${objectProperties.join(',')}})`
}
