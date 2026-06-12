import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'

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
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')
  // TypeBox v1's `Type.Optional(type)` takes one arg; the default value itself is
  // baked into `typeboxStr`'s own options by the factory (`typeboxDefaultOpt`).
  // Here we only mark the property optional when a (kept) default is present.
  const defaultResult =
    schema.default !== undefined ? coerceDefault(schema, schema.default) : undefined
  const withDefault = defaultResult?.keep ? `Type.Optional(${typeboxStr})` : typeboxStr
  const withNullable = isNullable ? `Type.Union([${withDefault},Type.Null()])` : withDefault
  return schema['x-readonly'] === true ? `Type.Readonly(${withNullable})` : withNullable
}
