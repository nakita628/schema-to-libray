import type { JSONSchema } from '../parser/index.js'

/**
 * Wraps a TypeBox schema string with `Type.Optional()` (when a `default` is
 * present) and `Type.Union([..., Type.Null()])` (when nullable).
 *
 * Metadata (`description`, `examples`, `deprecated`, `externalDocs`,
 * `readOnly`, `writeOnly`) is NOT handled here. Each TypeBox factory call
 * (`Type.String`, `Type.Object`, `Type.Array`, etc.) embeds metadata directly
 * into its own options argument via {@link typeboxMetaOpts} at construction
 * time, because TypeBox stores metadata on the schema object during
 * construction and exposes no post-construction `.meta()` method.
 */
export function typeboxWrap(typeboxStr: string, schema: JSONSchema): string {
  const formatLiteral = (value: unknown): string => {
    if (typeof value === 'boolean') return `${value}`
    if (typeof value === 'number') return `${value}`
    return JSON.stringify(value)
  }
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')
  const withDefault =
    schema.default !== undefined
      ? `Type.Optional(${typeboxStr},{default:${formatLiteral(schema.default)}})`
      : typeboxStr
  const withNullable = isNullable ? `Type.Union([${withDefault},Type.Null()])` : withDefault
  return schema['x-readonly'] === true ? `Type.Readonly(${withNullable})` : withNullable
}
