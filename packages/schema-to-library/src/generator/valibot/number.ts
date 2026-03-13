import type { JSONSchema } from '../../types/index.js'
import { valibotMessage } from '../../utils/index.js'

export function number(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message'] as string | undefined
  const baseMsgPart = errorMessage ? valibotMessage(errorMessage) : ''
  const minimumMessage = schema['x-minimum-message'] as string | undefined
  const maximumMessage = schema['x-maximum-message'] as string | undefined
  const multipleOfMessage = schema['x-multipleOf-message'] as string | undefined

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

  const actions = [minimum, maximum, multipleOf].filter((v) => v !== undefined)

  if (actions.length > 0) {
    return `v.pipe(v.number(${baseMsgPart}),${actions.join(',')})`
  }
  return errorMessage ? `v.number(${baseMsgPart})` : 'v.number()'
}
