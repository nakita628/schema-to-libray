import { typeboxMetaOpts } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

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

export function string(schema: JSONSchema) {
  // ajv-errors `errorMessage` accepts two shapes:
  //   - string  → used as a single message for any validation failure
  //   - object  → per-keyword messages keyed by JSON Schema keyword
  // When only `x-error-message` is set we emit the string form (the
  // common case). Per-keyword messages flip us into object form, with
  // `x-error-message` joining as the catch-all under the ajv-errors `_`
  // convention.
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const patternMessage = schema['x-pattern-message']
  const sizeMessage = schema['x-size-message']
  const minLengthMessage = schema['x-minLength-message']
  const maxLengthMessage = schema['x-maxLength-message']
  const perKeywordEntries: string[] = []
  if (requiredMessage) perKeywordEntries.push(`required:${JSON.stringify(requiredMessage)}`)
  if (patternMessage) perKeywordEntries.push(`pattern:${JSON.stringify(patternMessage)}`)
  if (minLengthMessage) perKeywordEntries.push(`minLength:${JSON.stringify(minLengthMessage)}`)
  if (maxLengthMessage) perKeywordEntries.push(`maxLength:${JSON.stringify(maxLengthMessage)}`)
  if (sizeMessage) {
    // exact length → both minLength and maxLength constraints
    perKeywordEntries.push(`minLength:${JSON.stringify(sizeMessage)}`)
    perKeywordEntries.push(`maxLength:${JSON.stringify(sizeMessage)}`)
  }
  const errMsg =
    perKeywordEntries.length === 0
      ? errorMessage
        ? `errorMessage:${JSON.stringify(errorMessage)}`
        : undefined
      : `errorMessage:{${perKeywordEntries.join(',')}${
          errorMessage ? `,_:${JSON.stringify(errorMessage)}` : ''
        }}`

  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  const opts = [
    schema.format && FORMAT_MAP[schema.format]
      ? `format:${JSON.stringify(FORMAT_MAP[schema.format])}`
      : undefined,
    schema.pattern ? `pattern:${JSON.stringify(schema.pattern)}` : undefined,
    isFixedLength ? `minLength:${schema.minLength}` : undefined,
    isFixedLength ? `maxLength:${schema.maxLength}` : undefined,
    !isFixedLength && schema.minLength !== undefined ? `minLength:${schema.minLength}` : undefined,
    !isFixedLength && schema.maxLength !== undefined ? `maxLength:${schema.maxLength}` : undefined,
    errMsg,
    ...typeboxMetaOpts(schema),
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.String({${opts.join(',')}})`
  }
  return 'Type.String()'
}
