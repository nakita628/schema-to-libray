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
  const minLengthMessage = schema['x-minLength-message']
  const minErrorPart = minLengthMessage ? `,${zodError(minLengthMessage)}` : ''
  const maxLengthMessage = schema['x-maxLength-message']
  const maxErrorPart = maxLengthMessage ? `,${zodError(maxLengthMessage)}` : ''
  const fixedLengthMessage = minLengthMessage ?? maxLengthMessage
  const fixedLengthErrorPart = fixedLengthMessage ? `,${zodError(fixedLengthMessage)}` : ''
  const format = schema.format && FORMAT_STRING[schema.format]
  const coercePrefix = schema['x-coerce'] === true && !format ? 'coerce.' : ''
  const base = format
    ? `z.${format.replace(/\(\)$/, `(${baseErrorArg})`)}`
    : `z.${coercePrefix}string(${baseErrorArg})`
  const pattern = schema.pattern
    ? `.regex(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/${patternErrorPart})`
    : undefined
  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength
  const trim = schema['x-trim'] === true ? '.trim()' : undefined
  const toLowerCase = schema['x-toLowerCase'] === true ? '.toLowerCase()' : undefined
  const toUpperCase = schema['x-toUpperCase'] === true ? '.toUpperCase()' : undefined
  const normalize =
    typeof schema['x-normalize'] === 'string'
      ? `.normalize(${JSON.stringify(schema['x-normalize'])})`
      : undefined
  const startsWith =
    typeof schema['x-startsWith'] === 'string'
      ? `.startsWith(${JSON.stringify(schema['x-startsWith'])})`
      : undefined
  const endsWith =
    typeof schema['x-endsWith'] === 'string'
      ? `.endsWith(${JSON.stringify(schema['x-endsWith'])})`
      : undefined
  const includes =
    typeof schema['x-includes'] === 'string'
      ? `.includes(${JSON.stringify(schema['x-includes'])})`
      : undefined
  return [
    base,
    trim,
    toLowerCase,
    toUpperCase,
    normalize,
    startsWith,
    endsWith,
    includes,
    pattern,
    isFixedLength ? `.length(${schema.minLength}${fixedLengthErrorPart})` : undefined,
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
