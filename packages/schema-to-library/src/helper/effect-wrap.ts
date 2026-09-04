import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'
import { type CodeExtensionOptions, readCodeExtension } from './code-extensions.js'
import { serializeJSValue } from './meta.js'

/**
 * Wraps an Effect Schema v4 schema string with `Schema.withDecodingDefault()`,
 * `Schema.NullOr()`, `Schema.brand()` and `.annotate({...})` based on
 * `default` / `nullable` / `x-brand` and OpenAPI metadata fields.
 *
 * Metadata mapping (v4 `.annotate`):
 * - `description` → `description`
 * - `readOnly` / `writeOnly` → same-named annotations (v4 promoted both to
 *   first-class fields on `Annotations.Augment`)
 * - `examples` (or `[example]` when only singular present), `deprecated` and
 *   `externalDocs` → carried as loose annotation keys, since v4 types the
 *   native `examples` annotation as `ReadonlyArray<T>` and OpenAPI specs may
 *   carry incomplete examples that would fail to type-check.
 *
 * @see https://effect.website/docs/schema/annotations/
 */
export function effectWrap(
  effectStr: string,
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
  // `Schema.NullOr` wraps a schema, so it goes inside the decoding default:
  // `withDecodingDefault` composes onto whatever schema it is piped from.
  const withNullable = isNullable ? `Schema.NullOr(${effectStr})` : effectStr
  const brand = schema['x-brand']
  const withBrand =
    typeof brand === 'string' ? `${withNullable}.pipe(Schema.brand("${brand}"))` : withNullable
  const filter = readCodeExtension(schema, 'x-filter', options)
  const transformExt = readCodeExtension(schema, 'x-transform', options)
  const pipeExt = readCodeExtension(schema, 'x-pipe', options)
  const codeChain = [filter, transformExt, pipeExt].filter((v): v is string => v !== undefined)
  const withCodeExts = codeChain.length === 0 ? withBrand : `${withBrand}${codeChain.join('')}`
  // v4 replaced `Schema.optionalWith(s, {default})` with a pipeable
  // `Schema.withDecodingDefault(Effect.succeed(value))`, which already makes
  // the encoded key optional. The default is an `Encoded` value, which is what
  // `coerceDefault` produces.
  const defaultResult =
    schema.default !== undefined ? coerceDefault(schema, schema.default) : undefined
  const withDefault = defaultResult?.keep
    ? `${withCodeExts}.pipe(Schema.withDecodingDefault(Effect.succeed(${formatLiteral(defaultResult.value)})))`
    : withCodeExts

  const examples = schema.examples ?? (schema.example !== undefined ? [schema.example] : undefined)
  const ann: Record<string, unknown> = {}
  if (schema.description !== undefined) ann.description = schema.description
  // v4 types `examples` as `ReadonlyArray<T>`. OpenAPI examples are
  // documentation metadata, not constraints, and specs may carry incomplete
  // examples; keeping them under a loose key avoids failing generation on
  // otherwise valid input. `Annotations` has a string index signature, so
  // unknown keys are accepted.
  if (examples !== undefined) ann.jsonSchemaExamples = examples
  if (schema.deprecated !== undefined) ann.jsonSchemaDeprecated = schema.deprecated
  if (schema.externalDocs !== undefined) ann.jsonSchemaExternalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) ann.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) ann.writeOnly = schema.writeOnly
  if (Object.keys(ann).length === 0) return withDefault
  return `${withDefault}.annotate(${serializeJSValue(ann)})`
}
