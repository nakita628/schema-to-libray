import type { JSONSchema } from '../../parser/index.js'
import { effectError } from '../../utils/index.js'

export function number(schema: JSONSchema) {
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const minimumMessage = schema['x-minimum-message']
  const minErrorPart = minimumMessage ? `,${effectError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maximum-message']
  const maxErrorPart = maximumMessage ? `,${effectError(maximumMessage)}` : ''
  // v3.0: exclusive bounds get their own message (isGreaterThan / isLessThan)
  const exMinMessage = schema['x-exclusiveMinimum-message']
  const exMinErrorPart = exMinMessage ? `,${effectError(exMinMessage)}` : ''
  const exMaxMessage = schema['x-exclusiveMaximum-message']
  const exMaxErrorPart = exMaxMessage ? `,${effectError(exMaxMessage)}` : ''
  const multipleOfMessage = schema['x-multipleOf-message']
  const multipleOfErrorPart = multipleOfMessage ? `,${effectError(multipleOfMessage)}` : ''
  const minimum = (() => {
    if (schema.minimum !== undefined) {
      return schema.exclusiveMinimum === true
        ? `Schema.isGreaterThan(${schema.minimum}${exMinErrorPart})`
        : `Schema.isGreaterThanOrEqualTo(${schema.minimum}${minErrorPart})`
    }
    if (typeof schema.exclusiveMinimum === 'number') {
      return `Schema.isGreaterThan(${schema.exclusiveMinimum}${exMinErrorPart})`
    }
    return undefined
  })()
  const maximum = (() => {
    if (schema.maximum !== undefined) {
      return schema.exclusiveMaximum === true
        ? `Schema.isLessThan(${schema.maximum}${exMaxErrorPart})`
        : `Schema.isLessThanOrEqualTo(${schema.maximum}${maxErrorPart})`
    }
    if (typeof schema.exclusiveMaximum === 'number') {
      return `Schema.isLessThan(${schema.exclusiveMaximum}${exMaxErrorPart})`
    }
    return undefined
  })()
  const multipleOf =
    schema.multipleOf !== undefined
      ? `Schema.isMultipleOf(${schema.multipleOf}${multipleOfErrorPart})`
      : undefined
  const checks = [minimum, maximum, multipleOf].filter((v) => v !== undefined)
  const base = checks.length > 0 ? `Schema.Number.check(${checks.join(',')})` : 'Schema.Number'
  return errorMessage ? `${base}.annotate(${effectError(errorMessage)})` : base
}
