import type { JSONSchema } from '../parser/index.js'
import { type CodeExtensionOptions, readCodeExtension } from './code-extensions.js'

/**
 * Wraps an ArkType schema string with `.or("null")`, `.brand()` and
 * `.describe()` based on the JSON Schema's `nullable` / `x-brand` fields and
 * OpenAPI `description`.
 *
 * Metadata mapping (ArkType `.describe()`):
 * - `description` → `.describe(text)`
 *
 * Other OpenAPI metadata fields (`examples`, `deprecated`, `externalDocs`,
 * `readOnly`, `writeOnly`) are NOT emitted because ArkType's `.configure()`
 * requires `ArkEnv["meta"]` interface augmentation for non-standard keys,
 * which the user must opt in to. Emitting them here could produce TypeScript
 * compile errors in consumer projects.
 *
 * @see https://arktype.io/docs/configuration
 */
export function arktypeWrap(
  arktypeStr: string,
  schema: JSONSchema,
  options?: CodeExtensionOptions,
): string {
  const isQuoted = (s: string) => s.startsWith('"') && s.endsWith('"')
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')
  const withNullable = isNullable
    ? isQuoted(arktypeStr)
      ? `"${arktypeStr.slice(1, -1)} | null"`
      : `type(${arktypeStr}).or("null")`
    : arktypeStr
  const withReadonly =
    schema['x-readonly'] === true
      ? isQuoted(withNullable)
        ? `type(${withNullable}).readonly()`
        : `${withNullable}.readonly()`
      : withNullable
  const brand = schema['x-brand']
  const withBrand =
    typeof brand === 'string'
      ? isQuoted(withReadonly)
        ? `type(${withReadonly}).brand("${brand}")`
        : `${withReadonly}.brand("${brand}")`
      : withReadonly

  const narrow = readCodeExtension(schema, 'x-narrow', options)
  const morph = readCodeExtension(schema, 'x-morph', options)
  const pipeExt = readCodeExtension(schema, 'x-pipe', options)
  const codeChain = [narrow, morph, pipeExt].filter((v): v is string => v !== undefined).join('')
  const withCodeExts = codeChain
    ? isQuoted(withBrand)
      ? `type(${withBrand})${codeChain}`
      : `${withBrand}${codeChain}`
    : withBrand
  if (schema.description === undefined) return withCodeExts
  const callable = isQuoted(withCodeExts) ? `type(${withCodeExts})` : withCodeExts
  return `${callable}.describe(${JSON.stringify(schema.description)})`
}
