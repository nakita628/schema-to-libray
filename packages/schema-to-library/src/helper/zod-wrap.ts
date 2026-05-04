import type { JSONSchema } from '../parser/index.js'
import { serializeJSValue } from './meta.js'

/**
 * Wraps a Zod schema string with `.default()`, `.nullable()`, `.brand<...>()`
 * and a single Zod v4 metadata chain (`.meta({ ... })`) based on the JSON
 * Schema's `default` / `nullable` / `x-brand` and OpenAPI metadata fields.
 *
 * All metadata fields (`description`, `examples`/`example`, `deprecated`,
 * `externalDocs`, `readOnly`, `writeOnly`) are consolidated into a single
 * `.meta({...})` call. Per Zod v4, `.describe(text)` is functionally
 * identical to `.meta({description: text})` (both register into
 * `z.globalRegistry`); using a single `.meta()` keeps generated code
 * consistent regardless of which fields are present.
 *
 * @see https://zod.dev/metadata
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
  const withBrand = typeof brand === 'string' ? `${withNullable}.brand<"${brand}">()` : withNullable

  const examples = schema.examples ?? (schema.example !== undefined ? [schema.example] : undefined)
  const metaObj: Record<string, unknown> = {}
  if (schema.description !== undefined) metaObj.description = schema.description
  if (examples !== undefined) metaObj.examples = examples
  if (schema.deprecated !== undefined) metaObj.deprecated = schema.deprecated
  if (schema.externalDocs !== undefined) metaObj.externalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) metaObj.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) metaObj.writeOnly = schema.writeOnly
  if (Object.keys(metaObj).length === 0) return withBrand
  return `${withBrand}.meta(${serializeJSValue(metaObj)})`
}
