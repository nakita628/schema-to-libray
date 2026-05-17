import type { JSONSchema } from '../../parser/index.js'

export function number(schema: JSONSchema) {
  // v3.0: arktype uses DSL for numeric constraints. When per-keyword messages
  // are present, fall back to `.narrow()` form with `ctx.mustBe(msg)`.
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''
  const minMessage = schema['x-minimum-message']
  const maxMessage = schema['x-maximum-message']
  const exMinMessage = schema['x-exclusiveMinimum-message']
  const exMaxMessage = schema['x-exclusiveMaximum-message']
  const mofMessage = schema['x-multipleOf-message']
  const hasPerKeywordMsg = minMessage || maxMessage || exMinMessage || exMaxMessage || mofMessage

  if (hasPerKeywordMsg) {
    const narrows: string[] = []
    if (schema.minimum !== undefined && schema.exclusiveMinimum !== true) {
      const msg = minMessage ?? errorMessage ?? `must be >= ${schema.minimum}`
      narrows.push(
        `.narrow((n, ctx) => n >= ${schema.minimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (schema.exclusiveMinimum === true && schema.minimum !== undefined) {
      const msg = exMinMessage ?? errorMessage ?? `must be > ${schema.minimum}`
      narrows.push(
        `.narrow((n, ctx) => n > ${schema.minimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (typeof schema.exclusiveMinimum === 'number') {
      const msg = exMinMessage ?? errorMessage ?? `must be > ${schema.exclusiveMinimum}`
      narrows.push(
        `.narrow((n, ctx) => n > ${schema.exclusiveMinimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (schema.maximum !== undefined && schema.exclusiveMaximum !== true) {
      const msg = maxMessage ?? errorMessage ?? `must be <= ${schema.maximum}`
      narrows.push(
        `.narrow((n, ctx) => n <= ${schema.maximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (schema.exclusiveMaximum === true && schema.maximum !== undefined) {
      const msg = exMaxMessage ?? errorMessage ?? `must be < ${schema.maximum}`
      narrows.push(
        `.narrow((n, ctx) => n < ${schema.maximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (typeof schema.exclusiveMaximum === 'number') {
      const msg = exMaxMessage ?? errorMessage ?? `must be < ${schema.exclusiveMaximum}`
      narrows.push(
        `.narrow((n, ctx) => n < ${schema.exclusiveMaximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (schema.multipleOf !== undefined) {
      const msg = mofMessage ?? errorMessage ?? `must be a multiple of ${schema.multipleOf}`
      narrows.push(
        `.narrow((n, ctx) => n % ${schema.multipleOf} === 0 || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    return `type("number")${narrows.join('')}${describe}`
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
    const expr = `"number ${constraints.join(' ')}"`
    if (errorMessage) return `type(${expr})${describe}`
    return expr
  }
  if (errorMessage) return `type("number")${describe}`
  return '"number"'
}
