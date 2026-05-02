import type { JSONSchema } from '../parser/index.js'

/**
 * Wraps a Zod schema string with `.default()`, `.nullable()`, and `.brand<...>()`
 * based on the JSON Schema's `default` / `nullable` / `x-brand` fields.
 */
export function zodWrap(zodStr: string, schema: JSONSchema): string {
  const formatLiteral = (value: unknown): string => {
    if (typeof value === 'boolean') return `${value}`
    if (typeof value === 'number') {
      if (schema.format === 'int64') return `${value}n`
      if (schema.format === 'bigint') return `BigInt(${value})`
      return `${value}`
    }
    if (schema.type === 'date' && typeof value === 'string')
      return `new Date(${JSON.stringify(value)})`
    return JSON.stringify(value)
  }
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')
  const withDefault =
    schema.default !== undefined ? `${zodStr}.default(${formatLiteral(schema.default)})` : zodStr
  const withNullable = isNullable ? `${withDefault}.nullable()` : withDefault
  const brand = schema['x-brand']
  return typeof brand === 'string' ? `${withNullable}.brand<"${brand}">()` : withNullable
}
