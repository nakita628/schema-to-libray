import type { JSONSchema } from '../../parser/index.js'
import { valibotError } from '../../utils/index.js'

export function _enum(schema: JSONSchema) {
  const ht = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x: unknown) => x === t))
  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return `'${v}'`
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }
  const errorMessage = schema['x-error-message']
  const errorArg = errorMessage ? `,${valibotError(errorMessage)}` : ''
  const enumMessages = schema['x-enum-error-messages']
  const litErrorArg = (v: unknown): string => {
    if (enumMessages) {
      const key = String(v)
      if (key in enumMessages) return `,${valibotError(enumMessages[key])}`
    }
    return errorArg
  }
  const tuple = (arr: readonly unknown[]): string =>
    `v.tuple([${arr.map((i) => `v.literal(${lit(i)})`).join(',')}])`
  if (!schema.enum || schema.enum.length === 0) return 'v.any()'
  if (ht('number') || ht('integer')) {
    return schema.enum.length > 1
      ? `v.union([${schema.enum.map((v) => `v.literal(${lit(v)}${litErrorArg(v)})`).join(',')}]${errorArg})`
      : `v.literal(${lit(schema.enum[0])}${litErrorArg(schema.enum[0])})`
  }
  if (ht('boolean')) {
    return schema.enum.length > 1
      ? `v.union([${schema.enum.map((v) => `v.literal(${lit(v)}${litErrorArg(v)})`).join(',')}]${errorArg})`
      : `v.literal(${lit(schema.enum[0])}${litErrorArg(schema.enum[0])})`
  }
  if (ht('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return tuple(schema.enum[0])
    }
    const parts = schema.enum.map((v: unknown) =>
      Array.isArray(v) ? tuple(v) : `v.literal(${lit(v)}${litErrorArg(v)})`,
    )
    return `v.union([${parts.join(',')}]${errorArg})`
  }
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      if (enumMessages) {
        return `v.union([${schema.enum.map((v: unknown) => `v.literal(${lit(v)}${litErrorArg(v)})`).join(',')}]${errorArg})`
      }
      return `v.picklist(${JSON.stringify(schema.enum)}${errorArg})`
    }
    return `v.literal('${schema.enum[0]}'${litErrorArg(schema.enum[0])})`
  }
  if (schema.enum.length > 1) {
    const parts = schema.enum.map((v: unknown) => `v.literal(${lit(v)}${litErrorArg(v)})`)
    return `v.union([${parts.join(',')}]${errorArg})`
  }
  return `v.literal(${lit(schema.enum[0])}${litErrorArg(schema.enum[0])})`
}
