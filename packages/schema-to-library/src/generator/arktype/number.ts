import type { JSONSchema } from '../../parser/index.js'

export function number(schema: JSONSchema) {
  // v3.0: arktype uses DSL for numeric constraints. When per-keyword messages
  // are present, fall back to `.narrow()` form with `ctx.mustBe(msg)`.
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''
  const minMessage = schema['x-minimum-message']
  const maxMessage = schema['x-maximum-message']
  const exclusiveMinimumMessage = schema['x-exclusiveMinimum-message']
  const exclusiveMaximumMessage = schema['x-exclusiveMaximum-message']
  const multipleOfMessage = schema['x-multipleOf-message']
  const hasPerKeywordMessage =
    minMessage ||
    maxMessage ||
    exclusiveMinimumMessage ||
    exclusiveMaximumMessage ||
    multipleOfMessage

  if (hasPerKeywordMessage) {
    const narrows: string[] = []
    if (schema.minimum !== undefined && schema.exclusiveMinimum !== true) {
      const msg = minMessage ?? errorMessage ?? `must be >= ${schema.minimum}`
      narrows.push(
        `.narrow((n, ctx) => n >= ${schema.minimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (schema.exclusiveMinimum === true && schema.minimum !== undefined) {
      const msg = exclusiveMinimumMessage ?? errorMessage ?? `must be > ${schema.minimum}`
      narrows.push(
        `.narrow((n, ctx) => n > ${schema.minimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (typeof schema.exclusiveMinimum === 'number') {
      const msg = exclusiveMinimumMessage ?? errorMessage ?? `must be > ${schema.exclusiveMinimum}`
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
      const msg = exclusiveMaximumMessage ?? errorMessage ?? `must be < ${schema.maximum}`
      narrows.push(
        `.narrow((n, ctx) => n < ${schema.maximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (typeof schema.exclusiveMaximum === 'number') {
      const msg = exclusiveMaximumMessage ?? errorMessage ?? `must be < ${schema.exclusiveMaximum}`
      narrows.push(
        `.narrow((n, ctx) => n < ${schema.exclusiveMaximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
      )
    }
    if (schema.multipleOf !== undefined) {
      const msg = multipleOfMessage ?? errorMessage ?? `must be a multiple of ${schema.multipleOf}`
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
  if (constraints.length > 1) {
    const parts = constraints.map((c) => `type("number ${c}")`)
    const expr = `${parts[0]}${parts
      .slice(1)
      .map((p) => `.and(${p})`)
      .join('')}`
    if (errorMessage) return `${expr}${describe}`
    return expr
  }
  if (constraints.length === 1) {
    const expr = `"number ${constraints[0]}"`
    if (errorMessage) return `type(${expr})${describe}`
    return expr
  }
  if (errorMessage) return `type("number")${describe}`
  return '"number"'
}
