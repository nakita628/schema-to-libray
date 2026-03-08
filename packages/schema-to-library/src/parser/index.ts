import $RefParser from '@apidevtools/json-schema-ref-parser'
import type { JSONSchema } from '../types/index.js'

/**
 * Parse and resolve a JSON Schema file using @apidevtools/json-schema-ref-parser.
 *
 * Uses `bundle()` to resolve external $ref while preserving internal references,
 * matching the pattern used in hono-takibi with swagger-parser.
 *
 * Supports:
 * - JSON and YAML input files
 * - JSON Schema Draft 4, 6, 7, 2019-09, 2020-12
 * - Circular references
 * - External $ref resolution
 *
 * @param input - File path to JSON/YAML schema
 * @returns Bundled JSON Schema or error
 */
export async function parseSchemaFile(
  input: string,
): Promise<
  { readonly ok: true; readonly value: JSONSchema } | { readonly ok: false; readonly error: string }
> {
  try {
    const schema = await $RefParser.bundle(input)
    return { ok: true, value: schema as JSONSchema }
  } catch (error) {
    return {
      ok: false,
      error: `Failed to parse schema: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
