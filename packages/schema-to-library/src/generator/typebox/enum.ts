import type { JSONSchema } from '../../helper/index.js'

export function _enum(schema: JSONSchema): string {
  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return JSON.stringify(v)
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }

  const errorMessage = schema['x-error-message']
  const errOpt = errorMessage ? `,{errorMessage:${JSON.stringify(errorMessage)}}` : ''

  if (!schema.enum || schema.enum.length === 0) return 'Type.Any()'

  if (schema.enum.length === 1) {
    return errorMessage
      ? `Type.Literal(${lit(schema.enum[0])},{errorMessage:${JSON.stringify(errorMessage)}})`
      : `Type.Literal(${lit(schema.enum[0])})`
  }

  // All strings → Union of Literals
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    return `Type.Union([${schema.enum.map((v: unknown) => `Type.Literal(${lit(v)})`).join(',')}]${errOpt})`
  }

  // Mixed or other types
  return `Type.Union([${schema.enum.map((v: unknown) => `Type.Literal(${lit(v)})`).join(',')}]${errOpt})`
}
