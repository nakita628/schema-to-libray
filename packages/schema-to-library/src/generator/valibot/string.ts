import type { JSONSchema } from '../../types/index.js'
import { valibotMessage } from '../../utils/index.js'

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

export function string(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message'] as string | undefined
  const format = schema.format && FORMAT_PIPE[schema.format]

  const baseMsgPart = errorMessage ? valibotMessage(errorMessage) : ''

  const formatWithMsg = (() => {
    if (!format) return undefined
    if (!errorMessage) return format
    return format.replace(/\(\)$/, `(${baseMsgPart})`)
  })()

  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  const patternMessage = schema['x-pattern-message'] as string | undefined
  const sizeMessage = schema['x-size-message'] as string | undefined
  const minimumMessage = schema['x-minimum-message'] as string | undefined
  const maximumMessage = schema['x-maximum-message'] as string | undefined

  const actions = [
    formatWithMsg ?? format,
    schema.pattern
      ? `v.regex(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/${patternMessage ? `,${valibotMessage(patternMessage)}` : ''})`
      : undefined,
    isFixedLength
      ? `v.length(${schema.minLength}${sizeMessage ? `,${valibotMessage(sizeMessage)}` : ''})`
      : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `v.minLength(${schema.minLength}${minimumMessage ? `,${valibotMessage(minimumMessage)}` : ''})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `v.maxLength(${schema.maxLength}${maximumMessage ? `,${valibotMessage(maximumMessage)}` : ''})`
      : undefined,
  ].filter((v) => v !== undefined)

  if (actions.length > 0) {
    return `v.pipe(v.string(${baseMsgPart}),${actions.join(',')})`
  }
  return errorMessage ? `v.string(${baseMsgPart})` : 'v.string()'
}
