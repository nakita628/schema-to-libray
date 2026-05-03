import type { JSONSchema } from '../parser/index.js'

/**
 * Returns OpenAPI/JSON Schema metadata fields as a list of TypeBox option
 * entries (`'key:value'` strings) ready to be joined into a `{...}` literal.
 *
 * Used by TypeBox type-level generators to embed metadata directly into the
 * `Type.X(payload, options)` constructor call.
 */
export function typeboxMetaOpts(schema: JSONSchema): readonly string[] {
  const examples =
    schema.examples ?? (schema.example !== undefined ? [schema.example] : undefined)
  return [
    schema.description !== undefined
      ? `description:${JSON.stringify(schema.description)}`
      : undefined,
    examples !== undefined ? `examples:${serializeJSValue(examples)}` : undefined,
    schema.deprecated !== undefined ? `deprecated:${schema.deprecated}` : undefined,
    schema.externalDocs !== undefined
      ? `externalDocs:${serializeJSValue(schema.externalDocs)}`
      : undefined,
    schema.readOnly !== undefined ? `readOnly:${schema.readOnly}` : undefined,
    schema.writeOnly !== undefined ? `writeOnly:${schema.writeOnly}` : undefined,
  ].filter((v)=> v !== undefined)
}

/**
 * Serializes a value into a JavaScript expression string.
 *
 * - Strings, numbers, booleans, null: via `JSON.stringify`
 * - Arrays: `[elem1,elem2,...]`
 * - Plain objects: `{key1:value1,...}` with bare identifiers when possible
 * - Undefined values inside objects are skipped
 */
export function serializeJSValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map(serializeJSValue).join(',')}]`
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return '{}'
  const parts = entries.map(([k, v]) => {
    const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k)
    return `${key}:${serializeJSValue(v)}`
  })
  return `{${parts.join(',')}}`
}
