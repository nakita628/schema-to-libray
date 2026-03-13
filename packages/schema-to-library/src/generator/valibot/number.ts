import type { JSONSchema } from '../../types/index.js'

export function number(schema: JSONSchema): string {
  const minimum = (() => {
    if (schema.minimum !== undefined) return `v.minValue(${schema.minimum})`
    if (typeof schema.exclusiveMinimum === 'number') return `v.minValue(${schema.exclusiveMinimum})`
    return undefined
  })()

  const maximum = (() => {
    if (schema.maximum !== undefined) return `v.maxValue(${schema.maximum})`
    if (typeof schema.exclusiveMaximum === 'number') return `v.maxValue(${schema.exclusiveMaximum})`
    return undefined
  })()

  const multipleOf =
    schema.multipleOf !== undefined ? `v.multipleOf(${schema.multipleOf})` : undefined

  const actions = [minimum, maximum, multipleOf].filter((v) => v !== undefined)

  if (actions.length > 0) {
    return `v.pipe(v.number(),${actions.join(',')})`
  }
  return 'v.number()'
}
