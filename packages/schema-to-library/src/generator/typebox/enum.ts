import type { JSONSchema } from '../../types/index.js'

export function _enum(schema: JSONSchema): string {
  const lit = (v: unknown): string =>
    v === null ? 'null' : typeof v === 'string' ? JSON.stringify(v) : String(v)

  if (!schema.enum || schema.enum.length === 0) return 'Type.Any()'

  if (schema.enum.length === 1) {
    return `Type.Literal(${lit(schema.enum[0])})`
  }

  // All strings → Union of Literals
  if (schema.enum.every((v: unknown) => typeof v === 'string')) {
    return `Type.Union([${schema.enum.map((v: unknown) => `Type.Literal(${lit(v)})`).join(',')}])`
  }

  // Mixed or other types
  return `Type.Union([${schema.enum.map((v: unknown) => `Type.Literal(${lit(v)})`).join(',')}])`
}
