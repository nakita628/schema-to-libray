import type { JSONSchema } from '../../parser/index.js'
import { effectError } from '../../utils/index.js'

export function number(schema: JSONSchema) {
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const minimumMessage = schema['x-minimum-message']
  const minErrorPart = minimumMessage ? `,${effectError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maximum-message']
  const maxErrorPart = maximumMessage ? `,${effectError(maximumMessage)}` : ''
  // v3.0: exclusive bounds get their own message (greaterThan / lessThan)
  const exMinMessage = schema['x-exclusiveMinimum-message']
  const exMinErrorPart = exMinMessage ? `,${effectError(exMinMessage)}` : ''
  const exMaxMessage = schema['x-exclusiveMaximum-message']
  const exMaxErrorPart = exMaxMessage ? `,${effectError(exMaxMessage)}` : ''
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorPart = multipleOfMessage ? `,${effectError(multipleOfMessage)}` : ''
  const minimum = (() => {
    if (schema.minimum !== undefined) {
      return schema.exclusiveMinimum === true
        ? `Schema.greaterThan(${schema.minimum}${exMinErrorPart})`
        : `Schema.greaterThanOrEqualTo(${schema.minimum}${minErrorPart})`
    }
    if (typeof schema.exclusiveMinimum === 'number')
      return `Schema.greaterThan(${schema.exclusiveMinimum}${exMinErrorPart})`
    return undefined
  })()
  const maximum = (() => {
    if (schema.maximum !== undefined) {
      return schema.exclusiveMaximum === true
        ? `Schema.lessThan(${schema.maximum}${exMaxErrorPart})`
        : `Schema.lessThanOrEqualTo(${schema.maximum}${maxErrorPart})`
    }
    if (typeof schema.exclusiveMaximum === 'number')
      return `Schema.lessThan(${schema.exclusiveMaximum}${exMaxErrorPart})`
    return undefined
  })()
  const multipleOf =
    schema.multipleOf !== undefined
      ? `Schema.multipleOf(${schema.multipleOf}${multipleOfErrorPart})`
      : undefined
  const actions = [minimum, maximum, multipleOf].filter((v) => v !== undefined)
  if (actions.length > 0) {
    const result = `Schema.Number.pipe(${actions.join(',')})`
    return errorMessage ? `${result}.annotations(${effectError(errorMessage)})` : result
  }
  return errorMessage ? `Schema.Number.annotations(${effectError(errorMessage)})` : 'Schema.Number'
}
