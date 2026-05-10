import type { JSONSchema } from '../../parser/index.js'
import { zodError } from '../../utils/index.js'

/**
 * Generates a Zod enum schema. String enums map to `z.enum`, number/integer/
 * boolean enums to `z.union([z.literal(...), ...])`, array enums to `z.tuple`
 * or `z.union`, single values to `z.literal`.
 *
 * `x-error-message` (whole-enum) is applied **only to the outermost
 * wrapper** (z.enum / z.union / z.tuple, or the bare z.literal in the
 * single-value case). Inner z.literal entries inside a wrapper never
 * receive a duplicate `error:` arg — Zod's outer wrapper already shadows
 * inner messages on validation failure, so the inner copy was dead.
 *
 * Per-literal `x-enum-error-messages` was removed entirely: a rejected
 * value by definition isn't in the enum, so a per-literal
 * `value === 'admin'` branch can never match. Whole-enum messages
 * come from `x-error-message`; finer-grained business rules belong in
 * handler code, not the schema.
 */
export function _enum(schema: JSONSchema) {
  if (!schema.enum || schema.enum.length === 0) return 'z.any()'
  const ht = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x) => x === t))
  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }
  const errorMessage = schema['x-error-message']
  const errorArg = errorMessage ? `,${zodError(errorMessage)}` : ''
  // Inner literal — used inside a wrapper (z.union / z.tuple) that
  // already carries `errorArg`, so we don't repeat it.
  const innerLit = (v: unknown): string => `z.literal(${lit(v)})`
  // Outer literal — used when the literal is the entire schema output.
  const outerLit = (v: unknown): string => `z.literal(${lit(v)}${errorArg})`
  // Inner tuple — used inside a z.union of multiple tuples; the outer
  // union's errorArg covers this tuple too, so neither the tuple wrapper
  // nor its inner literals receive errorArg.
  const innerTuple = (arr: readonly unknown[]): string =>
    `z.tuple([${arr.map(innerLit).join(',')}])`
  // Outer tuple — used when a single tuple is the entire schema output.
  const outerTuple = (arr: readonly unknown[]): string =>
    `z.tuple([${arr.map(innerLit).join(',')}]${errorArg})`
  if (ht('number') || ht('integer') || ht('boolean')) {
    return schema.enum.length > 1
      ? `z.union([${schema.enum.map(innerLit).join(',')}]${errorArg})`
      : outerLit(schema.enum[0])
  }
  if (ht('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return outerTuple(schema.enum[0])
    }
    const parts = schema.enum.map((v) => (Array.isArray(v) ? innerTuple(v) : innerLit(v)))
    return `z.union([${parts.join(',')}]${errorArg})`
  }
  if (schema.enum.every((v) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      return `z.enum(${JSON.stringify(schema.enum)}${errorArg})`
    }
    return outerLit(schema.enum[0])
  }
  if (schema.enum.length > 1) {
    return `z.union([${schema.enum.map(innerLit).join(',')}]${errorArg})`
  }
  return outerLit(schema.enum[0])
}
