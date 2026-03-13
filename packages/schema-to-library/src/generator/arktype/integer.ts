import type { JSONSchema } from '../../types/index.js'

export function integer(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message'] as string | undefined
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''

  if (schema.format === 'bigint') {
    if (errorMessage) return `type("bigint")${describe}`
    return '"bigint"'
  }

  const minimum = (() => {
    if (schema.minimum !== undefined) return `>= ${schema.minimum}`
    if (typeof schema.exclusiveMinimum === 'number') return `> ${schema.exclusiveMinimum}`
    return undefined
  })()

  const maximum = (() => {
    if (schema.maximum !== undefined) return `<= ${schema.maximum}`
    if (typeof schema.exclusiveMaximum === 'number') return `< ${schema.exclusiveMaximum}`
    return undefined
  })()

  const multipleOf = schema.multipleOf !== undefined ? `% ${schema.multipleOf}` : undefined

  const constraints = [minimum, maximum, multipleOf].filter((v) => v !== undefined)

  if (constraints.length > 0) {
    const expr = `"number.integer ${constraints.join(' ')}"`
    if (errorMessage) return `type(${expr})${describe}`
    return expr
  }

  if (errorMessage) return `type("number.integer")${describe}`
  return '"number.integer"'
}
