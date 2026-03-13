import type { JSONSchema } from '../../types/index.js'
import type { valibot } from './valibot.js'

export function object(
  schema: JSONSchema,
  rootName: string,
  isValibot: boolean,
  valibotFn: typeof valibot,
): string {
  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'boolean') {
      if (schema.properties) {
        const s = propertiesSchema(
          schema.properties,
          Array.isArray(schema.required) ? schema.required : [],
          rootName,
          isValibot,
          valibotFn,
        )
        if (schema.additionalProperties === true) {
          return s.replace('v.object', 'v.looseObject')
        }
      }
      return 'v.any()'
    }
    return `v.record(v.string(),${valibotFn(schema.additionalProperties)})`
  }
  if (schema.properties) {
    const result = propertiesSchema(
      schema.properties,
      Array.isArray(schema.required) ? schema.required : [],
      rootName,
      isValibot,
      valibotFn,
    )
    if (schema.additionalProperties === false) {
      return result.replace('v.object', 'v.strictObject')
    }
    return result
  }
  // allOf, oneOf, anyOf, not
  if (schema.oneOf) return valibotFn(schema, rootName, isValibot)
  if (schema.anyOf) return valibotFn(schema, rootName, isValibot)
  if (schema.allOf) return valibotFn(schema, rootName, isValibot)
  if (schema.not) return valibotFn(schema, rootName, isValibot)
  return 'v.object({})'
}

function propertiesSchema(
  properties: Record<string, JSONSchema>,
  required: readonly string[],
  rootName: string,
  isValibot: boolean,
  valibotFn: typeof valibot,
): string {
  const objectProperties = Object.entries(properties)
    .map(([key, schema]) => {
      const parsed = valibotFn(schema, rootName, isValibot)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return isRequired ? `${safeKey}:${parsed}` : `${safeKey}:v.optional(${parsed})`
    })
    .filter((v): v is string => v !== null)

  const allOptional = objectProperties.every((prop) => prop.includes('v.optional('))
  if (required.length === 0 && allOptional) {
    const cleanProperties = objectProperties.map((prop) =>
      prop.replace(/^(.+?):v\.optional\((.+)\)$/, '$1:$2'),
    )
    return `v.partial(v.object({${cleanProperties}}))`
  }
  return `v.object({${objectProperties}})`
}
