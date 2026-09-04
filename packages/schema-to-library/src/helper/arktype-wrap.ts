import type { JSONSchema } from '../parser/index.js'
import { type CodeExtensionOptions, readCodeExtension } from './code-extensions.js'

/**
 * A bare ArkType definition — a string, object or tuple literal — as opposed to
 * an expression that already evaluates to a `Type` and so carries methods.
 */
export function isArktypeDefinition(s: string): boolean {
  return (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith('{') && s.endsWith('}')) ||
    (s.startsWith('[') && s.endsWith(']'))
  )
}

/**
 * Options accepted by {@link arktypeWrap}.
 *
 * `scopeMode` marks output that is being emitted inside `scope({...})`. There,
 * a definition may name a scope-local alias (`"Member"`, `"Member[]"`), which
 * only the scope can resolve — passing it to the global `type(...)` is a type
 * error. Scope mode therefore composes with ArkType's tuple expressions
 * (`[def, "@", text]`, `[def, "|", "null"]`), which stay in definition syntax
 * and so resolve against the scope.
 */
export type ArktypeWrapOptions = CodeExtensionOptions & {
  readonly scopeMode?: boolean
}

/**
 * Wraps an ArkType schema string with `.or("null")`, `.brand()` and
 * `.describe()` based on the JSON Schema's `nullable` / `x-brand` fields and
 * OpenAPI `description`.
 *
 * Metadata mapping (ArkType `.describe()`):
 * - `description` → `.describe(text)`, or `[def, "@", text]` in scope mode
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
  options?: ArktypeWrapOptions,
): string {
  const inScope = options?.scopeMode === true
  const isDefinition = isArktypeDefinition
  const isNullable =
    schema.nullable === true ||
    (Array.isArray(schema.type) ? schema.type.includes('null') : schema.type === 'null')
  // A quoted definition takes the string-union shortcut instead of `.or`.
  const isQuoted = (s: string) => s.startsWith('"') && s.endsWith('"')
  const withNullable = isNullable
    ? isQuoted(arktypeStr)
      ? `"${arktypeStr.slice(1, -1)} | null"`
      : inScope && isDefinition(arktypeStr)
        ? `[${arktypeStr},"|","null"]`
        : `type(${arktypeStr}).or("null")`
    : arktypeStr
  const withReadonly =
    schema['x-readonly'] === true
      ? isDefinition(withNullable)
        ? `type(${withNullable}).readonly()`
        : `${withNullable}.readonly()`
      : withNullable
  const brand = schema['x-brand']
  const withBrand =
    typeof brand === 'string'
      ? isDefinition(withReadonly)
        ? `type(${withReadonly}).brand("${brand}")`
        : `${withReadonly}.brand("${brand}")`
      : withReadonly

  const narrow = readCodeExtension(schema, 'x-narrow', options)
  const morph = readCodeExtension(schema, 'x-morph', options)
  const pipeExt = readCodeExtension(schema, 'x-pipe', options)
  const codeChain = [narrow, morph, pipeExt].filter((v): v is string => v !== undefined).join('')
  const withCodeExts = codeChain
    ? isDefinition(withBrand)
      ? `type(${withBrand})${codeChain}`
      : `${withBrand}${codeChain}`
    : withBrand
  if (schema.description === undefined) return withCodeExts
  const text = JSON.stringify(schema.description)
  if (inScope && isDefinition(withCodeExts)) return `[${withCodeExts},"@",${text}]`
  const callable = isDefinition(withCodeExts) ? `type(${withCodeExts})` : withCodeExts
  return `${callable}.describe(${text})`
}
