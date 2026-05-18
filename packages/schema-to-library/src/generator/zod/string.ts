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

const EMAIL_PATTERN_MAP: { readonly [k: string]: string } = {
  html5: 'z.regexes.html5Email',
  browser: 'z.regexes.browserEmail',
  unicode: 'z.regexes.unicodeEmail',
}

function escapeRegexLiteral(pattern: string) {
  return pattern.replace(/(?<!\\)\//g, '\\/')
}

function buildFormatOptions(schema: JSONSchema): readonly string[] {
  const format = schema.format
  const parts: string[] = []
  if (format === 'email') {
    const emailPattern = schema['x-emailPattern']
    const emailRegex = schema['x-emailRegex']
    if (typeof emailPattern === 'string' && EMAIL_PATTERN_MAP[emailPattern] !== undefined) {
      parts.push(`pattern:${EMAIL_PATTERN_MAP[emailPattern]}`)
    } else if (typeof emailRegex === 'string') {
      parts.push(`pattern:/${escapeRegexLiteral(emailRegex)}/`)
    }
    return parts
  }
  if (format === 'uuid') {
    const uuidVersion = schema['x-uuidVersion']
    if (typeof uuidVersion === 'string') parts.push(`version:${JSON.stringify(uuidVersion)}`)
    return parts
  }
  if (format === 'uri') {
    const urlProtocol = schema['x-urlProtocol']
    if (typeof urlProtocol === 'string') parts.push(`protocol:/${escapeRegexLiteral(urlProtocol)}/`)
    const urlHostname = schema['x-urlHostname']
    if (typeof urlHostname === 'string') parts.push(`hostname:/${escapeRegexLiteral(urlHostname)}/`)
    if (schema['x-urlNormalize'] === true) parts.push('normalize:true')
    else if (schema['x-urlNormalize'] === false) parts.push('normalize:false')
    return parts
  }
  if (format === 'date-time') {
    const precision = schema['x-isoPrecision']
    if (typeof precision === 'number') parts.push(`precision:${precision}`)
    const offset = schema['x-isoOffset']
    if (typeof offset === 'boolean') parts.push(`offset:${offset}`)
    const local = schema['x-isoLocal']
    if (typeof local === 'boolean') parts.push(`local:${local}`)
    return parts
  }
  if (format === 'jwt') {
    const alg = schema['x-jwtAlg']
    if (typeof alg === 'string') parts.push(`alg:${JSON.stringify(alg)}`)
    return parts
  }
  return parts
}

function mergeOptions(formatOptions: readonly string[], baseErrorArg: string): string {
  if (formatOptions.length === 0) return baseErrorArg
  const errorPart = baseErrorArg ? baseErrorArg.slice(1, -1) : ''
  const allParts = errorPart ? [...formatOptions, errorPart] : [...formatOptions]
  return `{${allParts.join(',')}}`
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
  const formatOptions = format ? buildFormatOptions(schema) : []
  const baseCallArg = format ? mergeOptions(formatOptions, baseErrorArg) : baseErrorArg
  const base = format
    ? `z.${format.replace(/\(\)$/, `(${baseCallArg})`)}`
    : `z.${coercePrefix}string(${baseCallArg})`
  const pattern = schema.pattern
    ? `.regex(/${escapeRegexLiteral(schema.pattern)}/${patternErrorPart})`
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
