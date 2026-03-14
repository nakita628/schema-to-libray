import type { JSONSchema } from '../../helper/index.js'
import { effectMessage } from '../../utils/index.js'

export function number(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message']
  const minimumMessage = schema['x-minimum-message']
  const maximumMessage = schema['x-maximum-message']
  const multipleOfMessage = schema['x-multipleOf-message']

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

  const actions = [minimum, maximum, multipleOf].filter((v) => v !== undefined)

  if (actions.length > 0) {
    const result = `Schema.Number.pipe(${actions.join(',')})`
    return errorMessage ? `${result}.annotations(${effectMessage(errorMessage)})` : result
  }
  return errorMessage ? `Schema.Number.annotations(${effectMessage(errorMessage)})` : 'Schema.Number'
}
