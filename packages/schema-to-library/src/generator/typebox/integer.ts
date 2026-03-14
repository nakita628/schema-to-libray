import type { JSONSchema } from '../../helper/index.js'

export function integer(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message']

  if (schema.format === 'bigint') {
    const opts = [
      schema.minimum !== undefined ? `minimum:BigInt(${schema.minimum})` : undefined,
      schema.maximum !== undefined ? `maximum:BigInt(${schema.maximum})` : undefined,
      errorMessage ? `errorMessage:${JSON.stringify(errorMessage)}` : undefined,
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
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.Integer({${opts.join(',')}})`
  }
  return 'Type.Integer()'
}
