import type { JSONSchema } from '../../types/index.js'
import { effectMessage } from '../../utils/index.js'

export function integer(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message'] as string | undefined
  const minimumMessage = schema['x-minimum-message'] as string | undefined
  const maximumMessage = schema['x-maximum-message'] as string | undefined
  const multipleOfMessage = schema['x-multipleOf-message'] as string | undefined

  if (schema.format === 'bigint') {
    const actions = [
      schema.minimum !== undefined
        ? `Schema.greaterThanOrEqualToBigInt(BigInt(${schema.minimum})${minimumMessage ? `,${effectMessage(minimumMessage)}` : ''})`
        : undefined,
      schema.maximum !== undefined
        ? `Schema.lessThanOrEqualToBigInt(BigInt(${schema.maximum})${maximumMessage ? `,${effectMessage(maximumMessage)}` : ''})`
        : undefined,
    ].filter((v) => v !== undefined)

    if (actions.length > 0) {
      const result = `Schema.BigIntFromSelf.pipe(${actions.join(',')})`
      return errorMessage ? `${result}.annotations(${effectMessage(errorMessage)})` : result
    }
    return errorMessage
      ? `Schema.BigIntFromSelf.annotations(${effectMessage(errorMessage)})`
      : 'Schema.BigIntFromSelf'
  }

  const minimum = (() => {
    if (schema.minimum !== undefined)
      return `Schema.greaterThanOrEqualTo(${schema.minimum}${minimumMessage ? `,${effectMessage(minimumMessage)}` : ''})`
    if (typeof schema.exclusiveMinimum === 'number')
      return `Schema.greaterThan(${schema.exclusiveMinimum}${minimumMessage ? `,${effectMessage(minimumMessage)}` : ''})`
    return undefined
  })()

  const maximum = (() => {
    if (schema.maximum !== undefined)
      return `Schema.lessThanOrEqualTo(${schema.maximum}${maximumMessage ? `,${effectMessage(maximumMessage)}` : ''})`
    if (typeof schema.exclusiveMaximum === 'number')
      return `Schema.lessThan(${schema.exclusiveMaximum}${maximumMessage ? `,${effectMessage(maximumMessage)}` : ''})`
    return undefined
  })()

  const multipleOf =
    schema.multipleOf !== undefined
      ? `Schema.multipleOf(${schema.multipleOf}${multipleOfMessage ? `,${effectMessage(multipleOfMessage)}` : ''})`
      : undefined

  const intAction = errorMessage
    ? `Schema.int(${effectMessage(errorMessage)})`
    : 'Schema.int()'

  const actions = [intAction, minimum, maximum, multipleOf].filter((v) => v !== undefined)

  return `Schema.Number.pipe(${actions.join(',')})`
}
