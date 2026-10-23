import type { JSONSchema } from '../parser/index.js'
import { normalizeTypes } from '../utils/index.js'

/** The `not` predicate bodies by `type`, over a value bound to `param`. */
function notTypeBody(type: string, param: string): string | undefined {
  switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
      return `typeof ${param} !== '${type}'`
    case 'integer':
      return `typeof ${param} !== 'number' || !Number.isInteger(${param})`
    case 'array':
      return `!Array.isArray(${param})`
    case 'object':
      return `typeof ${param} !== 'object' || ${param} === null || Array.isArray(${param})`
    case 'null':
      return `${param} !== null`
    default:
      return undefined
  }
}

/**
 * The predicate refusing what a `not` schema describes, as the source of an arrow over
 * `param` (declared as `parameter`, which may carry a type annotation): a `const` is
 * refused by value, a `type` by its runtime check, a list of types by every check at
 * once. `undefined` for a `not` these shared cases do not cover — an `enum` or a
 * combinator, which each generator spells with its own parser.
 */
export function notPredicate(
  inner: JSONSchema,
  param: string,
  parameter: string = param,
): string | undefined {
  if ('const' in inner) return `(${parameter}) => ${param} !== ${JSON.stringify(inner.const)}`
  if (typeof inner.type === 'string') {
    const body = notTypeBody(inner.type, param)
    return body === undefined ? undefined : `(${parameter}) => ${body}`
  }
  if (Array.isArray(inner.type)) {
    const bodies = normalizeTypes(inner.type)
      .map((t) => notTypeBody(t, param))
      .filter((body) => body !== undefined)
      .map((body) => `(${body})`)
    if (bodies.length > 0) return `(${parameter}) => ${bodies.join(' && ')}`
  }
  return undefined
}
