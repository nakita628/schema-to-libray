import type { JSONSchema } from '../../types/index.js'

export function _enum(schema: JSONSchema): string {
  const hasType = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x: unknown) => x === t))

  const lit = (v: unknown): string =>
    v === null ? 'null' : typeof v === 'string' ? `"${v}"` : String(v)

  const tuple = (arr: readonly unknown[]): string =>
    `Schema.Tuple(${arr.map((i: unknown) => `Schema.Literal(${lit(i)})`).join(',')})`

  if (!schema.enum || schema.enum.length === 0) return 'Schema.Unknown'

  // number / integer enum
  if (hasType('number') || hasType('integer')) {
    return schema.enum.length > 1
      ? `Schema.Union(${schema.enum.map((v: unknown) => `Schema.Literal(${lit(v)})`).join(',')})`
      : `Schema.Literal(${lit(schema.enum[0])})`
  }

  // boolean enum
  if (hasType('boolean')) {
    return schema.enum.length > 1
      ? `Schema.Union(${schema.enum.map((v: unknown) => `Schema.Literal(${lit(v)})`).join(',')})`
      : `Schema.Literal(${lit(schema.enum[0])})`
  }

  // array enum
  if (hasType('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return tuple(schema.enum[0])
    }
    const parts = schema.enum.map((v: unknown) =>
      Array.isArray(v) ? tuple(v) : `Schema.Literal(${lit(v)})`,
    )
    return `Schema.Union(${parts.join(',')})`
  }

  // string enum — use Literal with multiple values
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      return `Schema.Literal(${schema.enum.map((v: unknown) => `"${v}"`).join(',')})`
    }
    return `Schema.Literal("${schema.enum[0]}")`
  }

  // mixed / null only
  if (schema.enum.length > 1) {
    const parts = schema.enum.map((v: unknown) => `Schema.Literal(${lit(v)})`)
    return `Schema.Union(${parts.join(',')})`
  }

  return `Schema.Literal(${lit(schema.enum[0])})`
}
