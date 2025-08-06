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
 * Normalize schema type to array format
 *
 * @param t - Schema type or array of types
 * @returns Array of normalized types
 * @example
 * ```ts
 * normalizeTypes('string') // ['string']
 * normalizeTypes(['string', 'number']) // ['string', 'number']
 * normalizeTypes(undefined) // []
 * ```
 */
export function normalizeTypes(
  t?:
    | 'string'
    | 'number'
    | 'integer'
    | 'date'
    | 'boolean'
    | 'array'
    | 'object'
    | 'null'
    | [
        'string' | 'number' | 'integer' | 'date' | 'boolean' | 'array' | 'object' | 'null',
        ...('string' | 'number' | 'integer' | 'date' | 'boolean' | 'array' | 'object' | 'null')[],
      ],
): ('string' | 'number' | 'integer' | 'date' | 'boolean' | 'array' | 'object' | 'null')[] {
  return t === undefined ? [] : Array.isArray(t) ? t : [t]
}
