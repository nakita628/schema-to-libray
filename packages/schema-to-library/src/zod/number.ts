import type { JSONSchema } from '../types/index.js'
import { error } from '../helper/index.js'

/**
 * Generate Zod number schema from JSON Schema
 *
 * @param schema - JSON Schema object with number type
 * @returns Generated Zod number schema code
 * @example
 * ```ts
 * number({ type: 'number', minimum: 0, maximum: 100 }) // 'z.number().min(0).max(100)'
 * ```
 */
export function number(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message'] as string | undefined
  const baseErrorArg = errorMessage ? error(errorMessage) : ''

  const base =
    schema.format === 'float' || schema.format === 'float32'
      ? `z.float32(${baseErrorArg})`
      : schema.format === 'float64'
        ? `z.float64(${baseErrorArg})`
        : `z.number(${baseErrorArg})`

  const minimumMessage = schema['x-minimum-message'] as string | undefined
  const minErrArg = minimumMessage ? error(minimumMessage) : ''
  const minErrPart = minErrArg ? `,${minErrArg}` : ''

  const minimum = (() => {
    if (schema.minimum !== undefined) {
      if (schema.minimum === 0 && schema.exclusiveMinimum === true) {
        return `.positive(${minErrArg})`
      }
      if (schema.minimum === 0 && schema.exclusiveMinimum === false) {
        return `.nonnegative(${minErrArg})`
      }
      if (schema.exclusiveMinimum === true) {
        return `.gt(${schema.minimum}${minErrPart})`
      }
      return `.min(${schema.minimum}${minErrPart})`
    }
    if (typeof schema.exclusiveMinimum === 'number') {
      return `.gt(${schema.exclusiveMinimum}${minErrPart})`
    }
    return undefined
  })()

  const maximumMessage = schema['x-maximum-message'] as string | undefined
  const maxErrArg = maximumMessage ? error(maximumMessage) : ''
  const maxErrPart = maxErrArg ? `,${maxErrArg}` : ''

  const maximum = (() => {
    if (schema.maximum !== undefined) {
      if (schema.maximum === 0 && schema.exclusiveMaximum === true) {
        return `.negative(${maxErrArg})`
      }
      if (schema.maximum === 0 && schema.exclusiveMaximum === false) {
        return `.nonpositive(${maxErrArg})`
      }
      if (schema.exclusiveMaximum === true) {
        return `.lt(${schema.maximum}${maxErrPart})`
      }
      return `.max(${schema.maximum}${maxErrPart})`
    }
    if (typeof schema.exclusiveMaximum === 'number') {
      return `.lt(${schema.exclusiveMaximum}${maxErrPart})`
    }
    return undefined
  })()

  const multipleOfMsg = schema['x-multipleOf-message'] as string | undefined
  const multipleOfErrArg = multipleOfMsg
    ? `,${error(multipleOfMsg)}`
    : baseErrorArg
      ? `,${baseErrorArg}`
      : ''
  const multipleOf =
    schema.multipleOf !== undefined
      ? `.multipleOf(${schema.multipleOf}${multipleOfErrArg})`
      : undefined

  return [base, minimum, maximum, multipleOf].filter((v) => v !== undefined).join('')
}
