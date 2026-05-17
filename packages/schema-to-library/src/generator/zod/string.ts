import type { JSONSchema } from '../../parser/index.js'
import { zodBaseError, zodError } from '../../utils/index.js'

const FORMAT_STRING: { readonly [k: string]: string } = {
  email: 'email()',
  uuid: 'uuid()',
  uuidv4: 'uuidv4()',
  uuidv6: 'uuidv6()',
  uuidv7: 'uuidv7()',
  uri: 'url()',
  emoji: 'emoji()',
  base64: 'base64()',
  base64url: 'base64url()',
  nanoid: 'nanoid()',
  cuid: 'cuid()',
  cuid2: 'cuid2()',
  ulid: 'ulid()',
  ipv4: 'ipv4()',
  ipv6: 'ipv6()',
  cidrv4: 'cidrv4()',
  cidrv6: 'cidrv6()',
  date: 'iso.date()',
  time: 'iso.time()',
  'date-time': 'iso.datetime()',
  duration: 'iso.duration()',
  binary: 'file()',
  toLowerCase: 'toLowerCase()',
  toUpperCase: 'toUpperCase()',
  trim: 'trim()',
  jwt: 'jwt()',
}

export function string(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const baseErrorArg = zodBaseError(errorMessage, requiredMessage)
  const patternMessage = schema['x-pattern-message']
  const patternErrorPart = patternMessage ? `,${zodError(patternMessage)}` : ''
  const lengthMessage = schema['x-length-message'] ?? schema['x-size-message']
  const lengthErrorPart = lengthMessage ? `,${zodError(lengthMessage)}` : ''
  // v3.0: string length uses x-minLength-message / x-maxLength-message
  // (split from the previous shared x-minimum-message / x-maximum-message
  // numeric-only slots).
  const minLengthMessage = schema['x-minLength-message']
  const minErrorPart = minLengthMessage ? `,${zodError(minLengthMessage)}` : ''
  const maxLengthMessage = schema['x-maxLength-message']
  const maxErrorPart = maxLengthMessage ? `,${zodError(maxLengthMessage)}` : ''
  const format = schema.format && FORMAT_STRING[schema.format]
  const base = format
    ? `z.${format.replace(/\(\)$/, `(${baseErrorArg})`)}`
    : `z.string(${baseErrorArg})`
  const pattern = schema.pattern
    ? `.regex(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/${patternErrorPart})`
    : undefined
  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength
  return [
    base,
    pattern,
    isFixedLength ? `.length(${schema.minLength}${lengthErrorPart})` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `.min(${schema.minLength}${minErrorPart})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `.max(${schema.maxLength}${maxErrorPart})`
      : undefined,
  ]
    .filter((v) => v !== undefined)
    .join('')
}
