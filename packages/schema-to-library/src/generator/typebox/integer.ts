import { typeboxMetaOpts } from '../../helper/meta.js'
import type { JSONSchema } from '../../parser/index.js'

export function integer(schema: JSONSchema) {
  const errorMessage = schema['x-error-message']
  const requiredMessage = schema['x-required-message']
  const minMessage = schema['x-minimum-message']
  const maxMessage = schema['x-maximum-message']
  const exMinMessage = schema['x-exclusiveMinimum-message']
  const exMaxMessage = schema['x-exclusiveMaximum-message']
  const multipleOfMessage = schema['x-multipleOf-message']
  // ajv-errors `errorMessage` accepts two shapes:
  //   - string  → used as a single message for any validation failure
  //   - object  → per-keyword messages keyed by JSON Schema keyword
  // When only `x-error-message` is set we emit the string form (the
  // common case). Per-keyword messages flip us into object form, with
  // `x-error-message` joining as the catch-all under the ajv-errors `_`
  // convention.
  const perKeywordEntries: string[] = []
  if (requiredMessage) perKeywordEntries.push(`required:${JSON.stringify(requiredMessage)}`)
  if (minMessage) perKeywordEntries.push(`minimum:${JSON.stringify(minMessage)}`)
  if (maxMessage) perKeywordEntries.push(`maximum:${JSON.stringify(maxMessage)}`)
  if (exMinMessage)
    perKeywordEntries.push(`exclusiveMinimum:${JSON.stringify(exMinMessage)}`)
  if (exMaxMessage)
    perKeywordEntries.push(`exclusiveMaximum:${JSON.stringify(exMaxMessage)}`)
  if (multipleOfMessage)
    perKeywordEntries.push(`multipleOf:${JSON.stringify(multipleOfMessage)}`)
  const errMsg =
    perKeywordEntries.length === 0
      ? errorMessage
        ? `errorMessage:${JSON.stringify(errorMessage)}`
        : undefined
      : `errorMessage:{${perKeywordEntries.join(',')}${
          errorMessage ? `,_:${JSON.stringify(errorMessage)}` : ''
        }}`
  const metaOpts = typeboxMetaOpts(schema)

  if (schema.format === 'bigint') {
    const opts = [
      schema.minimum !== undefined ? `minimum:BigInt(${schema.minimum})` : undefined,
      schema.maximum !== undefined ? `maximum:BigInt(${schema.maximum})` : undefined,
      errMsg,
      ...metaOpts,
    ].filter((v) => v !== undefined)

    if (opts.length > 0) return `Type.BigInt({${opts.join(',')}})`
    return 'Type.BigInt()'
  }

  const opts = [
    schema.minimum !== undefined ? `minimum:${schema.minimum}` : undefined,
    typeof schema.exclusiveMinimum === 'number'
      ? `exclusiveMinimum:${schema.exclusiveMinimum}`
      : undefined,
    schema.maximum !== undefined ? `maximum:${schema.maximum}` : undefined,
    typeof schema.exclusiveMaximum === 'number'
      ? `exclusiveMaximum:${schema.exclusiveMaximum}`
      : undefined,
    schema.multipleOf !== undefined ? `multipleOf:${schema.multipleOf}` : undefined,
    errMsg,
    ...metaOpts,
  ].filter((v) => v !== undefined)

  if (opts.length > 0) {
    return `Type.Integer({${opts.join(',')}})`
  }
  return 'Type.Integer()'
}
