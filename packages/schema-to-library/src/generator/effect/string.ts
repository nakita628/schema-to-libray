import { regexLiteral } from '../../helper/regex.js'
import type { JSONSchema } from '../../parser/index.js'
import { effectError } from '../../utils/index.js'

/**
 * Formats whose Effect Schema v4 equivalent is a check on `Schema.String`.
 * v3 shipped `Schema.UUID` / `Schema.ULID` schemas; v4 expresses both as
 * filters instead.
 */
const FORMAT_CHECK: { readonly [k: string]: string } = {
  uuid: 'Schema.isUUID()',
  ulid: 'Schema.isULID()',
}

const FORMAT_PATTERN: { readonly [k: string]: string } = {
  email: 'Schema.isPattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/)',
  uri: 'Schema.isPattern(/^https?:\\/\\//)',
  ipv4: 'Schema.isPattern(/^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$/)',
  ipv6: 'Schema.isPattern(/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/)',
  'date-time': 'Schema.isPattern(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/)',
  date: 'Schema.isPattern(/^\\d{4}-\\d{2}-\\d{2}$/)',
  time: 'Schema.isPattern(/^\\d{2}:\\d{2}:\\d{2}/)',
}

/**
 * The base string schema, applying any `x-trim` / `x-toLowerCase` /
 * `x-toUpperCase` normalisation. v4 keeps `Schema.Trim` but replaced the
 * `Schema.Lowercase` / `Schema.Uppercase` schemas with transformations that
 * `Schema.decodeTo` applies to `Schema.String`.
 */
function stringBase(schema: JSONSchema): string {
  if (schema['x-trim'] === true) return 'Schema.Trim'
  if (schema['x-toLowerCase'] === true) {
    return 'Schema.String.pipe(Schema.decodeTo(Schema.String,SchemaTransformation.toLowerCase()))'
  }
  if (schema['x-toUpperCase'] === true) {
    return 'Schema.String.pipe(Schema.decodeTo(Schema.String,SchemaTransformation.toUpperCase()))'
  }
  return 'Schema.String'
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
      ? `Schema.isStartsWith(${JSON.stringify(schema['x-startsWith'])})`
      : undefined
  const endsWith =
    typeof schema['x-endsWith'] === 'string'
      ? `Schema.isEndsWith(${JSON.stringify(schema['x-endsWith'])})`
      : undefined
  const includes =
    typeof schema['x-includes'] === 'string'
      ? `Schema.isIncludes(${JSON.stringify(schema['x-includes'])})`
      : undefined
  const lengthChecks = [
    startsWith,
    endsWith,
    includes,
    schema.pattern
      ? `Schema.isPattern(${regexLiteral(schema.pattern)}${patternErrorPart})`
      : undefined,
    // v4 has no single-length filter; a fixed length is a degenerate range.
    isFixedLength
      ? `Schema.isLengthBetween(${schema.minLength},${schema.minLength}${lengthErrorPart})`
      : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `Schema.isMinLength(${schema.minLength}${minErrorPart})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `Schema.isMaxLength(${schema.maxLength}${maxErrorPart})`
      : undefined,
  ].filter((v) => v !== undefined)
  const annotate = (code: string): string =>
    errorMessage ? `${code}.annotate(${effectError(errorMessage)})` : code

  if (schema.format && FORMAT_CHECK[schema.format]) {
    const checks = [FORMAT_CHECK[schema.format], ...lengthChecks]
    return annotate(`Schema.String.check(${checks.join(',')})`)
  }
  const pattern = schema.format && FORMAT_PATTERN[schema.format]
  const formatCheck = pattern
    ? patternMessage
      ? pattern.replace(/\)$/, `,${effectError(patternMessage)})`)
      : pattern
    : undefined
  const checks = [formatCheck, ...lengthChecks].filter((v) => v !== undefined)
  const base = stringBase(schema)
  return annotate(checks.length > 0 ? `${base}.check(${checks.join(',')})` : base)
}
