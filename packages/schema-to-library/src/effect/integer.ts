import type { JSONSchema } from '../types/index.js'

export function integer(schema: JSONSchema): string {
  if (schema.format === 'bigint') {
    const actions: string[] = []
    if (schema.minimum !== undefined) actions.push(`Schema.greaterThanOrEqualToBigInt(BigInt(${schema.minimum}))`)
    if (schema.maximum !== undefined) actions.push(`Schema.lessThanOrEqualToBigInt(BigInt(${schema.maximum}))`)
    if (actions.length > 0) return `Schema.BigIntFromSelf.pipe(${actions.join(',')})`
    return 'Schema.BigIntFromSelf'
  }

  const actions: string[] = ['Schema.int()']

  if (schema.minimum !== undefined) {
    actions.push(`Schema.greaterThanOrEqualTo(${schema.minimum})`)
  } else if (typeof schema.exclusiveMinimum === 'number') {
    actions.push(`Schema.greaterThan(${schema.exclusiveMinimum})`)
  }

  if (schema.maximum !== undefined) {
    actions.push(`Schema.lessThanOrEqualTo(${schema.maximum})`)
  } else if (typeof schema.exclusiveMaximum === 'number') {
    actions.push(`Schema.lessThan(${schema.exclusiveMaximum})`)
  }

  if (schema.multipleOf !== undefined) {
    actions.push(`Schema.multipleOf(${schema.multipleOf})`)
  }

  return `Schema.Number.pipe(${actions.join(',')})`
}
