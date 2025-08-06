/**
 *
 * @param name
 * @returns
 */
export function toPascalCase(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  
  /**
   *
   * @param t
   * @returns
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
  ) {
    return t === undefined ? [] : Array.isArray(t) ? t : [t]
  }