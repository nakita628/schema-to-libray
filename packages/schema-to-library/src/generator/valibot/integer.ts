import type { JSONSchema } from '../../helper/index.js'
import { valibotMessage } from '../../utils/index.js'

export function integer(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message']
  const baseMsgPart = errorMessage ? valibotMessage(errorMessage) : ''

  if (schema.format === 'bigint') {
    const minimumMessage = schema['x-minimum-message']
    const maximumMessage = schema['x-maximum-message']

    const actions = [
      schema.minimum !== undefined
        ? `v.minValue(BigInt(${schema.minimum})${minimumMessage ? `,${valibotMessage(minimumMessage)}` : ''})`
        : undefined,
      schema.maximum !== undefined
        ? `v.maxValue(BigInt(${schema.maximum})${maximumMessage ? `,${valibotMessage(maximumMessage)}` : ''})`
        : undefined,
    ].filter((v) => v !== undefined)

    if (actions.length > 0) return `v.pipe(v.bigint(${baseMsgPart}),${actions.join(',')})`
    return errorMessage ? `v.bigint(${baseMsgPart})` : 'v.bigint()'
  }

  const minimumMessage = schema['x-minimum-message']
  const maximumMessage = schema['x-maximum-message']
  const multipleOfMessage = schema['x-multipleOf-message']

  const minimum = (() => {
    if (schema.minimum !== undefined)
      return `v.minValue(${schema.minimum}${minimumMessage ? `,${valibotMessage(minimumMessage)}` : ''})`
    if (typeof schema.exclusiveMinimum === 'number')
      return `v.minValue(${schema.exclusiveMinimum}${minimumMessage ? `,${valibotMessage(minimumMessage)}` : ''})`
    return undefined
  })()

  const maximum = (() => {
    if (schema.maximum !== undefined)
      return `v.maxValue(${schema.maximum}${maximumMessage ? `,${valibotMessage(maximumMessage)}` : ''})`
    if (typeof schema.exclusiveMaximum === 'number')
      return `v.maxValue(${schema.exclusiveMaximum}${maximumMessage ? `,${valibotMessage(maximumMessage)}` : ''})`
    return undefined
  })()

  const multipleOf =
    schema.multipleOf !== undefined
      ? `v.multipleOf(${schema.multipleOf}${multipleOfMessage ? `,${valibotMessage(multipleOfMessage)}` : ''})`
      : undefined

  const integerMsg = errorMessage ? `v.integer(${baseMsgPart})` : 'v.integer()'
  const actions = [integerMsg, minimum, maximum, multipleOf].filter((v) => v !== undefined)

  return `v.pipe(v.number(${baseMsgPart}),${actions.join(',')})`
}
