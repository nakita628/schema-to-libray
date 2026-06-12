/**
 * Convert string to PascalCase (first character uppercase).
 *
 * When the input contains characters that are not valid in a TypeScript
 * identifier (whitespace, dots, slashes, etc.) the input is routed through
 * {@link toIdentifierPascalCase} so the generated variable name remains
 * parseable. Hyphens and underscores are preserved for back-compat with
 * upstream titles that already generated working code.
 *
 * @example
 * ```ts
 * toPascalCase('animal')                     // 'Animal'
 * toPascalCase('userProfile')                // 'UserProfile'
 * toPascalCase('Self-Referencing Entities')  // 'SelfReferencingEntities'
 * ```
 */
export function toPascalCase(name: string) {
  if (/[^A-Za-z0-9_-]/.test(name)) return toIdentifierPascalCase(name)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Convert string to a valid PascalCase identifier
 *
 * Splits by non-alphanumeric characters and capitalizes each segment.
 * Handles hyphens, underscores, dots, spaces, leading numbers, and non-ASCII characters.
 *
 * @example
 * ```ts
 * toIdentifierPascalCase('user-name')   // 'UserName'
 * toIdentifierPascalCase('hello_world') // 'HelloWorld'
 * toIdentifierPascalCase('123value')    // '_123Value'
 * toIdentifierPascalCase('user')        // 'User'
 * ```
 */
/**
 * Encode non-ASCII characters as `u<hex codepoint>` so they survive identifier
 * normalization instead of being stripped (which collapses every non-ASCII name
 * to the same `Schema`, producing duplicate declarations). Pure-ASCII input is
 * returned unchanged, so identifier generation stays byte-for-byte identical for
 * the overwhelming majority of specs.
 *
 * @example
 * ```ts
 * encodeNonAscii('User')          // 'User'
 * encodeNonAscii('日本語')         // 'u65e5u672cu8a9e'
 * ```
 */
export function encodeNonAscii(name: string) {
  return Array.from(name)
    .map((ch) => {
      const cp = ch.codePointAt(0) ?? 0
      return cp > 0x7f ? `u${cp.toString(16)}` : ch
    })
    .join('')
}

export function toIdentifierPascalCase(name: string) {
  const parts = encodeNonAscii(name)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
  if (parts.length === 0) return 'Schema'
  const result = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  if (/^[0-9]/.test(result)) {
    const prefixed = `_${result}`
    return prefixed.replace(/([0-9])([a-z])/, (_, d, c: string) => `${d}${c.toUpperCase()}`)
  }
  return result
}

/**
 * Normalize schema type to array format
 *
 * @example
 * ```ts
 * normalizeTypes('string')             // ['string']
 * normalizeTypes(['string', 'number']) // ['string', 'number']
 * normalizeTypes(undefined)            // []
 * ```
 */
export function normalizeTypes(t?: string | readonly string[]) {
  if (t === undefined) return []
  if (typeof t === 'string') return [t]
  return [...t]
}

/**
 * Reconcile a schema's `default` value with the type the schema actually emits
 * so the generated `.default(...)` stays assignable.
 *
 * - `null` on a non-nullable schema is unusable as a default → `keep: false`
 *   (the caller omits `.default`).
 * - a string `'true'`/`'false'` on a boolean schema denotes the boolean it
 *   spells → coerced to the boolean value (covers `z.stringbool()` query coercion).
 * - everything else is returned unchanged (byte-for-byte identical output).
 *
 * The mismatch check is deliberately shallow and only crosses the
 * composite (array/object) ↔ scalar category boundary; scalar↔scalar
 * mismatches and schemas without an explicit `type` (`oneOf`/`$ref` only)
 * pass through untouched — JSON Schema 2020-12 §9.9.4.1 treats `default` as
 * an annotation with no validity guarantee, so anything finer would need a
 * full validator.
 *
 * @example
 * ```ts
 * coerceDefault({ type: 'boolean' }, 'true')           // { keep: true, value: true }
 * coerceDefault({ type: 'object' }, null)              // { keep: false, value: null }
 * coerceDefault({ type: 'object', nullable: true }, null) // { keep: true, value: null }
 * coerceDefault({ type: 'array' }, 'eval')             // { keep: false, value: 'eval' }
 * ```
 */
export function coerceDefault(
  schema: { readonly type?: string | readonly string[]; readonly nullable?: boolean },
  value: unknown,
): { readonly keep: boolean; readonly value: unknown } {
  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type !== undefined
      ? [schema.type]
      : []
  const isNullable = schema.nullable === true || types.includes('null')
  if (value === null && !isNullable) return { keep: false, value }
  if (types.includes('boolean') && (value === 'true' || value === 'false')) {
    return { keep: true, value: value === 'true' }
  }
  // Drop a composite default (`[]` / `{}`) on a purely scalar schema, e.g. the
  // malformed `{ type: 'string', default: [] }` — keeping it would emit an
  // ill-typed `.default([])` on a string literal/primitive.
  const isComposite = Array.isArray(value) || (typeof value === 'object' && value !== null)
  const allowsComposite = types.length === 0 || types.includes('array') || types.includes('object')
  if (isComposite && !allowsComposite) return { keep: false, value }
  // The symmetric hole: drop a scalar default on a composite-only schema, e.g.
  // OpenAI's malformed `{ type: 'array', default: 'eval' }` — keeping it would
  // emit an ill-typed `.default('eval')` on an array schema.
  const allowsScalar =
    types.length === 0 || types.some((t) => t !== 'array' && t !== 'object' && t !== 'null')
  if (!isComposite && value !== null && !allowsScalar) return { keep: false, value }
  return { keep: true, value }
}

/**
 * Format an error message argument using the Zod v4 unified `error` parameter.
 *
 * @example
 * ```ts
 * zodError('Name must be 3-20 characters') // '{error:"Name must be 3-20 characters"}'
 * zodError('(val) => `Expected ${val}`')   // '{error:(val) => `Expected ${val}`}'
 * ```
 */
export function zodError(message: string) {
  const isArrowExpression = (s: string) => /^\s*\(.*?\)\s*=>/.test(s)
  return isArrowExpression(message) ? `{error:${message}}` : `{error:${JSON.stringify(message)}}`
}

/**
 * Build the base `{error:...}` argument for a Zod v4 schema constructor when
 * `x-error-message` (type / generic) and/or `x-required-message`
 * (`issue.input === undefined`) are present.
 */
export function zodBaseError(
  typeMessage: string | undefined,
  requiredMessage: string | undefined,
): string {
  if (typeMessage === undefined && requiredMessage === undefined) return ''
  if (requiredMessage === undefined && typeMessage !== undefined) return zodError(typeMessage)
  if (requiredMessage !== undefined && typeMessage === undefined) {
    return `{error:(issue)=>issue.input===undefined?${JSON.stringify(requiredMessage)}:undefined}`
  }
  return `{error:(issue)=>issue.input===undefined?${JSON.stringify(requiredMessage)}:${JSON.stringify(typeMessage as string)}}`
}

/**
 * Format an error message argument for Valibot.
 *
 * @example
 * ```ts
 * valibotError('Must be valid')          // '"Must be valid"'
 * valibotError('(issue) => issue.input') // '(issue) => issue.input'
 * ```
 */
export function valibotError(message: string) {
  const isArrowExpression = (s: string) => /^\s*\(.*?\)\s*=>/.test(s)
  return isArrowExpression(message) ? message : JSON.stringify(message)
}

/**
 * Format an error message annotation for Effect Schema.
 *
 * @example
 * ```ts
 * effectError('Required')             // '{message:()=>"Required"}'
 * effectError('(issue) => ...')        // '{message:(issue) => ...}'
 * ```
 */
export function effectError(message: string) {
  const isArrowExpression = (s: string) => /^\s*\(.*?\)\s*=>/.test(s)
  return isArrowExpression(message)
    ? `{message:${message}}`
    : `{message:()=>${JSON.stringify(message)}}`
}

/**
 * OpenAPI component suffix map
 *
 * Maps OpenAPI component path prefixes to their variable name suffixes.
 *
 * @see {@link https://swagger.io/docs/specification/v3_0/components/|OpenAPI Components}
 */
export const OPENAPI_COMPONENT_SUFFIX_MAP: ReadonlyArray<{
  readonly prefix: string
  readonly suffix: string
}> = [
  { prefix: '#/components/schemas/', suffix: 'Schema' },
  { prefix: '#/components/parameters/', suffix: 'ParamsSchema' },
  { prefix: '#/components/headers/', suffix: 'HeaderSchema' },
  { prefix: '#/components/securitySchemes/', suffix: 'SecurityScheme' },
  { prefix: '#/components/requestBodies/', suffix: 'RequestBody' },
  { prefix: '#/components/responses/', suffix: 'Response' },
  { prefix: '#/components/examples/', suffix: 'Example' },
  { prefix: '#/components/links/', suffix: 'Link' },
  { prefix: '#/components/callbacks/', suffix: 'Callback' },
  { prefix: '#/components/pathItems/', suffix: 'PathItem' },
  { prefix: '#/components/mediaTypes/', suffix: 'MediaTypeSchema' },
]

/**
 * Resolve an OpenAPI $ref string to a variable name with the appropriate suffix
 *
 * @example
 * ```ts
 * resolveOpenAPIRef('#/components/schemas/User')      // 'UserSchema'
 * resolveOpenAPIRef('#/components/parameters/UserId') // 'UserIdParamsSchema'
 * resolveOpenAPIRef('#/definitions/Address')          // null
 * ```
 */
export function resolveOpenAPIRef($ref: string) {
  for (const { prefix, suffix } of OPENAPI_COMPONENT_SUFFIX_MAP) {
    if ($ref.startsWith(prefix)) {
      const rawName = decodeURIComponent($ref.slice(prefix.length))
      return toIdentifierPascalCase(rawName) + suffix
    }
  }
  return null
}

/**
 * Encode a property key safely for object literal output.
 * Bare identifiers stay unquoted; everything else is JSON-encoded.
 *
 * @example
 * ```ts
 * makeSafeKey('foo')      // 'foo'
 * makeSafeKey('foo-bar')  // '"foo-bar"'
 * makeSafeKey('123')      // '"123"'
 * ```
 */
export function makeSafeKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
}
