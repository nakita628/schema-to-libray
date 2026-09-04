/**
 * Whether a value is a non-null object — the shape every schema walk descends into.
 *
 * `typeof null === 'object'` is the one case worth spelling out; arrays pass, which is
 * what the walkers want, since a combinator list is an array of schemas.
 */
export function isRecord(value: unknown): value is { readonly [k: string]: unknown } {
  return typeof value === 'object' && value !== null
}

/**
 * A JSON value as the TypeScript literal that reproduces it.
 *
 * `JSON.stringify` already answers for strings, arrays and objects; booleans and numbers
 * go through template interpolation so `-0`, `1e21` and friends keep the spelling the
 * source had rather than picking up quotes.
 */
export function jsLiteral(value: unknown): string {
  if (typeof value === 'boolean') return `${value}`
  if (typeof value === 'number') return `${value}`
  return JSON.stringify(value)
}
