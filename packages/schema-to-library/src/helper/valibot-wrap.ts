import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'
import { type CodeExtensionOptions, readCodeExtension } from './code-extensions.js'
import { serializeJSValue } from './meta.js'

/**
 * Wraps a Valibot schema string with `v.optional()`, `v.nullable()`, metadata
 * actions (`v.description()` / `v.metadata()`) and `v.brand()` based on the
 * JSON Schema's `default` / `nullable` / `x-brand` and OpenAPI metadata
 * fields. All actions are consolidated into a single outer `v.pipe(...)`.
 *
 * Metadata mapping (Valibot v1 actions):
 * - `description` → `v.description(text)`
 * - `examples` (or `[example]`), `deprecated`, `externalDocs`, `readOnly`,
 *   `writeOnly` → `v.metadata({ ... })`
 *
 * @see https://valibot.dev/api/metadata/
 * @see https://valibot.dev/api/description/
 */
export function valibotWrap(
  valibotStr: string,
  schema: JSONSchema,
  options?: CodeExtensionOptions,
): string {
  const formatLiteral = (value: unknown): string => {
    if (typeof value === 'boolean') return `${value}`
    if (typeof value === 'number') return `${value}`
    return JSON.stringify(value)
  }
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')
  const defaultResult =
    schema.default !== undefined ? coerceDefault(schema, schema.default) : undefined
  const withDefault = defaultResult?.keep
    ? `v.optional(${valibotStr},${formatLiteral(defaultResult.value)})`
    : valibotStr
  const withNullable = isNullable ? `v.nullable(${withDefault})` : withDefault

  const examples = schema.examples ?? (schema.example !== undefined ? [schema.example] : undefined)
  const actions: string[] = []
  if (schema.description !== undefined) {
    actions.push(`v.description(${JSON.stringify(schema.description)})`)
  }
  const metaObj: Record<string, unknown> = {}
  if (examples !== undefined) metaObj.examples = examples
  if (schema.deprecated !== undefined) metaObj.deprecated = schema.deprecated
  if (schema.externalDocs !== undefined) metaObj.externalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) metaObj.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) metaObj.writeOnly = schema.writeOnly
  if (Object.keys(metaObj).length > 0) {
    actions.push(`v.metadata(${serializeJSValue(metaObj)})`)
  }

  if (schema['x-readonly'] === true) {
    actions.push('v.readonly()')
  }

  const brand = schema['x-brand']
  if (typeof brand === 'string') {
    actions.push(`v.brand("${brand}")`)
  }

  const check = readCodeExtension(schema, 'x-check', options)
  if (check) actions.push(check)
  const transform = readCodeExtension(schema, 'x-transform', options)
  if (transform) actions.push(transform)
  const pipeExt = readCodeExtension(schema, 'x-pipe', options)
  if (pipeExt) actions.push(pipeExt)

  const piped = actions.length === 0 ? withNullable : `v.pipe(${withNullable},${actions.join(',')})`
  if (schema['x-fallback'] !== undefined) {
    return `v.fallback(${piped},${formatLiteral(schema['x-fallback'])})`
  }
  return piped
}
