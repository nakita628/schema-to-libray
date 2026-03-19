/**
 * Convert string to PascalCase (first character uppercase)
 *
 * @param name - String to convert
 * @returns PascalCase string
 * @example
 * ```ts
 * toPascalCase('animal') // 'Animal'
 * toPascalCase('userProfile') // 'UserProfile'
 * ```
 */
export function toPascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Convert string to a valid PascalCase identifier
 *
 * Splits by non-alphanumeric characters and capitalizes each segment.
 * Handles hyphens, underscores, dots, spaces, leading numbers, and non-ASCII characters.
 *
 * @param name - String to convert
 * @returns Valid PascalCase identifier string
 * @example
 * ```ts
 * toIdentifierPascalCase('user-name')   // 'UserName'
 * toIdentifierPascalCase('hello_world') // 'HelloWorld'
 * toIdentifierPascalCase('123value')    // '_123Value'
 * toIdentifierPascalCase('user')        // 'User'
 * ```
 */
export function toIdentifierPascalCase(name: string): string {
  const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean)
  if (parts.length === 0) return 'Schema'
  const result = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  if (/^[0-9]/.test(result)) {
    // Find where digits end and letters begin, capitalize the first letter
    const prefixed = `_${result}`
    return prefixed.replace(/([0-9])([a-z])/, (_, d, c) => `${d}${c.toUpperCase()}`)
  }
  return result
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
 * @param $ref - OpenAPI $ref string
 * @returns Variable name with suffix, or null if not an OpenAPI component ref
 * @example
 * ```ts
 * resolveOpenAPIRef('#/components/schemas/User')      // 'UserSchema'
 * resolveOpenAPIRef('#/components/parameters/UserId') // 'UserIdParamsSchema'
 * resolveOpenAPIRef('#/definitions/Address')          // null
 * ```
 */
export function resolveOpenAPIRef($ref: string): string | null {
  for (const { prefix, suffix } of OPENAPI_COMPONENT_SUFFIX_MAP) {
    if ($ref.startsWith(prefix)) {
      const rawName = decodeURIComponent($ref.slice(prefix.length))
      return toIdentifierPascalCase(rawName) + suffix
    }
  }
  return null
}

/**
 * Normalize schema type to array format
 *
 * @param t - Schema type value (string or array of strings)
 * @returns Array of type strings
 * @example
 * ```ts
 * normalizeTypes('string') // ['string']
 * normalizeTypes(['string', 'number']) // ['string', 'number']
 * normalizeTypes(undefined) // []
 * ```
 */
export function normalizeTypes(t?: string | readonly string[]): string[] {
  if (t === undefined) return []
  if (typeof t === 'string') return [t]
  return [...t]
}

/**
 * Format an error message argument using the Zod v4 unified `error` parameter
 *
 * @param message - The error message string or arrow function expression
 * @returns `{error:"message"}` or `{error:(v)=>expr}` formatted string
 * @example
 * ```ts
 * error('Name must be 3-20 characters')
 * // → '{error:"Name must be 3-20 characters"}'
 *
 * error('(v) => `Expected ${v}`')
 * // → '{error:(v) => `Expected ${v}`}'
 * ```
 */
export function error(message: string): string {
  if (/^\s*\(.*?\)\s*=>/.test(message)) {
    return `{error:${message}}`
  }
  return `{error:${JSON.stringify(message)}}`
}

/**
 * Format an error message argument for Valibot
 *
 * @param message - The error message string or arrow function expression
 * @returns `"message"` or `(issue)=>expr` formatted string
 */
export function valibotMessage(message: string): string {
  if (/^\s*\(.*?\)\s*=>/.test(message)) {
    return message
  }
  return JSON.stringify(message)
}

/**
 * Format an error message annotation for Effect Schema
 *
 * @param message - The error message string or arrow function expression
 * @returns `{message:()=>"message"}` or `{message:(issue)=>expr}` formatted string
 */
export function effectMessage(message: string): string {
  if (/^\s*\(.*?\)\s*=>/.test(message)) {
    return `{message:${message}}`
  }
  return `{message:()=>${JSON.stringify(message)}}`
}
