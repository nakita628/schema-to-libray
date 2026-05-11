import type { JSONSchema } from '../../parser/index.js'

const FORMAT_MAP: { readonly [k: string]: string } = {
  email: 'string.email',
  uuid: 'string.uuid',
  url: 'string.url',
  uri: 'string.url',
  ipv4: 'string.ip',
  ipv6: 'string.ip',
  date: 'string.date',
  'date-time': 'string.date.iso',
}

export function string(schema: JSONSchema) {
  // v3.0: arktype consumes type/required/pattern/length messages via
  // `.describe()` (single annotation per type) or `.narrow()` (per-keyword).
  // When a per-keyword message is present, we switch to narrow form for
  // that constraint; the others continue to use DSL.
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''
  const sizeMessage = schema['x-size-message']
  const minLengthMessage = schema['x-minLength-message']
  const maxLengthMessage = schema['x-maxLength-message']
  const patternMessage = schema['x-pattern-message']

  const format = schema.format && FORMAT_MAP[schema.format]
  const base = format ? `"${format}"` : '"string"'

  if (schema.pattern) {
    if (patternMessage) {
      return `type(${base}).narrow((s, ctx) => new RegExp(${JSON.stringify(schema.pattern)}).test(s) || ctx.mustBe(${JSON.stringify(patternMessage)}))${describe}`
    }
    return `type(${base}).and(/${schema.pattern}/)${describe}`
  }

  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  if (isFixedLength) {
    if (sizeMessage) {
      return `type(${base}).narrow((s, ctx) => s.length === ${schema.minLength} || ctx.mustBe(${JSON.stringify(sizeMessage)}))${describe}`
    }
    return `type("string == ${schema.minLength}")${describe}`
  }

  const hasMin = schema.minLength !== undefined
  const hasMax = schema.maxLength !== undefined

  if (hasMin || hasMax) {
    if (minLengthMessage || maxLengthMessage) {
      const narrows: string[] = []
      if (hasMin) {
        const minMsg = minLengthMessage ?? errorMessage ?? `must be at least ${schema.minLength} chars`
        narrows.push(
          `.narrow((s, ctx) => s.length >= ${schema.minLength} || ctx.mustBe(${JSON.stringify(minMsg)}))`,
        )
      }
      if (hasMax) {
        const maxMsg = maxLengthMessage ?? errorMessage ?? `must be at most ${schema.maxLength} chars`
        narrows.push(
          `.narrow((s, ctx) => s.length <= ${schema.maxLength} || ctx.mustBe(${JSON.stringify(maxMsg)}))`,
        )
      }
      return `type(${base})${narrows.join('')}${describe}`
    }
    if (hasMin && hasMax) {
      return `type("${schema.minLength} <= string <= ${schema.maxLength}")${describe}`
    }
    if (hasMin) {
      return `type("string >= ${schema.minLength}")${describe}`
    }
    return `type("string <= ${schema.maxLength}")${describe}`
  }

  if (errorMessage) {
    return format ? `type(${base})${describe}` : `type("string")${describe}`
  }

  if (format) return base
  return '"string"'
}
