import { isSchemaList, isSchemaObject } from '../guard/index.js'
import type { JSONSchema, JSONValue } from '../parser/index.js'

/** `definitions` and `$defs` read as one map, `$defs` winning on a shared name. */
export function collectDefinitions(schema: JSONSchema): { readonly [k: string]: JSONSchema } {
  return { ...schema.definitions, ...schema.$defs }
}

/**
 * The schema every array element is validated against: `items` itself, or the first
 * member of a Draft-04 tuple. `undefined` for a boolean `items`, or none.
 */
export function itemsSchemaOf(items: JSONSchema['items']): JSONSchema | undefined {
  if (isSchemaObject(items)) return items
  if (isSchemaList(items)) return items[0]
  return undefined
}

/**
 * The example values of a node: `examples` as given, or the single OpenAPI `example`
 * lifted into a list. `undefined` when the node carries neither.
 */
export function examplesOf(schema: JSONSchema): readonly JSONValue[] | undefined {
  if (schema.examples !== undefined) return schema.examples
  return schema.example === undefined ? undefined : [schema.example]
}
