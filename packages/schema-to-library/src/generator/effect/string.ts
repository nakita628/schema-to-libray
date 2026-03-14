import type { JSONSchema } from '../../helper/index.js'
import { effectMessage } from '../../utils/index.js'

const FORMAT_MAP: { readonly [k: string]: string } = {
  uuid: 'Schema.UUID',
  ulid: 'Schema.ULID',
}

const FORMAT_PIPE: { readonly [k: string]: string } = {
  email: 'Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/)',
  uri: 'Schema.pattern(/^https?:\\/\\//)',
  ipv4: 'Schema.pattern(/^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$/)',
  ipv6: 'Schema.pattern(/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/)',
  'date-time': 'Schema.pattern(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/)',
  date: 'Schema.pattern(/^\\d{4}-\\d{2}-\\d{2}$/)',
  time: 'Schema.pattern(/^\\d{2}:\\d{2}:\\d{2}/)',
}

export function string(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message']
  const patternMessage = schema['x-pattern-message']
  const sizeMessage = schema['x-size-message']
  const minimumMessage = schema['x-minimum-message']
  const maximumMessage = schema['x-maximum-message']

  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  const lengthActions = [
    schema.pattern
      ? `Schema.pattern(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/${patternMessage ? `,${effectMessage(patternMessage)}` : ''})`
      : undefined,
    isFixedLength
      ? `Schema.length(${schema.minLength}${sizeMessage ? `,${effectMessage(sizeMessage)}` : ''})`
      : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `Schema.minLength(${schema.minLength}${minimumMessage ? `,${effectMessage(minimumMessage)}` : ''})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `Schema.maxLength(${schema.maxLength}${maximumMessage ? `,${effectMessage(maximumMessage)}` : ''})`
      : undefined,
  ].filter((v) => v !== undefined)

  // Check for format that maps to a standalone schema
  if (schema.format && FORMAT_MAP[schema.format]) {
    const base = FORMAT_MAP[schema.format]
    if (lengthActions.length > 0) {
      const result = `${base}.pipe(${lengthActions.join(',')})`
      return errorMessage ? `${result}.annotations(${effectMessage(errorMessage)})` : result
    }
    return errorMessage ? `${base}.annotations(${effectMessage(errorMessage)})` : base
  }

  const format = schema.format && FORMAT_PIPE[schema.format]
  const formatWithMsg = (() => {
    if (!format) return undefined
    if (!patternMessage) return format
    return format.replace(/\)$/, `,${effectMessage(patternMessage)})`)
  })()

  const actions = [formatWithMsg ?? format, ...lengthActions].filter((v) => v !== undefined)

  if (actions.length > 0) {
    const result = `Schema.String.pipe(${actions.join(',')})`
    return errorMessage ? `${result}.annotations(${effectMessage(errorMessage)})` : result
  }
  return errorMessage
    ? `Schema.String.annotations(${effectMessage(errorMessage)})`
    : 'Schema.String'
}
