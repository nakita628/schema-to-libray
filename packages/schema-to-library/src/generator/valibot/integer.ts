import type { JSONSchema } from '../../parser/index.js'
import { valibotError } from '../../utils/index.js'

export function integer(schema: JSONSchema) {
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
  const exMinMessage = schema['x-exclusiveMinimum-message']
  const exMinErrorPart = exMinMessage ? `,${valibotError(exMinMessage)}` : ''
  const exMaxMessage = schema['x-exclusiveMaximum-message']
  const exMaxErrorPart = exMaxMessage ? `,${valibotError(exMaxMessage)}` : ''
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorPart = multipleOfMessage ? `,${valibotError(multipleOfMessage)}` : ''
  if (schema.format === 'bigint') {
    const actions = [
      schema.minimum !== undefined
        ? `v.minValue(BigInt(${schema.minimum})${minErrorPart})`
        : undefined,
      schema.maximum !== undefined
        ? `v.maxValue(BigInt(${schema.maximum})${maxErrorPart})`
        : undefined,
    ].filter((v) => v !== undefined)
    if (actions.length > 0) return `v.pipe(v.bigint(${baseErrorArg}),${actions.join(',')})`
    return errorMessage ? `v.bigint(${baseErrorArg})` : 'v.bigint()'
  }
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
  const integerAction = errorMessage ? `v.integer(${baseErrorArg})` : 'v.integer()'
  const actions = [integerAction, minimum, maximum, multipleOf].filter((v) => v !== undefined)
  return `v.pipe(v.number(${baseErrorArg}),${actions.join(',')})`
}
