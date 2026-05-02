import type { JSONSchema } from '../../parser/index.js'
import { valibotError } from '../../utils/index.js'

const FORMAT_PIPE: { readonly [k: string]: string } = {
  email: 'v.email()',
  uuid: 'v.uuid()',
  uri: 'v.url()',
  ipv4: 'v.ipv4()',
  ipv6: 'v.ipv6()',
  emoji: 'v.emoji()',
  base64: 'v.base64()',
  'date-time': 'v.isoDateTime()',
  date: 'v.isoDate()',
  time: 'v.isoTime()',
}

export function string(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  const baseErrorArg = errorMessage ? valibotError(errorMessage) : ''
  const patternMessage = schema['x-pattern-message']
  const patternErrorPart = patternMessage ? `,${valibotError(patternMessage)}` : ''
  const sizeMessage = schema['x-size-message']
  const sizeErrorPart = sizeMessage ? `,${valibotError(sizeMessage)}` : ''
  const minimumMessage = schema['x-minimum-message']
  const minErrorPart = minimumMessage ? `,${valibotError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maximum-message']
  const maxErrorPart = maximumMessage ? `,${valibotError(maximumMessage)}` : ''
  const format = schema.format && FORMAT_PIPE[schema.format]
  const formatAction = format
    ? errorMessage
      ? format.replace(/\(\)$/, `(${baseErrorArg})`)
      : format
    : undefined
  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength
  const actions = [
    formatAction,
    schema.pattern
      ? `v.regex(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/${patternErrorPart})`
      : undefined,
    isFixedLength ? `v.length(${schema.minLength}${sizeErrorPart})` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `v.minLength(${schema.minLength}${minErrorPart})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `v.maxLength(${schema.maxLength}${maxErrorPart})`
      : undefined,
  ].filter((v) => v !== undefined)
  if (actions.length > 0) return `v.pipe(v.string(${baseErrorArg}),${actions.join(',')})`
  return errorMessage ? `v.string(${baseErrorArg})` : 'v.string()'
}
