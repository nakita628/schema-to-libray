import type { JSONSchema } from '../types/index.js'

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
  const format = schema.format && FORMAT_PIPE[schema.format]

  const actions: string[] = []

  if (format) actions.push(format)

  if (schema.pattern) {
    actions.push(`v.regex(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/)`)
  }

  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  if (isFixedLength) {
    actions.push(`v.length(${schema.minLength})`)
  } else {
    if (schema.minLength !== undefined) actions.push(`v.minLength(${schema.minLength})`)
    if (schema.maxLength !== undefined) actions.push(`v.maxLength(${schema.maxLength})`)
  }

  if (actions.length > 0) {
    return `v.pipe(v.string(),${actions.join(',')})`
  }
  return 'v.string()'
}
