import type { JSONSchema } from '../types/index.js'

export function number(schema: JSONSchema): string {
  const actions: string[] = []

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

  if (actions.length > 0) {
    return `Schema.Number.pipe(${actions.join(',')})`
  }
  return 'Schema.Number'
}
