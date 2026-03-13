import type { JSONSchema } from '../../types/index.js'

export function number(schema: JSONSchema): string {
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
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.Number({${opts.join(',')}})`
  }
  return 'Type.Number()'
}
