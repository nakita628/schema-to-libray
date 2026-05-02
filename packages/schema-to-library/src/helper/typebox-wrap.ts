import type { JSONSchema } from '../parser/index.js'

/**
 * Wraps a TypeBox schema string with `Type.Optional()` (with default) and
 * `Type.Union([..., Type.Null()])` based on `default` / `nullable` fields.
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
  return isNullable ? `Type.Union([${withDefault},Type.Null()])` : withDefault
}
