import type { JSONSchema } from '../../parser/index.js'
import { zodError } from '../../utils/index.js'

export function _enum(schema: JSONSchema) {
  if (!schema.enum || schema.enum.length === 0) return 'z.any()'
  const ht = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x) => x === t))
  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return `'${v}'`
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }
  const tuple = (arr: readonly unknown[]): string =>
    `z.tuple([${arr.map((i) => `z.literal(${lit(i)})`).join(',')}])`
  const errorMessage = schema['x-error-message']
  const errorArg = errorMessage ? `,${zodError(errorMessage)}` : ''
  const enumMessages = schema['x-enum-error-messages']
  const litErrorArg = (v: unknown): string => {
    if (enumMessages) {
      const key = String(v)
      if (key in enumMessages) return `,${zodError(enumMessages[key])}`
    }
    return errorArg
  }
  if (ht('number') || ht('integer') || ht('boolean')) {
    return schema.enum.length > 1
      ? `z.union([${schema.enum.map((v) => `z.literal(${lit(v)}${litErrorArg(v)})`).join(',')}]${errorArg})`
      : `z.literal(${lit(schema.enum[0])}${litErrorArg(schema.enum[0])})`
  }
  if (ht('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) return tuple(schema.enum[0])
    const parts = schema.enum.map((v) =>
      Array.isArray(v) ? tuple(v) : `z.literal(${lit(v)}${litErrorArg(v)})`,
    )
    return `z.union([${parts.join(',')}]${errorArg})`
  }
  if (schema.enum.every((v) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      if (enumMessages) {
        return `z.union([${schema.enum.map((v) => `z.literal(${lit(v)}${litErrorArg(v)})`).join(',')}]${errorArg})`
      }
      return `z.enum(${JSON.stringify(schema.enum)}${errorArg})`
    }
    return `z.literal('${schema.enum[0]}'${litErrorArg(schema.enum[0])})`
  }
  if (schema.enum.length > 1) {
    const parts = schema.enum.map((v) => `z.literal(${lit(v)}${litErrorArg(v)})`)
    return `z.union([${parts.join(',')}]${errorArg})`
  }
  return `z.literal(${lit(schema.enum[0])}${litErrorArg(schema.enum[0])})`
}
