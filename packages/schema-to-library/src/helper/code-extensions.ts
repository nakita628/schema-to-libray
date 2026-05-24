import type { JSONSchema } from '../parser/index.js'

export const ZOD_CODE_EXTENSION_KEYS = [
  'x-refine',
  'x-transform',
  'x-pipe',
  'x-codec',
  'x-preprocess',
] as const

export const VALIBOT_CODE_EXTENSION_KEYS = ['x-check', 'x-transform', 'x-pipe'] as const

export const EFFECT_CODE_EXTENSION_KEYS = ['x-filter', 'x-transform', 'x-pipe'] as const

export const ARKTYPE_CODE_EXTENSION_KEYS = ['x-narrow', 'x-morph', 'x-pipe'] as const

export const ALL_CODE_EXTENSION_KEYS: readonly string[] = [
  ...new Set([
    ...ZOD_CODE_EXTENSION_KEYS,
    ...VALIBOT_CODE_EXTENSION_KEYS,
    ...EFFECT_CODE_EXTENSION_KEYS,
    ...ARKTYPE_CODE_EXTENSION_KEYS,
  ]),
].sort()

const DENYLIST_PATTERN = new RegExp(
  [
    '\\b(?:process|require|import|globalThis|eval|Function|constructor|__proto__|',
    'child_process|setTimeout|setInterval|XMLHttpRequest|fetch|atob|btoa|',
    'document|window|self|top|parent|location|navigator|localStorage|',
    'sessionStorage|indexedDB|WebSocket|FileReader|Worker|crypto|require_|',
    'arguments|callee|caller|Reflect|Proxy|Symbol)\\b',
    '|String\\s*\\.\\s*fromCharCode',
    '|String\\s*\\.\\s*raw',
    '|\\.\\s*join\\s*\\(',
    '|`',
    '|\\\\[uxN]',
    '|\\[\\s*[\'"]',
  ].join(''),
)

/**
 * Validate a raw code-extension value against a small denylist.
 *
 * **This is defense-in-depth only — not a primary control.** The primary
 * security control is the `unsafeCodeExtensions: true` programmatic opt-in
 * itself. A motivated attacker can bypass the denylist through string-
 * construction (`String.fromCharCode(...)`, `['c','o','d','e'].join('')`),
 * `arguments.callee.caller` chains, ES2015+ identifier characters, or any
 * number of metaprogramming patterns we have not enumerated. Do not pass
 * `{ unsafeCodeExtensions: true }` for JSON Schemas from outside your trust
 * boundary, regardless of what this function returns.
 *
 * Blocks: `process` / `require` / `import` / `globalThis` / `eval` /
 * `Function` / `constructor` / `__proto__` / `child_process` /
 * `arguments` / `callee` / `caller` / `Reflect` / `Proxy` / `Symbol`,
 * network and browser globals, `String.fromCharCode` and `String.raw`,
 * any `.join(` invocation, template-literal backticks,
 * unicode/hex/octal-name escape sequences, and `[ '...' ]` computed access.
 */
export function isSafeCodeExtension(value: string): boolean {
  if (typeof value !== 'string') return false
  return !DENYLIST_PATTERN.test(value)
}

/**
 * Returns the list of code-extension keys present on a schema (any nested
 * level), so callers can emit a single warning when programmatic callers
 * supply such schemas without `unsafeCodeExtensions: true`.
 */
export function findCodeExtensionKeysInSchema(schema: JSONSchema): readonly string[] {
  const found = new Set<string>()
  const isRecord = (v: unknown): v is { [k: string]: unknown } =>
    typeof v === 'object' && v !== null
  const stack: unknown[] = [schema]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    for (const key of Object.keys(node)) {
      if ((ALL_CODE_EXTENSION_KEYS as readonly string[]).includes(key)) found.add(key)
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) if (isRecord(item)) stack.push(item)
      } else if (isRecord(value)) {
        stack.push(value)
      }
    }
  }
  return Array.from(found)
}

export const UNSAFE_GENERATED_MARKER = '// @generated-with-unsafe-code-extensions'

/**
 * Returns true when the schema (at any nested depth) uses JSON Schema
 * conditional keywords (`if` / `then` / `else`) so callers can emit a
 * known-limitation marker. Zod / TypeBox / ArkType generators currently
 * drop conditional validation silently; Valibot / Effect implement it.
 */
export function hasIfThenElse(schema: JSONSchema): boolean {
  const isRecord = (v: unknown): v is { [k: string]: unknown } =>
    typeof v === 'object' && v !== null
  const stack: unknown[] = [schema]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    if ('if' in node || 'then' in node || 'else' in node) return true
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) if (isRecord(item)) stack.push(item)
      } else if (isRecord(value)) {
        stack.push(value)
      }
    }
  }
  return false
}

export const IF_THEN_ELSE_UNSUPPORTED_MARKER =
  '// FIXME: JSON Schema if/then/else is not yet supported by this generator; conditional validation is omitted'

/**
 * Returns true when the schema (at any nested depth) uses the JSON Schema
 * `not` keyword. The TypeBox generator falls back to `Type.Any()` because
 * TypeBox v1 has no runtime `Type.Not(...)` constructor and `Value.Check`
 * does not evaluate `not`. Callers use this to emit a known-limitation marker.
 */
export function hasNotKeyword(schema: JSONSchema): boolean {
  const isRecord = (v: unknown): v is { [k: string]: unknown } =>
    typeof v === 'object' && v !== null
  const stack: unknown[] = [schema]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    if ('not' in node) return true
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const item of value) if (isRecord(item)) stack.push(item)
      } else if (isRecord(value)) {
        stack.push(value)
      }
    }
  }
  return false
}

export const NOT_KEYWORD_UNSUPPORTED_MARKER =
  '// FIXME: JSON Schema `not` is not enforced by this generator; TypeBox v1 has no runtime `Type.Not` and `Value.Check` ignores the keyword (falls back to `Type.Any()`)'

export type CodeExtensionOptions = {
  readonly unsafeCodeExtensions?: boolean
}

/**
 * Read a code-extension value from the schema only when the flag is enabled
 * AND the value passes the denylist check. Returns `undefined` otherwise.
 */
export function readCodeExtension(
  schema: JSONSchema,
  key: string,
  options: CodeExtensionOptions | undefined,
): string | undefined {
  if (options?.unsafeCodeExtensions !== true) return undefined
  const raw = (schema as { [k: string]: unknown })[key]
  if (typeof raw !== 'string') return undefined
  if (!isSafeCodeExtension(raw)) return undefined
  return raw
}
