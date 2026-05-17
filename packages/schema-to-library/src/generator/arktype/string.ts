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
  const errorMessage = schema['x-error-message'] ?? schema['x-required-message']
  const describe = errorMessage ? `.describe(${JSON.stringify(errorMessage)})` : ''
  const lengthMessage = schema['x-minLength-message'] ?? schema['x-maxLength-message']
  const minLengthMessage = schema['x-minLength-message']
  const maxLengthMessage = schema['x-maxLength-message']
  const patternMessage = schema['x-pattern-message']

  const format = schema.format && FORMAT_MAP[schema.format]
  const base = format ? `"${format}"` : '"string"'

  const behaviorChain = (() => {
    const chains: string[] = []
    if (schema['x-trim'] === true) chains.push('.pipe((val: string) => val.trim())')
    if (schema['x-toLowerCase'] === true) chains.push('.pipe((val: string) => val.toLowerCase())')
    if (schema['x-toUpperCase'] === true) chains.push('.pipe((val: string) => val.toUpperCase())')
    if (typeof schema['x-normalize'] === 'string') {
      chains.push(
        `.pipe((val: string) => val.normalize(${JSON.stringify(schema['x-normalize'])}))`,
      )
    }
    if (typeof schema['x-startsWith'] === 'string') {
      const prefix = schema['x-startsWith']
      chains.push(
        `.narrow((val: string, ctx) => val.startsWith(${JSON.stringify(prefix)}) || ctx.mustBe(${JSON.stringify(`must start with ${JSON.stringify(prefix)}`)}))`,
      )
    }
    if (typeof schema['x-endsWith'] === 'string') {
      const suffix = schema['x-endsWith']
      chains.push(
        `.narrow((val: string, ctx) => val.endsWith(${JSON.stringify(suffix)}) || ctx.mustBe(${JSON.stringify(`must end with ${JSON.stringify(suffix)}`)}))`,
      )
    }
    if (typeof schema['x-includes'] === 'string') {
      const sub = schema['x-includes']
      chains.push(
        `.narrow((val: string, ctx) => val.includes(${JSON.stringify(sub)}) || ctx.mustBe(${JSON.stringify(`must include ${JSON.stringify(sub)}`)}))`,
      )
    }
    return chains.join('')
  })()

  const finalize = (expr: string) => {
    if (behaviorChain && expr.startsWith('"')) {
      return `type(${expr})${behaviorChain}${describe}`
    }
    return `${expr}${behaviorChain}${describe}`
  }

  if (schema.pattern) {
    if (patternMessage) {
      return finalize(
        `type(${base}).narrow((s, ctx) => new RegExp(${JSON.stringify(schema.pattern)}).test(s) || ctx.mustBe(${JSON.stringify(patternMessage)}))`,
      )
    }
    return finalize(`type(${base}).and(/${schema.pattern}/)`)
  }

  const isFixedLength =
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength === schema.maxLength

  if (isFixedLength) {
    if (lengthMessage) {
      return finalize(
        `type(${base}).narrow((s, ctx) => s.length === ${schema.minLength} || ctx.mustBe(${JSON.stringify(lengthMessage)}))`,
      )
    }
    return finalize(`type("string == ${schema.minLength}")`)
  }

  const hasMin = schema.minLength !== undefined
  const hasMax = schema.maxLength !== undefined

  if (hasMin || hasMax) {
    if (minLengthMessage || maxLengthMessage) {
      const narrows: string[] = []
      if (hasMin) {
        const minMsg =
          minLengthMessage ?? errorMessage ?? `must be at least ${schema.minLength} chars`
        narrows.push(
          `.narrow((s, ctx) => s.length >= ${schema.minLength} || ctx.mustBe(${JSON.stringify(minMsg)}))`,
        )
      }
      if (hasMax) {
        const maxMsg =
          maxLengthMessage ?? errorMessage ?? `must be at most ${schema.maxLength} chars`
        narrows.push(
          `.narrow((s, ctx) => s.length <= ${schema.maxLength} || ctx.mustBe(${JSON.stringify(maxMsg)}))`,
        )
      }
      return finalize(`type(${base})${narrows.join('')}`)
    }
    if (hasMin && hasMax) {
      return finalize(`type("${schema.minLength} <= string <= ${schema.maxLength}")`)
    }
    if (hasMin) {
      return finalize(`type("string >= ${schema.minLength}")`)
    }
    return finalize(`type("string <= ${schema.maxLength}")`)
  }

  if (errorMessage || behaviorChain) {
    return finalize(format ? `type(${base})` : `type("string")`)
  }

  if (format) return base
  return '"string"'
}
