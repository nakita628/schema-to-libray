import type { JSONSchema } from '../parser/index.js'

/**
 * Wraps an ArkType schema string with `.or("null")` and `.brand()` based on the
 * JSON Schema's `nullable` / `x-brand` fields.
 */
export function arktypeWrap(arktypeStr: string, schema: JSONSchema): string {
  const isQuoted = (s: string) => s.startsWith('"') && s.endsWith('"')
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')
  const withNullable = isNullable
    ? isQuoted(arktypeStr)
      ? `"${arktypeStr.slice(1, -1)} | null"`
      : `type(${arktypeStr}).or("null")`
    : arktypeStr
  const brand = schema['x-brand']
  if (typeof brand !== 'string') return withNullable
  return isQuoted(withNullable)
    ? `type(${withNullable}).brand("${brand}")`
    : `${withNullable}.brand("${brand}")`
}
