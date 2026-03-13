import type { JSONSchema } from '../../types/index.js'

export function integer(schema: JSONSchema): string {
  if (schema.format === 'bigint') {
    const actions = [
      schema.minimum !== undefined
        ? `Schema.greaterThanOrEqualToBigInt(BigInt(${schema.minimum}))`
        : undefined,
      schema.maximum !== undefined
        ? `Schema.lessThanOrEqualToBigInt(BigInt(${schema.maximum}))`
        : undefined,
    ].filter((v) => v !== undefined)

    if (actions.length > 0) return `Schema.BigIntFromSelf.pipe(${actions.join(',')})`
    return 'Schema.BigIntFromSelf'
  }

  const minimum = (() => {
    if (schema.minimum !== undefined) return `Schema.greaterThanOrEqualTo(${schema.minimum})`
    if (typeof schema.exclusiveMinimum === 'number')
      return `Schema.greaterThan(${schema.exclusiveMinimum})`
    return undefined
  })()

  const maximum = (() => {
    if (schema.maximum !== undefined) return `Schema.lessThanOrEqualTo(${schema.maximum})`
    if (typeof schema.exclusiveMaximum === 'number')
      return `Schema.lessThan(${schema.exclusiveMaximum})`
    return undefined
  })()

  const multipleOf =
    schema.multipleOf !== undefined ? `Schema.multipleOf(${schema.multipleOf})` : undefined

  const actions = ['Schema.int()', minimum, maximum, multipleOf].filter((v) => v !== undefined)

  return `Schema.Number.pipe(${actions.join(',')})`
}
