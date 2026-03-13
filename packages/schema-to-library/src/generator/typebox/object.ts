import type { JSONSchema } from '../../types/index.js'
import type { typebox } from './typebox.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isTypebox: boolean,
  typeboxFn: typeof typebox,
): string {
  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'boolean') {
      if (schema.properties) {
        return propertiesSchema(
          schema.properties,
          Array.isArray(schema.required) ? schema.required : [],
          rootName,
          isTypebox,
          typeboxFn,
        )
      }
      return 'Type.Any()'
    }
    return `Type.Record(Type.String(),${typeboxFn(schema.additionalProperties)})`
  }
  if (schema.properties) {
    return propertiesSchema(
      schema.properties,
      Array.isArray(schema.required) ? schema.required : [],
      rootName,
      isTypebox,
      typeboxFn,
      schema.additionalProperties === false,
    )
  }
  if (schema.oneOf) return typeboxFn(schema, rootName, isTypebox)
  if (schema.anyOf) return typeboxFn(schema, rootName, isTypebox)
  if (schema.allOf) return typeboxFn(schema, rootName, isTypebox)
  if (schema.not) return typeboxFn(schema, rootName, isTypebox)
  return 'Type.Object({})'
}

function propertiesSchema(
  properties: Record<string, JSONSchema>,
  required: readonly string[],
  rootName: string,
  isTypebox: boolean,
  typeboxFn: typeof typebox,
  noAdditional: boolean = false,
): string {
  const objectProperties = Object.entries(properties)
    .map(([key, schema]) => {
      const parsed = typeboxFn(schema, rootName, isTypebox)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:Type.Optional(${parsed})`
    })
    .filter((v): v is string => v !== null)

  const opts = noAdditional ? ',{additionalProperties:false}' : ''
  return `Type.Object({${objectProperties}}${opts})`
}
