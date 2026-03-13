import type { JSONSchema } from '../../types/index.js'

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
  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  const lengthActions = [
    schema.pattern ? `Schema.pattern(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/)` : undefined,
    isFixedLength ? `Schema.length(${schema.minLength})` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `Schema.minLength(${schema.minLength})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `Schema.maxLength(${schema.maxLength})`
      : undefined,
  ].filter((v) => v !== undefined)

  // Check for format that maps to a standalone schema
  if (schema.format && FORMAT_MAP[schema.format]) {
    const base = FORMAT_MAP[schema.format]
    if (lengthActions.length > 0) return `${base}.pipe(${lengthActions.join(',')})`
    return base
  }

  const format = schema.format && FORMAT_PIPE[schema.format]
  const actions = [format, ...lengthActions].filter((v) => v !== undefined)

  if (actions.length > 0) {
    return `Schema.String.pipe(${actions.join(',')})`
  }
  return 'Schema.String'
}
