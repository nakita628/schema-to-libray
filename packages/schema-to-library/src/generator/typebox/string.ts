import type { JSONSchema } from '../../types/index.js'

const FORMAT_MAP: { readonly [k: string]: string } = {
  email: 'email',
  uuid: 'uuid',
  uri: 'uri',
  ipv4: 'ipv4',
  ipv6: 'ipv6',
  'date-time': 'date-time',
  date: 'date',
  time: 'time',
}

export function string(schema: JSONSchema): string {
  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  const opts = [
    schema.format && FORMAT_MAP[schema.format]
      ? `format:${JSON.stringify(FORMAT_MAP[schema.format])}`
      : undefined,
    schema.pattern
      ? `pattern:${JSON.stringify(schema.pattern)}`
      : undefined,
    isFixedLength ? `minLength:${schema.minLength}` : undefined,
    isFixedLength ? `maxLength:${schema.maxLength}` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `minLength:${schema.minLength}`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `maxLength:${schema.maxLength}`
      : undefined,
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.String({${opts.join(',')}})`
  }
  return 'Type.String()'
}
