import type { JSONSchema } from '../../helper/index.js'
import type { zod } from './zod.js'

/**
 * Generate Zod object schema from JSON Schema
 *
 * @param schema - JSON Schema object with object type
 * @param rootName - Root schema name for reference resolution
 * @param isZod - Whether this is called from zod function
 * @param zodFn - Reference to the main zod function for recursive calls
 * @returns Generated Zod object schema code
 * @example
 * ```ts
 * object(schema, 'MySchema', false, zod) // 'z.object({name:z.string()})'
 * ```
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isZod: boolean,
  zodFn: typeof zod,
): string {
  if (schema.additionalProperties) {
    if (typeof schema.additionalProperties === 'boolean') {
      if (schema.properties) {
        const s = propertiesSchema(
          schema.properties,
          Array.isArray(schema.required) ? schema.required : [],
          rootName,
          isZod,
          zodFn,
        )
        if (schema.additionalProperties === true) {
          return s.replace('object', 'looseObject')
        }
      }
      return 'z.any()'
    }
    return `z.record(z.string(),${zodFn(schema.additionalProperties)})`
  }
  if (schema.properties) {
    const result = propertiesSchema(
      schema.properties,
      Array.isArray(schema.required) ? schema.required : [],
      rootName,
      isZod,
      zodFn,
    )
    if (schema.additionalProperties === false) {
      return result.replace('object', 'strictObject')
    }
    return result
  }
  // allOf, oneOf, anyOf, not
  if (schema.oneOf) return zodFn(schema, rootName, isZod)
  if (schema.anyOf) return zodFn(schema, rootName, isZod)
  if (schema.allOf) return zodFn(schema, rootName, isZod)
  if (schema.not) return zodFn(schema, rootName, isZod)
  return 'z.object({})'
}

/**
 * Generate Zod object properties schema from JSON Schema properties
 */
function propertiesSchema(
  properties: { [k: string]: JSONSchema },
  required: readonly string[],
  rootName: string,
  isZod: boolean,
  zodFn: typeof zod,
): string {
  const objectProperties = Object.entries(properties)
    .map(([key, schema]) => {
      const parsed = zodFn(schema, rootName, isZod)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return `${safeKey}:${parsed}${isRequired ? '' : '.optional()'}`
    })
    .filter((v): v is string => v !== null)

  const allOptional = objectProperties.every((prop) => prop.includes('.optional()'))
  if (required.length === 0 && allOptional) {
    const cleanProperties = objectProperties.map((prop) => prop.replace('.optional()', ''))
    return `z.object({${cleanProperties}}).partial()`
  }
  return `z.object({${objectProperties}})`
}
