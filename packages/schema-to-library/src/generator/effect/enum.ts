import type { JSONSchema } from '../../parser/index.js'
import { effectError } from '../../utils/index.js'

/**
 * Generates an Effect Schema enum. String enums map to a multi-arg
 * `Schema.Literal(...)`, number/integer/boolean enums to
 * `Schema.Union(Schema.Literal(...), ...)`, array enums to `Schema.Tuple`
 * or `Schema.Union`, single values to a one-arg `Schema.Literal`.
 *
 * `x-error-message` (whole-enum) is applied **only to the outermost
 * expression** via `.annotations(...)`. Inner Schema.Literal entries
 * inside a Union/Tuple never receive their own annotations — the outer
 * annotation already covers them.
 *
 * Per-literal `x-enum-error-messages` was removed entirely: a rejected
 * value by definition isn't in the enum, so a per-literal branch can
 * never match. Whole-enum messages come from `x-error-message`;
 * finer-grained business rules belong in handler code, not the schema.
 */
export function _enum(schema: JSONSchema) {
  if (!schema.enum || schema.enum.length === 0) return 'Schema.Unknown'
  const ht = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x: unknown) => x === t))

  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return `"${v}"`
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }
  // v3.0: x-enum-message overrides x-error-message for the enum wrapper.
  const enumMessage = schema['x-enum-message']
  const errorMessage = enumMessage ?? schema['x-error-message']
  const annotate = (code: string): string =>
    errorMessage ? `${code}.annotations(${effectError(errorMessage)})` : code
  const tuple = (arr: readonly unknown[]): string =>
    `Schema.Tuple(${arr.map((i: unknown) => `Schema.Literal(${lit(i)})`).join(',')})`
  if (ht('number') || ht('integer') || ht('boolean')) {
    return annotate(
      schema.enum.length > 1
        ? `Schema.Union(${schema.enum.map((v: unknown) => `Schema.Literal(${lit(v)})`).join(',')})`
        : `Schema.Literal(${lit(schema.enum[0])})`,
    )
  }
  if (ht('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return annotate(tuple(schema.enum[0]))
    }
    const parts = schema.enum.map((v: unknown) =>
      Array.isArray(v) ? tuple(v) : `Schema.Literal(${lit(v)})`,
    )
    return annotate(`Schema.Union(${parts.join(',')})`)
  }
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      return annotate(
        `Schema.Literal(${schema.enum.map((v: unknown) => `"${String(v)}"`).join(',')})`,
      )
    }
    return annotate(`Schema.Literal("${String(schema.enum[0])}")`)
  }
  if (schema.enum.length > 1) {
    const parts = schema.enum.map((v: unknown) => `Schema.Literal(${lit(v)})`)
    return annotate(`Schema.Union(${parts.join(',')})`)
  }
  return annotate(`Schema.Literal(${lit(schema.enum[0])})`)
}
