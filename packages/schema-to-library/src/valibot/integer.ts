import type { JSONSchema } from '../types/index.js'

export function integer(schema: JSONSchema): string {
  if (schema.format === 'bigint') {
    const actions: string[] = []
    if (schema.minimum !== undefined) actions.push(`v.minValue(BigInt(${schema.minimum}))`)
    if (schema.maximum !== undefined) actions.push(`v.maxValue(BigInt(${schema.maximum}))`)
    if (actions.length > 0) return `v.pipe(v.bigint(),${actions.join(',')})`
    return 'v.bigint()'
  }

  const actions: string[] = ['v.integer()']

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

  return `v.pipe(v.number(),${actions.join(',')})`
}