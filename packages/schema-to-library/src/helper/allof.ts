import type { JSONSchema } from '../parser/index.js'

/**
 * An `allOf` member that only says "and it may be null".
 *
 * OpenAPI 3.0 spells a nullable composition as `allOf: [{...}, { nullable: true }]`, and
 * a bare `{ type: 'null' }` is the JSON Schema equivalent. Neither contributes a shape,
 * so every generator lifts it out of the intersection and onto the result instead.
 */
export function isNullTypeMember(schema: JSONSchema): boolean {
  return schema.type === 'null' || (schema.nullable === true && Object.keys(schema).length === 1)
}

/**
 * An `allOf` member that only carries a `default`.
 *
 * A default is metadata on the composed value rather than a constraint of its own, so it
 * is applied to the intersection rather than intersected into it.
 */
export function isDefaultOnlyMember(schema: JSONSchema): boolean {
  return Object.keys(schema).length === 1 && schema.default !== undefined
}

/**
 * An `allOf` member that only carries a `const`.
 *
 * The other members already describe the shape; a lone `const` would narrow it to a
 * single value in a way none of the target libraries express as an intersection, so it is
 * dropped rather than emitted.
 */
export function isConstOnlyMember(schema: JSONSchema): boolean {
  return Object.keys(schema).length === 1 && schema.const !== undefined
}

/**
 * True for an `allOf` member that carries no shape of its own — the ones every generator
 * filters out before intersecting what is left.
 */
export function isShapelessMember(schema: JSONSchema): boolean {
  return isNullTypeMember(schema) || isDefaultOnlyMember(schema) || isConstOnlyMember(schema)
}
