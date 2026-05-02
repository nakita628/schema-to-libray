import type { JSONSchema } from '../../parser/index.js'
import { effectError } from '../../utils/index.js'

export function integer(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  const minimumMessage = schema['x-minimum-message']
  const minErrorPart = minimumMessage ? `,${effectError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maximum-message']
  const maxErrorPart = maximumMessage ? `,${effectError(maximumMessage)}` : ''
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorPart = multipleOfMessage ? `,${effectError(multipleOfMessage)}` : ''
  if (schema.format === 'bigint') {
    const actions = [
      schema.minimum !== undefined
        ? `Schema.greaterThanOrEqualToBigInt(BigInt(${schema.minimum})${minErrorPart})`
        : undefined,
      schema.maximum !== undefined
        ? `Schema.lessThanOrEqualToBigInt(BigInt(${schema.maximum})${maxErrorPart})`
        : undefined,
    ].filter((v) => v !== undefined)
    if (actions.length > 0) {
      const result = `Schema.BigIntFromSelf.pipe(${actions.join(',')})`
      return errorMessage ? `${result}.annotations(${effectError(errorMessage)})` : result
    }
    return errorMessage
      ? `Schema.BigIntFromSelf.annotations(${effectError(errorMessage)})`
      : 'Schema.BigIntFromSelf'
  }
  const minimum = (() => {
    if (schema.minimum !== undefined)
      return `Schema.greaterThanOrEqualTo(${schema.minimum}${minErrorPart})`
    if (typeof schema.exclusiveMinimum === 'number')
      return `Schema.greaterThan(${schema.exclusiveMinimum}${minErrorPart})`
    return undefined
  })()
  const maximum = (() => {
    if (schema.maximum !== undefined)
      return `Schema.lessThanOrEqualTo(${schema.maximum}${maxErrorPart})`
    if (typeof schema.exclusiveMaximum === 'number')
      return `Schema.lessThan(${schema.exclusiveMaximum}${maxErrorPart})`
    return undefined
  })()
  const multipleOf =
    schema.multipleOf !== undefined
      ? `Schema.multipleOf(${schema.multipleOf}${multipleOfErrorPart})`
      : undefined
  const intAction = errorMessage ? `Schema.int(${effectError(errorMessage)})` : 'Schema.int()'
  const actions = [intAction, minimum, maximum, multipleOf].filter((v) => v !== undefined)
  return `Schema.Number.pipe(${actions.join(',')})`
}
