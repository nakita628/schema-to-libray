import type { JSONSchema } from '../../parser/index.js'
import { valibotError } from '../../utils/index.js'

export function number(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  const baseErrorArg = errorMessage ? valibotError(errorMessage) : ''
  const minimumMessage = schema['x-minimum-message']
  const minErrorPart = minimumMessage ? `,${valibotError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maximum-message']
  const maxErrorPart = maximumMessage ? `,${valibotError(maximumMessage)}` : ''
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorPart = multipleOfMessage ? `,${valibotError(multipleOfMessage)}` : ''
  const minimum = (() => {
    if (schema.minimum !== undefined) return `v.minValue(${schema.minimum}${minErrorPart})`
    if (typeof schema.exclusiveMinimum === 'number')
      return `v.minValue(${schema.exclusiveMinimum}${minErrorPart})`
    return undefined
  })()
  const maximum = (() => {
    if (schema.maximum !== undefined) return `v.maxValue(${schema.maximum}${maxErrorPart})`
    if (typeof schema.exclusiveMaximum === 'number')
      return `v.maxValue(${schema.exclusiveMaximum}${maxErrorPart})`
    return undefined
  })()
  const multipleOf =
    schema.multipleOf !== undefined
      ? `v.multipleOf(${schema.multipleOf}${multipleOfErrorPart})`
      : undefined
  const actions = [minimum, maximum, multipleOf].filter((v) => v !== undefined)
  if (actions.length > 0) return `v.pipe(v.number(${baseErrorArg}),${actions.join(',')})`
  return errorMessage ? `v.number(${baseErrorArg})` : 'v.number()'
}
