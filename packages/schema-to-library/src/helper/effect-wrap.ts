import type { JSONSchema } from '../parser/index.js'
import { serializeJSValue } from './meta.js'

/**
 * Wraps an Effect schema string with `Schema.optionalWith()`, `Schema.NullOr()`,
 * `Schema.brand()` and `.annotations({...})` based on `default` / `nullable` /
 * `x-brand` and OpenAPI metadata fields.
 *
 * Metadata mapping (Effect `Schema.annotations`):
 * - `description` → `description`
 * - `examples` (or `[example]` when only singular present) → `examples`
 * - `deprecated` / `externalDocs` / `readOnly` / `writeOnly` → `jsonSchema: {...}`
 *   (Effect routes non-standard JSON Schema fields through the `jsonSchema`
 *   annotation to avoid polluting the standard annotation namespace.)
 *
 * @see https://effect.website/docs/schema/annotations/
 */
export function effectWrap(effectStr: string, schema: JSONSchema): string {
  const formatLiteral = (value: unknown): string => {
    if (typeof value === 'boolean') return `${value}`
    if (typeof value === 'number') return `${value}`
    return JSON.stringify(value)
  }
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')
  // NullOr must wrap a Schema, not a PropertySignature. When both nullable and
  // default are present, NullOr goes inside optionalWith so the inner argument
  // is still a Schema and the outer optionalWith yields a valid PropertySignature.
  const withNullable = isNullable ? `Schema.NullOr(${effectStr})` : effectStr
  const brand = schema['x-brand']
  const withBrand =
    typeof brand === 'string' ? `${withNullable}.pipe(Schema.brand("${brand}"))` : withNullable
  // optionalWith is always outermost (it returns a PropertySignature, not a Schema).
  const withDefault =
    schema.default !== undefined
      ? `Schema.optionalWith(${withBrand},{default:() => ${formatLiteral(schema.default)}})`
      : withBrand

  const examples = schema.examples ?? (schema.example !== undefined ? [schema.example] : undefined)
  const ann: Record<string, unknown> = {}
  if (schema.description !== undefined) ann.description = schema.description
  if (examples !== undefined) ann.examples = examples
  const jsonSchemaAnn: Record<string, unknown> = {}
  if (schema.deprecated !== undefined) jsonSchemaAnn.deprecated = schema.deprecated
  if (schema.externalDocs !== undefined) jsonSchemaAnn.externalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) jsonSchemaAnn.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) jsonSchemaAnn.writeOnly = schema.writeOnly
  if (Object.keys(jsonSchemaAnn).length > 0) {
    ann.jsonSchema = jsonSchemaAnn
  }
  if (Object.keys(ann).length === 0) return withDefault
  return `${withDefault}.annotations(${serializeJSValue(ann)})`
}
