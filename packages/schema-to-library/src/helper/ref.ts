/**
 * True for a local JSON Pointer `$ref` that points *into* a component
 * sub-schema (e.g. `#/components/schemas/X/properties/Y`) rather than at a
 * top-level component (`#/components/schemas/X`). Such pointers have no
 * generated declaration, so generators emit an `unknown` schema for them
 * instead of referencing an undeclared identifier.
 *
 * @example
 * ```ts
 * isDeepLocalPointer('#/components/schemas/User')             // false
 * isDeepLocalPointer('#/components/schemas/User/properties/x') // true
 * ```
 */
export function isDeepLocalPointer($ref: string): boolean {
  if (!$ref.startsWith('#/')) return false
  const fragment = $ref.slice(2)
  const containers = ['components/schemas/', 'definitions/', '$defs/']
  const matched = containers.find((c) => fragment.startsWith(c))
  return matched ? fragment.slice(matched.length).includes('/') : false
}
