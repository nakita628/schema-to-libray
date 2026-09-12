import { regexLiteral } from '../../helper/regex.js'
import type { JSONSchema } from '../../parser/index.js'
import { valibotError } from '../../utils/index.js'

/** Put `message` in the last argument slot of a Valibot action call. */
function withValibotMessage(action: string, message: string): string {
  if (action.endsWith('()')) return `${action.slice(0, -2)}(${message})`
  return `${action.slice(0, -1)},${message})`
}

const FORMAT_PIPE: { readonly [k: string]: string } = {
  email: 'v.email()',
  uuid: 'v.uuid()',
  uri: 'v.url()',
  ipv4: 'v.ipv4()',
  ipv6: 'v.ipv6()',
  emoji: 'v.emoji()',
  base64: 'v.base64()',
  'date-time': 'v.isoTimestamp()',
  date: 'v.isoDate()',
  // RFC 3339 full-time: seconds, optional fraction, Z or numeric offset.
  // Valibot has no action for that shape — `v.isoTime()` is `hh:mm` only.
  time: `v.regex(${regexLiteral('^(?:0\\d|1\\d|2[0-3])(?::[0-5]\\d){2}(?:\\.\\d{1,9})?(?:Z| ?[+-](?:0\\d|1\\d|2[0-3])(?::?[0-5]\\d)?)$')})`,
}

export function string(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  // v3.0: x-required-message — for valibot, the base v.string(msg) covers both
  // type mismatch and missing-input semantics (v.optional handles undefined).
  // When only x-required-message is set, use it as the base error.
  const requiredMessage = schema['x-required-message']
  const baseErrorArg = errorMessage
    ? valibotError(errorMessage)
    : requiredMessage
      ? valibotError(requiredMessage)
      : ''
  const patternMessage = schema['x-pattern-message']
  const patternErrorPart = patternMessage ? `,${valibotError(patternMessage)}` : ''
  const lengthMessage = schema['x-minLength-message'] ?? schema['x-maxLength-message']
  const lengthErrorPart = lengthMessage ? `,${valibotError(lengthMessage)}` : ''
  const minimumMessage = schema['x-minLength-message']
  const minErrorPart = minimumMessage ? `,${valibotError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maxLength-message']
  const maxErrorPart = maximumMessage ? `,${valibotError(maximumMessage)}` : ''
  const format = schema.format && FORMAT_PIPE[schema.format]
  const formatAction = format
    ? errorMessage
      ? withValibotMessage(format, baseErrorArg)
      : format
    : undefined
  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength
  const trim = schema['x-trim'] === true ? 'v.trim()' : undefined
  const toLowerCase = schema['x-toLowerCase'] === true ? 'v.toLowerCase()' : undefined
  const toUpperCase = schema['x-toUpperCase'] === true ? 'v.toUpperCase()' : undefined
  const normalize =
    typeof schema['x-normalize'] === 'string'
      ? `v.normalize(${JSON.stringify(schema['x-normalize'])})`
      : undefined
  const startsWith =
    typeof schema['x-startsWith'] === 'string'
      ? `v.startsWith(${JSON.stringify(schema['x-startsWith'])})`
      : undefined
  const endsWith =
    typeof schema['x-endsWith'] === 'string'
      ? `v.endsWith(${JSON.stringify(schema['x-endsWith'])})`
      : undefined
  const includes =
    typeof schema['x-includes'] === 'string'
      ? `v.includes(${JSON.stringify(schema['x-includes'])})`
      : undefined
  const actions = [
    trim,
    toLowerCase,
    toUpperCase,
    normalize,
    startsWith,
    endsWith,
    includes,
    formatAction,
    schema.pattern ? `v.regex(${regexLiteral(schema.pattern)}${patternErrorPart})` : undefined,
    isFixedLength ? `v.length(${schema.minLength}${lengthErrorPart})` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `v.minLength(${schema.minLength}${minErrorPart})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `v.maxLength(${schema.maxLength}${maxErrorPart})`
      : undefined,
  ].filter((v) => v !== undefined)
  if (actions.length > 0) return `v.pipe(v.string(${baseErrorArg}),${actions.join(',')})`
  return errorMessage ? `v.string(${baseErrorArg})` : 'v.string()'
}
