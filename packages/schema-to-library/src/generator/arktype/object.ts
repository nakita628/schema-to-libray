import type { JSONSchema } from '../../parser/index.js'
import { makeSafeKey } from '../../utils/index.js'
import { arktype } from './arktype.js'

const isQuoted = (s: string) => s.startsWith('"') && s.endsWith('"')

/** Wrap a raw arktype expression with `type(...)` if it's a bare quoted string. */
const ensureRuntime = (s: string) => (isQuoted(s) ? `type(${s})` : s)

/**
 * Compose a `.narrow(...)` argument with an optional error message.
 * - With message: `(o, ctx) => predicate || ctx.mustBe("msg")`
 * - Without message: `(o) => predicate`
 */
const narrowPredicate = (predicate: string, message?: string): string =>
  message
    ? `(o, ctx) => ${predicate} || ctx.mustBe(${JSON.stringify(message)})`
    : `(o) => ${predicate}`

/**
 * Generate an Arktype object schema for a JSON Schema object node.
 *
 * Combinators (oneOf/anyOf/allOf/not) delegate to the main `arktype` entry.
 * JSON Schema 2020-12 keywords (`minProperties`, `maxProperties`,
 * `propertyNames`, `patternProperties`, `dependentRequired`) are emitted as
 * `.narrow(...)` chains. When narrows are applied, the result is always in
 * wrapped form (`type({...}).narrow(...)`) regardless of `isArktype`.
 */
export function object(
  schema: JSONSchema,
  rootName: string,
  isArktype: boolean,
  options?: { openapi?: boolean; readonly?: boolean },
) {
  if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) {
    return arktype(schema, rootName, isArktype, options)
  }

  const errorMessage = schema['x-error-message']
  const minimumMessage = schema['x-minProperties-message']
  const maximumMessage = schema['x-maxProperties-message']
  // v3.0: dedicated x-patternProperties-message (split from x-pattern-message)
  const patternPropsMessage = schema['x-patternProperties-message']
  const propNamesMessage = schema['x-propertyNames-message']
  const depReqMessage = schema['x-dependentRequired-message'] ?? errorMessage
  const depSchMessage = schema['x-dependentSchemas-message'] ?? errorMessage
  const addlPropsMessage = schema['x-additionalProperties-message']

  const propertyNamesNarrow = (): string => {
    if (schema.propertyNames?.pattern) {
      return narrowPredicate(
        `Object.keys(o).every((k) => new RegExp(${JSON.stringify(schema.propertyNames.pattern)}).test(k))`,
        propNamesMessage,
      )
    }
    if (schema.propertyNames?.enum) {
      return narrowPredicate(
        `Object.keys(o).every((k) => ${JSON.stringify(schema.propertyNames.enum)}.includes(k))`,
        propNamesMessage,
      )
    }
    return ''
  }

  const patternPropertiesNarrows = (): readonly string[] =>
    schema.patternProperties
      ? Object.entries(schema.patternProperties).map(([pattern, propSchema]) => {
          const s = ensureRuntime(arktype(propSchema, rootName, isArktype, options))
          return narrowPredicate(
            `Object.entries(o).every(([k, val]) => !new RegExp(${JSON.stringify(pattern)}).test(k) || ${s}.allows(val))`,
            patternPropsMessage,
          )
        })
      : []

  const composeNarrows = (base: string, narrows: readonly string[]): string =>
    narrows.length === 0 ? base : narrows.reduce((acc, n) => `${acc}.narrow(${n})`, base)

  // ── additionalProperties: schema → type({"[string]": ...}) + propertyNames + patternProperties ──
  if (typeof schema.additionalProperties === 'object') {
    const innerLiteral = `{"[string]":${arktype(schema.additionalProperties, rootName, isArktype, options)}}`
    const narrows = [propertyNamesNarrow(), ...patternPropertiesNarrows()].filter((a) => a !== '')
    if (narrows.length > 0) {
      return composeNarrows(`type(${innerLiteral})`, narrows)
    }
    return isArktype ? innerLiteral : `type(${innerLiteral})`
  }

  if (!schema.properties) {
    if (schema.additionalProperties === true) return '"unknown"'
    return isArktype ? '{}' : 'type({})'
  }

  const additionalMode =
    schema.additionalProperties === true
      ? 'delete'
      : schema.additionalProperties === false
        ? 'reject'
        : undefined
  const required = Array.isArray(schema.required) ? schema.required : []
  const props = Object.entries(schema.properties)
    .map(([key, propSchema]) => {
      const parsed = arktype(propSchema, rootName, isArktype, options)
      if (!parsed) return null
      const isRequired = required.includes(key)
      const baseSafeKey = makeSafeKey(key)
      const safeKey = isRequired
        ? baseSafeKey
        : baseSafeKey.startsWith('"')
          ? JSON.stringify(`${key}?`)
          : `"${key}?"`
      return `${safeKey}:${parsed}`
    })
    .filter((p) => p !== null)
  const additionalProp = additionalMode ? `"+":"${additionalMode}"` : undefined
  const allProps = [...props, additionalProp].filter((p) => p !== undefined)

  const innerLiteral = `{${allProps.join(',')}}`

  const minPropertiesNarrow =
    typeof schema.minProperties === 'number'
      ? narrowPredicate(`Object.keys(o).length >= ${schema.minProperties}`, minimumMessage)
      : ''
  const maxPropertiesNarrow =
    typeof schema.maxProperties === 'number'
      ? narrowPredicate(`Object.keys(o).length <= ${schema.maxProperties}`, maximumMessage)
      : ''
  const dependentRequiredNarrows: readonly string[] = schema.dependentRequired
    ? Object.entries(schema.dependentRequired).map(([key, deps]) => {
        const depsCheck = deps.map((d) => `'${d}' in o`).join(' && ')
        return narrowPredicate(`!('${key}' in o) || (${depsCheck})`, depReqMessage)
      })
    : []
  // v3.0: dependentSchemas — when key present, the whole object must
  // additionally satisfy the named sub-schema.
  const dependentSchemasNarrows: readonly string[] = schema.dependentSchemas
    ? Object.entries(schema.dependentSchemas).map(([key, subSchema]) => {
        const s = ensureRuntime(arktype(subSchema, rootName, isArktype, options))
        return narrowPredicate(`!('${key}' in o) || ${s}.allows(o)`, depSchMessage)
      })
    : []
  // v3.0: x-additionalProperties-message narrows extras-rejection
  // when additionalProperties: false.
  const additionalPropertiesNarrow =
    schema.additionalProperties === false && addlPropsMessage
      ? narrowPredicate(
          `Object.keys(o).every((k) => ${JSON.stringify(Object.keys(schema.properties))}.includes(k))`,
          addlPropsMessage,
        )
      : ''

  const narrows = [
    minPropertiesNarrow,
    maxPropertiesNarrow,
    propertyNamesNarrow(),
    ...patternPropertiesNarrows(),
    ...dependentRequiredNarrows,
    ...dependentSchemasNarrows,
    additionalPropertiesNarrow,
  ].filter((a) => a !== '')

  const baseExpr =
    narrows.length > 0
      ? composeNarrows(`type(${innerLiteral})`, narrows)
      : isArktype
        ? innerLiteral
        : `type(${innerLiteral})`
  const propsMessage = schema['x-properties-message']
  if (typeof propsMessage !== 'string') return baseExpr
  const wrapped = baseExpr.startsWith('{') ? `type(${baseExpr})` : baseExpr
  return `${wrapped}.describe(${JSON.stringify(propsMessage)})`
}
