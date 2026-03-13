import type { JSONSchema } from '../../types/index.js'

export function _enum(schema: JSONSchema): string {
  if (!schema.enum || schema.enum.length === 0) return '"unknown"'

  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return `'${v}'`
    return String(v)
  }

  if (schema.enum.length === 1) {
    return `"${lit(schema.enum[0])}"`
  }

  return `"${schema.enum.map(lit).join(' | ')}"`
}
