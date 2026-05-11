import type { JSONSchema } from '../../parser/index.js'
import { valibotError } from '../../utils/index.js'

export function number(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const baseErrorArg = errorMessage
    ? valibotError(errorMessage)
    : requiredMessage
      ? valibotError(requiredMessage)
      : ''
  const minimumMessage = schema['x-minimum-message']
  const minErrorPart = minimumMessage ? `,${valibotError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maximum-message']
  const maxErrorPart = maximumMessage ? `,${valibotError(maximumMessage)}` : ''
  // v3.0: x-exclusiveMin/Max-message for valibot's gtValue / ltValue
  const exMinMessage = schema['x-exclusiveMinimum-message']
  const exMinErrorPart = exMinMessage ? `,${valibotError(exMinMessage)}` : ''
  const exMaxMessage = schema['x-exclusiveMaximum-message']
  const exMaxErrorPart = exMaxMessage ? `,${valibotError(exMaxMessage)}` : ''
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorPart = multipleOfMessage ? `,${valibotError(multipleOfMessage)}` : ''
  const minimum = (() => {
    if (schema.minimum !== undefined) {
      return schema.exclusiveMinimum === true
        ? `v.gtValue(${schema.minimum}${exMinErrorPart})`
        : `v.minValue(${schema.minimum}${minErrorPart})`
    }
    if (typeof schema.exclusiveMinimum === 'number')
      return `v.gtValue(${schema.exclusiveMinimum}${exMinErrorPart})`
    return undefined
  })()
  const maximum = (() => {
    if (schema.maximum !== undefined) {
      return schema.exclusiveMaximum === true
        ? `v.ltValue(${schema.maximum}${exMaxErrorPart})`
        : `v.maxValue(${schema.maximum}${maxErrorPart})`
    }
    if (typeof schema.exclusiveMaximum === 'number')
      return `v.ltValue(${schema.exclusiveMaximum}${exMaxErrorPart})`
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
