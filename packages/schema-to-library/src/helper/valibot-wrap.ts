import type { JSONSchema } from '../parser/index.js'

/**
 * Wraps a Valibot schema string with `v.optional()`, `v.nullable()`, and
 * `v.brand()` based on the JSON Schema's `default` / `nullable` / `x-brand` fields.
 */
export function valibotWrap(valibotStr: string, schema: JSONSchema): string {
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
      ? `v.optional(${valibotStr},${formatLiteral(schema.default)})`
      : valibotStr
  const withNullable = isNullable ? `v.nullable(${withDefault})` : withDefault
  const brand = schema['x-brand']
  return typeof brand === 'string' ? `v.pipe(${withNullable},v.brand("${brand}"))` : withNullable
}
