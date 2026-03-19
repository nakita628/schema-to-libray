import type { JSONSchema } from '../../helper/index.js'

export function _enum(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''

  if (!schema.enum || schema.enum.length === 0) return '"unknown"'

  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return `'${v}'`
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }

  if (schema.enum.length === 1) {
    const expr = `"${lit(schema.enum[0])}"`
    if (errorMessage) return `type(${expr})${describe}`
    return expr
  }

  const expr = `"${schema.enum.map(lit).join(' | ')}"`
  if (errorMessage) return `type(${expr})${describe}`
  return expr
}
