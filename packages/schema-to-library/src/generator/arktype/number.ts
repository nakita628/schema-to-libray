import { NUMBER_RANGES } from '../../constants/index.js'
import type { JSONSchema } from '../../parser/index.js'

/** The DSL comparators of a numeric node: `>= 1`, `< 5`, `% 2`. */
export function numericConstraints(schema: JSONSchema): readonly string[] {
  const minimum = (() => {
    if (schema.minimum !== undefined) {
      return schema.exclusiveMinimum === true ? `> ${schema.minimum}` : `>= ${schema.minimum}`
    }
    if (typeof schema.exclusiveMinimum === 'number') return `> ${schema.exclusiveMinimum}`
    return undefined
  })()
  const maximum = (() => {
    if (schema.maximum !== undefined) {
      return schema.exclusiveMaximum === true ? `< ${schema.maximum}` : `<= ${schema.maximum}`
    }
    if (typeof schema.exclusiveMaximum === 'number') return `< ${schema.exclusiveMaximum}`
    return undefined
  })()
  const multipleOf = schema.multipleOf !== undefined ? `% ${schema.multipleOf}` : undefined
  return [minimum, maximum, multipleOf].filter((v) => v !== undefined)
}

/** The range comparators of a fixed-width numeric `format`, if it has one. */
export function rangeConstraints(format: string | undefined): readonly string[] {
  const range = format === undefined ? undefined : NUMBER_RANGES[format]
  if (range === undefined) return []
  return [`>= ${range.minimum}`, `<= ${range.maximum}`]
}

/**
 * A numeric keyword with its comparators as one quoted definition:
 * `"number.integer >= 1 & number.integer <= 5"`. One definition, not an `.and()` chain
 * of them, so a morph can validate its output against it with `.to()`.
 */
export function constraintDefinition(base: string, constraints: readonly string[]): string {
  if (constraints.length === 0) return `"${base}"`
  return `"${constraints.map((c) => `${base} ${c}`).join(' & ')}"`
}

/**
 * The `.narrow(...)` chain of a numeric node whose bounds carry their own messages: the
 * DSL has no message slot, so each keyword becomes a predicate with `ctx.mustBe`.
 */
export function numericNarrows(schema: JSONSchema, errorMessage: string | undefined): string {
  const minMessage = schema['x-minimum-message']
  const maxMessage = schema['x-maximum-message']
  const exclusiveMinimumMessage = schema['x-exclusiveMinimum-message']
  const exclusiveMaximumMessage = schema['x-exclusiveMaximum-message']
  const multipleOfMessage = schema['x-multipleOf-message']
  const narrows: string[] = []
  if (schema.minimum !== undefined && schema.exclusiveMinimum !== true) {
    const msg = minMessage ?? errorMessage ?? `must be >= ${schema.minimum}`
    narrows.push(
      `.narrow((data, ctx) => data >= ${schema.minimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (schema.exclusiveMinimum === true && schema.minimum !== undefined) {
    const msg = exclusiveMinimumMessage ?? errorMessage ?? `must be > ${schema.minimum}`
    narrows.push(
      `.narrow((data, ctx) => data > ${schema.minimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (typeof schema.exclusiveMinimum === 'number') {
    const msg = exclusiveMinimumMessage ?? errorMessage ?? `must be > ${schema.exclusiveMinimum}`
    narrows.push(
      `.narrow((data, ctx) => data > ${schema.exclusiveMinimum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (schema.maximum !== undefined && schema.exclusiveMaximum !== true) {
    const msg = maxMessage ?? errorMessage ?? `must be <= ${schema.maximum}`
    narrows.push(
      `.narrow((data, ctx) => data <= ${schema.maximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (schema.exclusiveMaximum === true && schema.maximum !== undefined) {
    const msg = exclusiveMaximumMessage ?? errorMessage ?? `must be < ${schema.maximum}`
    narrows.push(
      `.narrow((data, ctx) => data < ${schema.maximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (typeof schema.exclusiveMaximum === 'number') {
    const msg = exclusiveMaximumMessage ?? errorMessage ?? `must be < ${schema.exclusiveMaximum}`
    narrows.push(
      `.narrow((data, ctx) => data < ${schema.exclusiveMaximum} || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  if (schema.multipleOf !== undefined) {
    const msg = multipleOfMessage ?? errorMessage ?? `must be a multiple of ${schema.multipleOf}`
    narrows.push(
      `.narrow((data, ctx) => data % ${schema.multipleOf} === 0 || ctx.mustBe(${JSON.stringify(msg)}))`,
    )
  }
  return narrows.join('')
}

/** Whether any bound of a numeric node carries a message of its own. */
export function hasPerKeywordMessage(schema: JSONSchema): boolean {
  // `.some(Boolean)`, not `??`: an empty message is no message, and the branch it
  // guards would emit `ctx.mustBe('')`.
  return [
    schema['x-minimum-message'],
    schema['x-maximum-message'],
    schema['x-exclusiveMinimum-message'],
    schema['x-exclusiveMaximum-message'],
    schema['x-multipleOf-message'],
  ].some(Boolean)
}

/**
 * A morph reading the text of a wire parameter with `Number`, guarded by `guard`: what
 * every other generator reads, where ArkType's own `string.numeric.parse` refuses `1e3`,
 * `1.0`, `007` and `-0`.
 */
export function numberMorph(guard: 'isFinite' | 'isSafeInteger', expected: string): string {
  return `type("string").pipe((data, ctx) => { const value = Number(data); return Number.${guard}(value) ? value : ctx.error(${JSON.stringify(expected)}) })`
}

/**
 * The ArkType definition of a number node: the `number` keyword with its comparators,
 * `float` / `float32` carrying its range. Bounds with messages of their own become a
 * `.narrow()` chain instead.
 */
export function number(schema: JSONSchema) {
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''
  const isFloat32 = schema.format === 'float' || schema.format === 'float32'
  const constraints = [
    ...rangeConstraints(isFloat32 ? 'float32' : undefined),
    ...numericConstraints(schema),
  ]
  if (hasPerKeywordMessage(schema)) {
    const base = constraintDefinition('number', rangeConstraints(isFloat32 ? 'float32' : undefined))
    return `type(${base})${numericNarrows(schema, errorMessage)}${describe}`
  }
  const definition = constraintDefinition('number', constraints)
  if (errorMessage) return `type(${definition})${describe}`
  return definition
}
