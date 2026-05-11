import { typeboxMetaOpts } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

export function _enum(schema: JSONSchema) {
  const lit = (v: unknown): string => {
    if (v === null) return 'null'
    if (typeof v === 'string') return JSON.stringify(v)
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v) ?? 'null'
  }
  // v3.0: x-enum-message overrides x-error-message for enum mismatch.
  const enumMessage = schema['x-enum-message']
  const errorMessage = enumMessage ?? schema['x-error-message']
  const metaOpts = typeboxMetaOpts(schema)
  const optsParts = [
    errorMessage ? `errorMessage:${JSON.stringify(errorMessage)}` : undefined,
    ...metaOpts,
  ].filter((v) => v !== undefined)
  const optsTrailer = optsParts.length > 0 ? `,{${optsParts.join(',')}}` : ''
  if (!schema.enum || schema.enum.length === 0) {
    return optsParts.length > 0 ? `Type.Any({${optsParts.join(',')}})` : 'Type.Any()'
  }
  if (schema.enum.length === 1) {
    return `Type.Literal(${lit(schema.enum[0])}${optsTrailer})`
  }
  return `Type.Union([${schema.enum.map((v: unknown) => `Type.Literal(${lit(v)})`).join(',')}]${optsTrailer})`
}
