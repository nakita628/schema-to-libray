import { typeboxMetaOpts } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

export function number(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const minMessage = schema['x-minimum-message']
  const maxMessage = schema['x-maximum-message']
  const exMinMessage = schema['x-exclusiveMinimum-message']
  const exMaxMessage = schema['x-exclusiveMaximum-message']
  const multipleOfMessage = schema['x-multipleOf-message']
  const errMsgEntries: string[] = []
  if (errorMessage) errMsgEntries.push(`type:${JSON.stringify(errorMessage)}`)
  if (requiredMessage) errMsgEntries.push(`required:${JSON.stringify(requiredMessage)}`)
  if (minMessage) errMsgEntries.push(`minimum:${JSON.stringify(minMessage)}`)
  if (maxMessage) errMsgEntries.push(`maximum:${JSON.stringify(maxMessage)}`)
  if (exMinMessage) errMsgEntries.push(`exclusiveMinimum:${JSON.stringify(exMinMessage)}`)
  if (exMaxMessage) errMsgEntries.push(`exclusiveMaximum:${JSON.stringify(exMaxMessage)}`)
  if (multipleOfMessage) errMsgEntries.push(`multipleOf:${JSON.stringify(multipleOfMessage)}`)
  const errMsg =
    errMsgEntries.length > 0 ? `errorMessage:{${errMsgEntries.join(',')}}` : undefined

  const opts = [
    schema.minimum !== undefined ? `minimum:${schema.minimum}` : undefined,
    typeof schema.exclusiveMinimum === 'number'
      ? `exclusiveMinimum:${schema.exclusiveMinimum}`
      : undefined,
    schema.maximum !== undefined ? `maximum:${schema.maximum}` : undefined,
    typeof schema.exclusiveMaximum === 'number'
      ? `exclusiveMaximum:${schema.exclusiveMaximum}`
      : undefined,
    schema.multipleOf !== undefined ? `multipleOf:${schema.multipleOf}` : undefined,
    errMsg,
    ...typeboxMetaOpts(schema),
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.Number({${opts.join(',')}})`
  }
  return 'Type.Number()'
}
