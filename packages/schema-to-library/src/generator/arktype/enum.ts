import type { JSONSchema } from '../../parser/index.js'

export function _enum(schema: JSONSchema) {
  // v3.0: x-enum-message overrides x-error-message for the enum wrapper.
  const enumMessage = schema['x-enum-message']
  const errorMessage = enumMessage ?? schema['x-error-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''

  if (!schema.enum || schema.enum.length === 0) return '"unknown"'

  // ArkType enums are a `"a | b | c"` string union, which can't represent
  // array/object members (their JSON form embeds quotes that break the string).
  // Such pathological enums fall back to `unknown`.
  const isComposite = (v: unknown): boolean => v !== null && typeof v === 'object'
  if (schema.enum.some(isComposite)) return '"unknown"'

  // A quote or backslash in a member breaks both the arktype string DSL literal
  // and the surrounding JS string; such enums use the runtime enumerated form.
  const hasUnsafeString = schema.enum.some((v) => typeof v === 'string' && /['"\\]/.test(v))
  if (hasUnsafeString) {
    const expr = `type.enumerated(${schema.enum.map((v) => JSON.stringify(v)).join(',')})`
    if (errorMessage) return `${expr}${describe}`
    return expr
  }

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
