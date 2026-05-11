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
  // v3.0: TypeBox uses ajv-errors–compatible `errorMessage` annotation —
  // a single object whose keys are JSON-Schema keyword names (or `_` for
  // generic fallback). Aggregate all relevant x-*-message extensions.
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const patternMessage = schema['x-pattern-message']
  const sizeMessage = schema['x-size-message']
  const minLengthMessage = schema['x-minLength-message']
  const maxLengthMessage = schema['x-maxLength-message']
  const errMsgEntries: string[] = []
  if (errorMessage) errMsgEntries.push(`type:${JSON.stringify(errorMessage)}`)
  if (requiredMessage) errMsgEntries.push(`required:${JSON.stringify(requiredMessage)}`)
  if (patternMessage) errMsgEntries.push(`pattern:${JSON.stringify(patternMessage)}`)
  if (minLengthMessage) errMsgEntries.push(`minLength:${JSON.stringify(minLengthMessage)}`)
  if (maxLengthMessage) errMsgEntries.push(`maxLength:${JSON.stringify(maxLengthMessage)}`)
  if (sizeMessage) {
    // exact length → both minLength and maxLength constraints
    errMsgEntries.push(`minLength:${JSON.stringify(sizeMessage)}`)
    errMsgEntries.push(`maxLength:${JSON.stringify(sizeMessage)}`)
  }
  const errMsg =
    errMsgEntries.length > 0 ? `errorMessage:{${errMsgEntries.join(',')}}` : undefined

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
