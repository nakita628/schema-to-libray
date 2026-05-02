import { typeboxMetaOpts } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

export function integer(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  const metaOpts = typeboxMetaOpts(schema)

  if (schema.format === 'bigint') {
    const opts = [
      schema.minimum !== undefined ? `minimum:BigInt(${schema.minimum})` : undefined,
      schema.maximum !== undefined ? `maximum:BigInt(${schema.maximum})` : undefined,
      errorMessage ? `errorMessage:${JSON.stringify(errorMessage)}` : undefined,
      ...metaOpts,
    ].filter((v) => v !== undefined)

    if (opts.length > 0) return `Type.BigInt({${opts.join(',')}})`
    return 'Type.BigInt()'
  }

  const opts = [
    schema.minimum !== undefined ? `minimum:${schema.minimum}` : undefined,
    typeof schema.exclusiveMinimum === 'number'
      ? `exclusiveMinimum:${schema.exclusiveMinimum}`
      : undefined,
    schema.maximum !== undefined ? `maximum:${schema.maximum}` : undefined,
    typeof schema.exclusiveMaximum === 'number'
      ? `exclusiveMaximum:${schema.exclusiveMaximum}`
      : undefined,
    schema.multipleOf !== undefined ? `multipleOf:${schema.multipleOf}` : undefined,
    errorMessage ? `errorMessage:${JSON.stringify(errorMessage)}` : undefined,
    ...metaOpts,
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.Integer({${opts.join(',')}})`
  }
  return 'Type.Integer()'
}
