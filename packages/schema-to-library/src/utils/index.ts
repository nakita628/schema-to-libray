/**
 * Convert string to PascalCase (first character uppercase)
 *
 * @example
 * ```ts
 * toPascalCase('animal')      // 'Animal'
 * toPascalCase('userProfile') // 'UserProfile'
 * ```
 */
export function toPascalCase(name: string) {
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
export function toIdentifierPascalCase(name: string) {
  const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean)
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
 * Format an error message argument using the Zod v4 unified `error` parameter.
 *
 * @example
 * ```ts
 * zodError('Name must be 3-20 characters') // '{error:"Name must be 3-20 characters"}'
 * zodError('(v) => `Expected ${v}`')        // '{error:(v) => `Expected ${v}`}'
 * ```
 */
export function zodError(message: string) {
  const isArrowExpression = (s: string) => /^\s*\(.*?\)\s*=>/.test(s)
  return isArrowExpression(message) ? `{error:${message}}` : `{error:${JSON.stringify(message)}}`
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
  const toIdentifierName = (name: string) => {
    const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean)
    if (parts.length === 0) return 'Schema'
    const result = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
    if (/^[0-9]/.test(result)) {
      const prefixed = `_${result}`
      return prefixed.replace(/([0-9])([a-z])/, (_, d, c: string) => `${d}${c.toUpperCase()}`)
    }
    return result
  }
  for (const { prefix, suffix } of OPENAPI_COMPONENT_SUFFIX_MAP) {
    if ($ref.startsWith(prefix)) {
      const rawName = decodeURIComponent($ref.slice(prefix.length))
      return toIdentifierName(rawName) + suffix
    }
  }
  return null
}
