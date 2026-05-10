import type { JSONSchema } from '../../parser/index.js'
import { valibotError } from '../../utils/index.js'

/**
 * Generates a Valibot enum schema. String enums map to `v.picklist`,
 * number/integer/boolean enums to `v.union([v.literal(...), ...])`,
 * array enums to `v.tuple` or `v.union`, single values to `v.literal`.
 *
 * `x-error-message` (whole-enum) is applied **only to the outermost
 * wrapper**. Inner v.literal entries inside a wrapper never receive a
 * duplicate `error:` arg — the outer wrapper already shadows inner
 * messages on validation failure.
 *
 * Per-literal `x-enum-error-messages` was removed entirely: a rejected
 * value by definition isn't in the enum, so a per-literal branch can
 * never match. Whole-enum messages come from `x-error-message`;
 * finer-grained business rules belong in handler code, not the schema.
 */
export function _enum(schema: JSONSchema) {
  if (!schema.enum || schema.enum.length === 0) return 'v.any()'
  const ht = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x: unknown) => x === t))
  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }
  const errorMessage = schema['x-error-message']
  const errorArg = errorMessage ? `,${valibotError(errorMessage)}` : ''
  const innerLit = (v: unknown): string => `v.literal(${lit(v)})`
  const outerLit = (v: unknown): string => `v.literal(${lit(v)}${errorArg})`
  const innerTuple = (arr: readonly unknown[]): string =>
    `v.tuple([${arr.map(innerLit).join(',')}])`
  const outerTuple = (arr: readonly unknown[]): string =>
    `v.tuple([${arr.map(innerLit).join(',')}]${errorArg})`
  if (ht('number') || ht('integer') || ht('boolean')) {
    return schema.enum.length > 1
      ? `v.union([${schema.enum.map(innerLit).join(',')}]${errorArg})`
      : outerLit(schema.enum[0])
  }
  if (ht('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return outerTuple(schema.enum[0])
    }
    const parts = schema.enum.map((v: unknown) => (Array.isArray(v) ? innerTuple(v) : innerLit(v)))
    return `v.union([${parts.join(',')}]${errorArg})`
  }
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      return `v.picklist(${JSON.stringify(schema.enum)}${errorArg})`
    }
    return outerLit(schema.enum[0])
  }
  if (schema.enum.length > 1) {
    return `v.union([${schema.enum.map(innerLit).join(',')}]${errorArg})`
  }
  return outerLit(schema.enum[0])
}
