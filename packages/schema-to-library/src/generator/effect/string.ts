import type { JSONSchema } from '../../parser/index.js'
import { effectError } from '../../utils/index.js'

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

export function string(schema: JSONSchema) {
  // v3.0: x-required-message falls back to base annotation when no
  // x-error-message; Effect Schema has no native required dispatch.
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const patternMessage = schema['x-pattern-message']
  const patternErrorPart = patternMessage ? `,${effectError(patternMessage)}` : ''
  const lengthMessage = schema['x-minLength-message'] ?? schema['x-maxLength-message']
  const lengthErrorPart = lengthMessage ? `,${effectError(lengthMessage)}` : ''
  const minimumMessage = schema['x-minLength-message']
  const minErrorPart = minimumMessage ? `,${effectError(minimumMessage)}` : ''
  const maximumMessage = schema['x-maxLength-message']
  const maxErrorPart = maximumMessage ? `,${effectError(maximumMessage)}` : ''
  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength
  const startsWith =
    typeof schema['x-startsWith'] === 'string'
      ? `Schema.startsWith(${JSON.stringify(schema['x-startsWith'])})`
      : undefined
  const endsWith =
    typeof schema['x-endsWith'] === 'string'
      ? `Schema.endsWith(${JSON.stringify(schema['x-endsWith'])})`
      : undefined
  const includes =
    typeof schema['x-includes'] === 'string'
      ? `Schema.includes(${JSON.stringify(schema['x-includes'])})`
      : undefined
  const lengthActions = [
    startsWith,
    endsWith,
    includes,
    schema.pattern
      ? `Schema.pattern(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/${patternErrorPart})`
      : undefined,
    isFixedLength ? `Schema.length(${schema.minLength}${lengthErrorPart})` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `Schema.minLength(${schema.minLength}${minErrorPart})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `Schema.maxLength(${schema.maxLength}${maxErrorPart})`
      : undefined,
  ].filter((v) => v !== undefined)
  const stringBase =
    schema['x-trim'] === true
      ? 'Schema.Trim'
      : schema['x-toLowerCase'] === true
        ? 'Schema.Lowercase'
        : schema['x-toUpperCase'] === true
          ? 'Schema.Uppercase'
          : 'Schema.String'
  if (schema.format && FORMAT_MAP[schema.format]) {
    const base = FORMAT_MAP[schema.format]
    if (lengthActions.length > 0) {
      const result = `${base}.pipe(${lengthActions.join(',')})`
      return errorMessage ? `${result}.annotations(${effectError(errorMessage)})` : result
    }
    return errorMessage ? `${base}.annotations(${effectError(errorMessage)})` : base
  }
  const format = schema.format && FORMAT_PIPE[schema.format]
  const formatAction = format
    ? patternMessage
      ? format.replace(/\)$/, `,${effectError(patternMessage)})`)
      : format
    : undefined
  const actions = [formatAction, ...lengthActions].filter((v) => v !== undefined)
  if (actions.length > 0) {
    const result = `${stringBase}.pipe(${actions.join(',')})`
    return errorMessage ? `${result}.annotations(${effectError(errorMessage)})` : result
  }
  return errorMessage ? `${stringBase}.annotations(${effectError(errorMessage)})` : stringBase
}
