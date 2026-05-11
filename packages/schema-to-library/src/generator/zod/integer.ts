import type { JSONSchema } from '../../parser/index.js'
import { zodBaseError, zodError } from '../../utils/index.js'

/**
 * Generates a Zod schema for integer types (int / int32 / int64 / bigint), with
 * min/max/multipleOf constraints and `x-*-message` vendor extensions translated
 * to Zod v4 `{error: "msg"}` parameters.
 */
export function integer(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const baseErrorArg = zodBaseError(errorMessage, requiredMessage)
  const base =
    schema.format === 'int32'
      ? `z.int32(${baseErrorArg})`
      : schema.format === 'int64'
        ? `z.int64(${baseErrorArg})`
        : schema.format === 'bigint'
          ? `z.bigint(${baseErrorArg})`
          : `z.int(${baseErrorArg})`
  const lit = (n: number): string => {
    if (schema.format === 'bigint') return `BigInt(${n})`
    if (schema.format === 'int64') return `${n}n`
    return `${n}`
  }
  // v3.0: separate inclusive (.min()) / exclusive (.gt() / .positive()) slots
  const minimumMessage = schema['x-minimum-message']
  const exclusiveMinMessage = schema['x-exclusiveMinimum-message']
  const minErrorArg = minimumMessage ? zodError(minimumMessage) : ''
  const minErrorPart = minErrorArg ? `,${minErrorArg}` : ''
  const exMinErrorArg = exclusiveMinMessage ? zodError(exclusiveMinMessage) : ''
  const exMinErrorPart = exMinErrorArg ? `,${exMinErrorArg}` : ''
  const minimum = (() => {
    if (schema.minimum === undefined && schema.exclusiveMinimum === undefined) {
      return undefined
    }
    const value = schema.minimum ?? schema.exclusiveMinimum
    if (value === 0 && schema.exclusiveMinimum === true) {
      return `.positive(${exMinErrorArg})`
    }
    if (value === 0 && schema.exclusiveMinimum === false) {
      return `.nonnegative(${minErrorArg})`
    }
    if (
      (schema.exclusiveMinimum === true || schema.minimum === undefined) &&
      typeof value === 'number'
    ) {
      return `.gt(${lit(value)}${exMinErrorPart})`
    }
    if (typeof schema.minimum === 'number') {
      return `.min(${lit(schema.minimum)}${minErrorPart})`
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
    if (schema.maximum === undefined && schema.exclusiveMaximum === undefined) {
      return undefined
    }
    const value = schema.maximum ?? schema.exclusiveMaximum
    if (value === 0 && schema.exclusiveMaximum === true) {
      return `.negative(${exMaxErrorArg})`
    }
    if (value === 0 && schema.exclusiveMaximum === false) {
      return `.nonpositive(${maxErrorArg})`
    }
    if (
      (schema.exclusiveMaximum === true || schema.maximum === undefined) &&
      typeof value === 'number'
    ) {
      return `.lt(${lit(value)}${exMaxErrorPart})`
    }
    if (typeof schema.maximum === 'number') {
      return `.max(${lit(schema.maximum)}${maxErrorPart})`
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
    typeof schema.multipleOf === 'number'
      ? `.multipleOf(${lit(schema.multipleOf)}${multipleOfErrorArg})`
      : undefined
  return [base, minimum, maximum, multipleOf].filter((v) => v !== undefined).join('')
}
