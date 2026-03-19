import type { JSONSchema } from '../../helper/index.js'
import { valibotMessage } from '../../utils/index.js'

export function _enum(schema: JSONSchema): string {
  const hasType = (t: string): boolean =>
    schema.type === t || (Array.isArray(schema.type) && schema.type.some((x: unknown) => x === t))

  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return `'${v}'`
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }

  const errorMessage = schema['x-error-message']
  const errArg = errorMessage ? `,${valibotMessage(errorMessage)}` : ''
  const enumMessages = schema['x-enum-error-messages']
  const litErrArg = (v: unknown): string => {
    if (enumMessages) {
      const key = String(v)
      if (key in enumMessages) return `,${valibotMessage(enumMessages[key])}`
    }
    return errArg
  }

  const tuple = (arr: readonly unknown[]): string =>
    `v.tuple([${arr.map((i: unknown) => `v.literal(${lit(i)})`).join(',')}])`

  if (!schema.enum || schema.enum.length === 0) return 'v.any()'

  // number / integer enum
  if (hasType('number') || hasType('integer')) {
    return schema.enum.length > 1
      ? `v.union([${schema.enum.map((v: unknown) => `v.literal(${lit(v)}${litErrArg(v)})`).join(',')}]${errArg})`
      : `v.literal(${lit(schema.enum[0])}${litErrArg(schema.enum[0])})`
  }

  // boolean enum
  if (hasType('boolean')) {
    return schema.enum.length > 1
      ? `v.union([${schema.enum.map((v: unknown) => `v.literal(${lit(v)}${litErrArg(v)})`).join(',')}]${errArg})`
      : `v.literal(${lit(schema.enum[0])}${litErrArg(schema.enum[0])})`
  }

  // array enum
  if (hasType('array')) {
    if (schema.enum.length === 1 && Array.isArray(schema.enum[0])) {
      return tuple(schema.enum[0])
    }
    const parts = schema.enum.map((v: unknown) =>
      Array.isArray(v) ? tuple(v) : `v.literal(${lit(v)}${litErrArg(v)})`,
    )
    return `v.union([${parts.join(',')}]${errArg})`
  }

  // string enum
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    if (schema.enum.length > 1) {
      if (enumMessages) {
        return `v.union([${schema.enum.map((v: unknown) => `v.literal(${lit(v)}${litErrArg(v)})`).join(',')}]${errArg})`
      }
      return `v.picklist(${JSON.stringify(schema.enum)}${errArg})`
    }
    return `v.literal('${schema.enum[0]}'${litErrArg(schema.enum[0])})`
  }

  // mixed / null only
  if (schema.enum.length > 1) {
    const parts = schema.enum.map((v: unknown) => `v.literal(${lit(v)}${litErrArg(v)})`)
    return `v.union([${parts.join(',')}]${errArg})`
  }

  return `v.literal(${lit(schema.enum[0])}${litErrArg(schema.enum[0])})`
}
