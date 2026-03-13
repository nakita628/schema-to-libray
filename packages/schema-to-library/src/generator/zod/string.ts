import type { JSONSchema } from '../../types/index.js'
import { error } from '../../utils/index.js'

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

/**
 * Generate Zod string schema from JSON Schema
 *
 * @param schema - JSON Schema object with string type
 * @returns Generated Zod string schema code
 * @example
 * ```ts
 * string({ type: 'string', format: 'email' }) // 'z.email()'
 * ```
 */
export function string(schema: JSONSchema): string {
  const errorMessage = schema['x-error-message'] as string | undefined
  const format = schema.format && FORMAT_STRING[schema.format]

  const base = (() => {
    if (!format) return errorMessage ? `z.string(${error(errorMessage)})` : 'z.string()'
    return errorMessage
      ? `z.${format.replace(/\(\)$/, `(${error(errorMessage)})`)}`
      : `z.${format}`
  })()

  const patternMessage = schema['x-pattern-message'] as string | undefined
  const patternMsgPart = patternMessage ? `,${error(patternMessage)}` : ''
  const pattern = schema.pattern
    ? `.regex(/${schema.pattern.replace(/(?<!\\)\//g, '\\/')}/${patternMsgPart})`
    : undefined

  const sizeMessage = schema['x-size-message'] as string | undefined
  const sizeMsgPart = sizeMessage ? `,${error(sizeMessage)}` : ''
  const minimumMessage = schema['x-minimum-message'] as string | undefined
  const minMsgPart = minimumMessage ? `,${error(minimumMessage)}` : ''
  const maximumMessage = schema['x-maximum-message'] as string | undefined
  const maxMsgPart = maximumMessage ? `,${error(maximumMessage)}` : ''

  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  return [
    base,
    pattern,
    isFixedLength ? `.length(${schema.minLength}${sizeMsgPart})` : undefined,
    !isFixedLength && schema.minLength !== undefined
      ? `.min(${schema.minLength}${minMsgPart})`
      : undefined,
    !isFixedLength && schema.maxLength !== undefined
      ? `.max(${schema.maxLength}${maxMsgPart})`
      : undefined,
  ]
    .filter((v) => v !== undefined)
    .join('')
}
