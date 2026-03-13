import type { JSONSchema } from '../../types/index.js'

export function integer(schema: JSONSchema): string {
  if (schema.format === 'bigint') {
    const actions = [
      schema.minimum !== undefined ? `v.minValue(BigInt(${schema.minimum}))` : undefined,
      schema.maximum !== undefined ? `v.maxValue(BigInt(${schema.maximum}))` : undefined,
    ].filter((v) => v !== undefined)

    if (actions.length > 0) return `v.pipe(v.bigint(),${actions.join(',')})`
    return 'v.bigint()'
  }

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

  const actions = ['v.integer()', minimum, maximum, multipleOf].filter((v) => v !== undefined)

  return `v.pipe(v.number(),${actions.join(',')})`
}
