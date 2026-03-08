import type { JSONSchema } from '../types/index.js'

export function number(schema: JSONSchema): string {
  const actions: string[] = []

  if (schema.minimum !== undefined) {
    actions.push(`v.minValue(${schema.minimum})`)
  } else if (typeof schema.exclusiveMinimum === 'number') {
    actions.push(`v.minValue(${schema.exclusiveMinimum})`)
  }

  if (schema.maximum !== undefined) {
    actions.push(`v.maxValue(${schema.maximum})`)
  } else if (typeof schema.exclusiveMaximum === 'number') {
    actions.push(`v.maxValue(${schema.exclusiveMaximum})`)
  }

  if (schema.multipleOf !== undefined) {
    actions.push(`v.multipleOf(${schema.multipleOf})`)
  }

  if (actions.length > 0) {
    return `v.pipe(v.number(),${actions.join(',')})`
  }
  return 'v.number()'
}
