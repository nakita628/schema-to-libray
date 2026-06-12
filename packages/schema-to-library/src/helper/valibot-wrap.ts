import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'
import { type CodeExtensionOptions, readCodeExtension } from './code-extensions.js'
import { serializeJSValue } from './meta.js'

/**
 * `v.optional(schema, default)` types the default as the inner schema's
 * InferInput, so a kept `null` default must wrap the nullable schema
 * (`v.optional(v.nullable(x), null)`) — nesting it inside `v.nullable` is a
 * type error. Non-null defaults keep the established nullable-outer nesting.
 */
function wrapDefaultNullable(
  inner: string,
  isNullable: boolean,
  defaultLiteral: string | undefined,
) {
  if (defaultLiteral === 'null' && isNullable) return `v.optional(v.nullable(${inner}),null)`
  const withDefault =
    defaultLiteral !== undefined ? `v.optional(${inner},${defaultLiteral})` : inner
  return isNullable ? `v.nullable(${withDefault})` : withDefault
}

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
  options?: CodeExtensionOptions & { readonly stringWire?: boolean },
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
  // For a string-wire param (`query` / `path`), `valibotStr` is a coercion pipe
  // whose *input* is a string (`v.pipe(v.string(),v.transform(Number),...)` etc).
  // Valibot's `optional(schema, default)` types the default as `InferInput`, so a
  // numeric/boolean default must be emitted in its string-wire form (`'1'`,
  // `'true'`) — the pipe coerces it back. Emitting the raw `1` is a type error.
  const defaultLiteral =
    defaultResult?.keep === true
      ? formatLiteral(
          options?.stringWire === true ? String(defaultResult.value) : defaultResult.value,
        )
      : undefined
  const withNullable = wrapDefaultNullable(valibotStr, isNullable, defaultLiteral)

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
