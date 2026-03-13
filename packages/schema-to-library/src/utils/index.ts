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
 * @param t - Schema type value (string or array of strings)
 * @returns Array of type strings
 * @example
 * ```ts
 * normalizeTypes('string') // ['string']
 * normalizeTypes(['string', 'number']) // ['string', 'number']
 * normalizeTypes(undefined) // []
 * ```
 */
export function normalizeTypes(t?: string | string[]): string[] {
  return t === undefined ? [] : Array.isArray(t) ? t : [t]
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
