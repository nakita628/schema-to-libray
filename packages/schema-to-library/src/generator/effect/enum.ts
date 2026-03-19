import type { JSONSchema } from '../../helper/index.js'
import { effectMessage } from '../../utils/index.js'

export function _enum(schema: JSONSchema): string {
  const hasType = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x: unknown) => x === t))

  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return `"${v}"`
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }

  const errorMessage = schema['x-error-message']
  const enumMessages = schema['x-enum-error-messages']

  const annotate = (code: string): string =>
    errorMessage ? `${code}.annotations(${effectMessage(errorMessage)})` : code

  const tuple = (arr: readonly unknown[]): string =>
    `Schema.Tuple(${arr.map((i: unknown) => `Schema.Literal(${lit(i)})`).join(',')})`

  if (!schema.enum || schema.enum.length === 0) return 'Schema.Unknown'

  // number / integer enum
  if (hasType('number') || hasType('integer')) {
    return annotate(
      schema.enum.length > 1
        ? `Schema.Union(${schema.enum.map((v: unknown) => `Schema.Literal(${lit(v)})`).join(',')})`
        : `Schema.Literal(${lit(schema.enum[0])})`,
    )
  }

  // boolean enum
  if (hasType('boolean')) {
    return annotate(
      schema.enum.length > 1
        ? `Schema.Union(${schema.enum.map((v: unknown) => `Schema.Literal(${lit(v)})`).join(',')})`
        : `Schema.Literal(${lit(schema.enum[0])})`,
    )
  }

  // array enum
  if (hasType('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return annotate(tuple(schema.enum[0]))
    }
    const parts = schema.enum.map((v: unknown) =>
      Array.isArray(v) ? tuple(v) : `Schema.Literal(${lit(v)})`,
    )
    return annotate(`Schema.Union(${parts.join(',')})`)
  }

  // string enum — use Literal with multiple values
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      if (enumMessages) {
        return annotate(
          `Schema.Union(${schema.enum.map((v: unknown) => `Schema.Literal(${lit(v)})`).join(',')})`,
        )
      }
      return annotate(
        `Schema.Literal(${schema.enum.map((v: unknown) => `"${String(v)}"`).join(',')})`,
      )
    }
    return annotate(`Schema.Literal("${String(schema.enum[0])}")`)
  }

  // mixed / null only
  if (schema.enum.length > 1) {
    const parts = schema.enum.map((v: unknown) => `Schema.Literal(${lit(v)})`)
    return annotate(`Schema.Union(${parts.join(',')})`)
  }

  return annotate(`Schema.Literal(${lit(schema.enum[0])})`)
}
