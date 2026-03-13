import type { JSONSchema } from '../../types/index.js'

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

  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  const actions = [
    format,
    schema.pattern ? `v.regex(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/)` : undefined,
    isFixedLength ? `v.length(${schema.minLength})` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `v.minLength(${schema.minLength})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `v.maxLength(${schema.maxLength})`
      : undefined,
  ].filter((v) => v !== undefined)

  if (actions.length > 0) {
    return `v.pipe(v.string(),${actions.join(',')})`
  }
  return 'v.string()'
}
