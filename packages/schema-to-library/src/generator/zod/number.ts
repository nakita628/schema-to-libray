import type { JSONSchema } from '../../parser/index.js'
import { zodBaseError, zodError } from '../../utils/index.js'

/**
 * Generates a Zod schema for number types (number / float32 / float64), with
 * min/max/multipleOf constraints and `x-*-message` vendor extensions translated
 * to Zod v4 `{error: "msg"}` parameters.
 */
export function number(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const baseErrorArg = zodBaseError(errorMessage, requiredMessage)
  const coercePrefix = schema['x-coerce'] === true ? 'coerce.' : ''
  const base =
    schema.format === 'float' || schema.format === 'float32'
      ? `z.${coercePrefix}float32(${baseErrorArg})`
      : schema.format === 'float64'
        ? `z.${coercePrefix}float64(${baseErrorArg})`
        : `z.${coercePrefix}number(${baseErrorArg})`
  // v3.0: separate inclusive (.min()) / exclusive (.gt() / .positive()) slots
  const minimumMessage = schema['x-minimum-message']
  const exclusiveMinMessage = schema['x-exclusiveMinimum-message']
  const minErrorArg = minimumMessage ? zodError(minimumMessage) : ''
  const minErrorPart = minErrorArg ? `,${minErrorArg}` : ''
  const exMinErrorArg = exclusiveMinMessage ? zodError(exclusiveMinMessage) : ''
  const exMinErrorPart = exMinErrorArg ? `,${exMinErrorArg}` : ''
  const minimum = (() => {
    if (schema.minimum !== undefined) {
      if (schema.minimum === 0 && schema.exclusiveMinimum === true) {
        return `.positive(${exMinErrorArg})`
      }
      if (schema.minimum === 0 && schema.exclusiveMinimum === false) {
        return `.nonnegative(${minErrorArg})`
      }
      if (schema.exclusiveMinimum === true) {
        return `.gt(${schema.minimum}${exMinErrorPart})`
      }
      return `.min(${schema.minimum}${minErrorPart})`
    }
    if (typeof schema.exclusiveMinimum === 'number') {
      return `.gt(${schema.exclusiveMinimum}${exMinErrorPart})`
    }
    return undefined
  })()
  const maximumMessage = schema['x-maximum-message']
  const exclusiveMaxMessage = schema['x-exclusiveMaximum-message']
  const maxErrorArg = maximumMessage ? zodError(maximumMessage) : ''
  const maxErrorPart = maxErrorArg ? `,${maxErrorArg}` : ''
  const exMaxErrorArg = exclusiveMaxMessage ? zodError(exclusiveMaxMessage) : ''
  const exMaxErrorPart = exMaxErrorArg ? `,${exMaxErrorArg}` : ''
  const maximum = (() => {
    if (schema.maximum !== undefined) {
      if (schema.maximum === 0 && schema.exclusiveMaximum === true) {
        return `.negative(${exMaxErrorArg})`
      }
      if (schema.maximum === 0 && schema.exclusiveMaximum === false) {
        return `.nonpositive(${maxErrorArg})`
      }
      if (schema.exclusiveMaximum === true) {
        return `.lt(${schema.maximum}${exMaxErrorPart})`
      }
      return `.max(${schema.maximum}${maxErrorPart})`
    }
    if (typeof schema.exclusiveMaximum === 'number') {
      return `.lt(${schema.exclusiveMaximum}${exMaxErrorPart})`
    }
    return undefined
  })()
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorArg = multipleOfMessage
    ? `,${zodError(multipleOfMessage)}`
    : baseErrorArg
      ? `,${baseErrorArg}`
      : ''
  const multipleOf =
    schema.multipleOf !== undefined
      ? `.multipleOf(${schema.multipleOf}${multipleOfErrorArg})`
      : undefined
  return [base, minimum, maximum, multipleOf].filter((v) => v !== undefined).join('')
}
