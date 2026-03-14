import type { JSONSchema } from '../../helper/index.js'

const FORMAT_MAP: { readonly [k: string]: string } = {
  email: 'string.email',
  uuid: 'string.uuid',
  url: 'string.url',
  uri: 'string.url',
  ipv4: 'string.ip',
  ipv6: 'string.ip',
  date: 'string.date',
  'date-time': 'string.date.iso',
}

export function string(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''

  const format = schema.format && FORMAT_MAP[schema.format]
  const base = format ? `"${format}"` : '"string"'

  if (schema.pattern) {
    return `type(${base}).and(/${schema.pattern}/)${describe}`
  }

  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  if (isFixedLength) {
    return `type("string == ${schema.minLength}")${describe}`
  }

  const hasMin = schema.minLength !== undefined
  const hasMax = schema.maxLength !== undefined

  if (hasMin && hasMax) {
    return `type("${schema.minLength} <= string <= ${schema.maxLength}")${describe}`
  }
  if (hasMin) {
    return `type("string >= ${schema.minLength}")${describe}`
  }
  if (hasMax) {
    return `type("string <= ${schema.maxLength}")${describe}`
  }

  if (errorMessage) {
    return format ? `type(${base})${describe}` : `type("string")${describe}`
  }

  if (format) return base
  return '"string"'
}
