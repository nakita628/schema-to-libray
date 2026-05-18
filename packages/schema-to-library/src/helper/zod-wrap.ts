import type { JSONSchema } from '../parser/index.js'
import { type CodeExtensionOptions, readCodeExtension } from './code-extensions.js'
import { serializeJSValue } from './meta.js'

/**
 * Wraps a Zod schema string with `.default()`, `.nullable()`, `.brand<...>()`
 * and a single Zod v4 metadata chain (`.meta({ ... })`) based on the JSON
 * Schema's `default` / `nullable` / `x-brand` and OpenAPI metadata fields.
 *
 * When `options.unsafeCodeExtensions` is true, chain-term extensions
 * (`x-refine` / `x-transform` / `x-pipe`) are appended between brand and
 * meta, and the outermost extensions (`x-codec` / `x-preprocess`) replace
 * the final result with their raw expression value.
 *
 * @see https://zod.dev/metadata
 */
export function zodWrap(
  zodStr: string,
  schema: JSONSchema,
  options?: CodeExtensionOptions,
): string {
  const formatLiteral = (value: unknown): string => {
    if (typeof value === 'boolean') return `${value}`
    if (typeof value === 'number') {
      if (schema.format === 'int64') return `${value}n`
      if (schema.format === 'bigint') return `BigInt(${value})`
      return `${value}`
    }
    if (schema.type === 'date' && typeof value === 'string')
      return `new Date(${JSON.stringify(value)})`
    return JSON.stringify(value)
  }
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')
  const withDefault =
    schema.default !== undefined ? `${zodStr}.default(${formatLiteral(schema.default)})` : zodStr
  const withNullable = isNullable ? `${withDefault}.nullable()` : withDefault
  const withReadonly = schema['x-readonly'] === true ? `${withNullable}.readonly()` : withNullable
  const withPrefault =
    schema['x-prefault'] !== undefined
      ? `${withReadonly}.prefault(${formatLiteral(schema['x-prefault'])})`
      : withReadonly
  const withCatch =
    schema['x-catch'] !== undefined
      ? `${withPrefault}.catch(${formatLiteral(schema['x-catch'])})`
      : withPrefault
  const brand = schema['x-brand']
  const withBrand = typeof brand === 'string' ? `${withCatch}.brand<"${brand}">()` : withCatch

  const refine = readCodeExtension(schema, 'x-refine', options)
  const transform = readCodeExtension(schema, 'x-transform', options)
  const pipe = readCodeExtension(schema, 'x-pipe', options)
  const withRefine = refine ? `${withBrand}${refine}` : withBrand
  const withTransform = transform ? `${withRefine}${transform}` : withRefine
  const withPipe = pipe ? `${withTransform}${pipe}` : withTransform

  const examples = schema.examples ?? (schema.example !== undefined ? [schema.example] : undefined)
  const metaObj: Record<string, unknown> = {}
  if (schema.description !== undefined) metaObj.description = schema.description
  if (examples !== undefined) metaObj.examples = examples
  if (schema.deprecated !== undefined) metaObj.deprecated = schema.deprecated
  if (schema.externalDocs !== undefined) metaObj.externalDocs = schema.externalDocs
  if (schema.readOnly !== undefined) metaObj.readOnly = schema.readOnly
  if (schema.writeOnly !== undefined) metaObj.writeOnly = schema.writeOnly
  const withMeta =
    Object.keys(metaObj).length === 0 ? withPipe : `${withPipe}.meta(${serializeJSValue(metaObj)})`

  const codec = readCodeExtension(schema, 'x-codec', options)
  const preprocess = readCodeExtension(schema, 'x-preprocess', options)
  if (codec) return codec
  if (preprocess) return preprocess
  return withMeta
}
