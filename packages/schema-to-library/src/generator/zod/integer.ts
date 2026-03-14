import type { JSONSchema } from '../../helper/index.js'
import { error } from '../../utils/index.js'

/**
 * Generate Zod integer schema from JSON Schema
 *
 * @param schema - JSON Schema object with integer type
 * @returns Generated Zod integer schema code
 * @example
 * ```ts
 * integer({ type: 'integer', format: 'int64', minimum: 0 }) // 'z.int64().min(0n)'
 * ```
 */
export function integer(schema: JSONSchema): string {
  const isInt32 = schema.format === 'int32'
  const isInt64 = schema.format === 'int64'
  const isBigInt = schema.format === 'bigint'

  const errorMessage = schema['x-error-message']
  const baseErrorArg = errorMessage ? error(errorMessage) : ''

  const base = isInt32
    ? `z.int32(${baseErrorArg})`
    : isInt64
      ? `z.int64(${baseErrorArg})`
      : isBigInt
        ? `z.bigint(${baseErrorArg})`
        : `z.int(${baseErrorArg})`

  const lit = (n: number): string => {
    if (isBigInt) return `BigInt(${n})`
    if (isInt64) return `${n}n`
    return `${n}`
  }

  const minimumMessage = schema['x-minimum-message']
  const minErrArg = minimumMessage ? error(minimumMessage) : ''
  const minErrPart = minErrArg ? `,${minErrArg}` : ''

  const minimum = (() => {
    if (schema.minimum === undefined && schema.exclusiveMinimum === undefined) return undefined
    if ((schema.minimum ?? schema.exclusiveMinimum) === 0 && schema.exclusiveMinimum === true) {
      return `.positive(${minErrArg})`
    }
    if ((schema.minimum ?? schema.exclusiveMinimum) === 0 && schema.exclusiveMinimum === false) {
      return `.nonnegative(${minErrArg})`
    }
    if (schema.exclusiveMinimum === true && typeof schema.minimum === 'number') {
      return `.gt(${lit(schema.minimum)}${minErrPart})`
    }
    if (schema.minimum === undefined && typeof schema.exclusiveMinimum === 'number') {
      return `.gt(${lit(schema.exclusiveMinimum)}${minErrPart})`
    }
    if (typeof schema.minimum === 'number') {
      return `.min(${lit(schema.minimum)}${minErrPart})`
    }
    return undefined
  })()

  const maximumMessage = schema['x-maximum-message']
  const maxErrArg = maximumMessage ? error(maximumMessage) : ''
  const maxErrPart = maxErrArg ? `,${maxErrArg}` : ''

  const maximum = (() => {
    if (schema.maximum === undefined && schema.exclusiveMaximum === undefined) return undefined
    if ((schema.maximum ?? schema.exclusiveMaximum) === 0 && schema.exclusiveMaximum === true) {
      return `.negative(${maxErrArg})`
    }
    if ((schema.maximum ?? schema.exclusiveMaximum) === 0 && schema.exclusiveMaximum === false) {
      return `.nonpositive(${maxErrArg})`
    }
    if (schema.exclusiveMaximum === true && typeof schema.maximum === 'number') {
      return `.lt(${lit(schema.maximum)}${maxErrPart})`
    }
    if (schema.maximum === undefined && typeof schema.exclusiveMaximum === 'number') {
      return `.lt(${lit(schema.exclusiveMaximum)}${maxErrPart})`
    }
    if (typeof schema.maximum === 'number') {
      return `.max(${lit(schema.maximum)}${maxErrPart})`
    }
    return undefined
  })()

  const multipleOfMsg = schema['x-multipleOf-message']
  const multipleOfErrArg = multipleOfMsg
    ? `,${error(multipleOfMsg)}`
    : baseErrorArg
      ? `,${baseErrorArg}`
      : ''
  const multipleOf =
    schema.multipleOf !== undefined && typeof schema.multipleOf === 'number'
      ? `.multipleOf(${lit(schema.multipleOf)}${multipleOfErrArg})`
      : undefined

  return [base, minimum, maximum, multipleOf].filter((v) => v !== undefined).join('')
}
