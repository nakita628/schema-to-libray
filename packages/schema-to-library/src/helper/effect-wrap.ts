import type { JSONSchema } from '../parser/index.js'

/**
 * Wraps an Effect schema string with `Schema.optionalWith()`, `Schema.NullOr()`,
 * and `Schema.brand()` based on `default` / `nullable` / `x-brand` fields.
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
  const withDefault =
    schema.default !== undefined
      ? `Schema.optionalWith(${effectStr},{default:() => ${formatLiteral(schema.default)}})`
      : effectStr
  const withNullable = isNullable ? `Schema.NullOr(${withDefault})` : withDefault
  const brand = schema['x-brand']
  return typeof brand === 'string' ? `${withNullable}.pipe(Schema.brand("${brand}"))` : withNullable
}
