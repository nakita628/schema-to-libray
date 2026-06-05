import type { JSONSchema } from '../parser/index.js'
import { coerceDefault } from '../utils/index.js'
import { type CodeExtensionOptions, readCodeExtension } from './code-extensions.js'
import { serializeJSValue } from './meta.js'

/**
 * Wraps an Effect schema string with `Schema.optionalWith()`, `Schema.NullOr()`,
 * `Schema.brand()` and `.annotations({...})` based on `default` / `nullable` /
 * `x-brand` and OpenAPI metadata fields.
 *
 * Metadata mapping (Effect `Schema.annotations`):
 * - `description` → `description`
 * - `examples` (or `[example]` when only singular present) → `examples`
 * - `deprecated` / `externalDocs` / `readOnly` / `writeOnly` → `jsonSchema: {...}`
 *   (Effect routes non-standard JSON Schema fields through the `jsonSchema`
 *   annotation to avoid polluting the standard annotation namespace.)
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
  // NullOr must wrap a Schema, not a PropertySignature. When both nullable and
  // default are present, NullOr goes inside optionalWith so the inner argument
  // is still a Schema and the outer optionalWith yields a valid PropertySignature.
  const withNullable = isNullable ? `Schema.NullOr(${effectStr})` : effectStr
  const brand = schema['x-brand']
  const withBrand =
    typeof brand === 'string' ? `${withNullable}.pipe(Schema.brand("${brand}"))` : withNullable
  const filter = readCodeExtension(schema, 'x-filter', options)
  const transformExt = readCodeExtension(schema, 'x-transform', options)
  const pipeExt = readCodeExtension(schema, 'x-pipe', options)
  const codeChain = [filter, transformExt, pipeExt].filter((v): v is string => v !== undefined)
  const withCodeExts = codeChain.length === 0 ? withBrand : `${withBrand}${codeChain.join('')}`
  // optionalWith is always outermost (it returns a PropertySignature, not a Schema).
  // An object literal `{...}` after `() =>` parses as a block, so wrap it in
  // parens to force an object-literal expression.
  const thunkBody = (value: unknown): string => {
    const literal = formatLiteral(value)
    return literal.startsWith('{') ? `(${literal})` : literal
  }
  const defaultResult =
    schema.default !== undefined ? coerceDefault(schema, schema.default) : undefined
  const withDefault = defaultResult?.keep
    ? `Schema.optionalWith(${withCodeExts},{default:() => ${thunkBody(defaultResult.value)}})`
    : withCodeExts

  const examples = schema.examples ?? (schema.example !== undefined ? [schema.example] : undefined)
  const ann: Record<string, unknown> = {}
  if (schema.description !== undefined) ann.description = schema.description
  if (examples !== undefined) ann.examples = examples
  const jsonSchemaAnn: Record<string, unknown> = {}
  if (schema.deprecated !== undefined) jsonSchemaAnn.deprecated = schema.deprecated
  if (schema.externalDocs !== undefined) jsonSchemaAnn.externalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) jsonSchemaAnn.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) jsonSchemaAnn.writeOnly = schema.writeOnly
  if (Object.keys(jsonSchemaAnn).length > 0) {
    ann.jsonSchema = jsonSchemaAnn
  }
  if (Object.keys(ann).length === 0) return withDefault
  return `${withDefault}.annotations(${serializeJSValue(ann)})`
}
