import $RefParser from '@apidevtools/json-schema-ref-parser'

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

/**
 * JSON Schema type values
 *
 * @see https://json-schema.org/understanding-json-schema/reference/type
 */
export type JSONSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'
  // Non-standard extension (used by some generators)
  | 'date'

/**
 * JSON Schema string format values
 *
 * Includes standard JSON Schema formats and Zod-specific extensions.
 *
 * @see https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 */
export type JSONSchemaFormat =
  // Standard JSON Schema formats
  | 'date-time'
  | 'date'
  | 'time'
  | 'duration'
  | 'email'
  | 'idn-email'
  | 'hostname'
  | 'idn-hostname'
  | 'ipv4'
  | 'ipv6'
  | 'uri'
  | 'uri-reference'
  | 'iri'
  | 'iri-reference'
  | 'uuid'
  | 'uri-template'
  | 'json-pointer'
  | 'relative-json-pointer'
  | 'regex'
  // Zod-specific extensions
  | 'uuidv4'
  | 'uuidv6'
  | 'uuidv7'
  | 'emoji'
  | 'base64'
  | 'base64url'
  | 'nanoid'
  | 'cuid'
  | 'cuid2'
  | 'ulid'
  | 'ip'
  | 'cidrv4'
  | 'cidrv6'
  | 'binary'
  | 'toLowerCase'
  | 'toUpperCase'
  | 'trim'
  | 'jwt'
  // OpenAPI numeric formats
  | 'int32'
  | 'int64'
  | 'bigint'
  | 'float'
  | 'float32'
  | 'float64'
  | 'double'
  | 'decimal'

/**
 * JSON Schema Definition
 *
 * Supports JSON Schema Draft 2020-12, Draft 2019-09, Draft-07, Draft-06, and Draft-04.
 *
 * @see https://json-schema.org/draft/2020-12/json-schema-core
 * @see https://json-schema.org/draft/2020-12/json-schema-validation
 */
export type JSONSchema = {
  // ── Core (Draft 2020-12) ──────────────────────────────────────────
  /** JSON Schema dialect identifier */
  $schema?: string
  /** Schema identifier */
  $id?: string
  /** Schema reference */
  $ref?: string
  /** Schema comment */
  $comment?: string
  /** Vocabulary definitions */
  $vocabulary?: { [k: string]: boolean }
  /** Anchor for referencing */
  $anchor?: string
  /** Dynamic anchor (Draft 2020-12) */
  $dynamicAnchor?: string
  /** Dynamic reference (Draft 2020-12) */
  $dynamicRef?: string
  /** Schema definitions (Draft 2020-12 / Draft 2019-09) */
  $defs?: { [k: string]: JSONSchema }
  /** Schema definitions (Draft-07 and earlier) */
  definitions?: { [k: string]: JSONSchema }

  // ── Metadata ──────────────────────────────────────────────────────
  /** Schema title */
  title?: string
  /** Schema description */
  description?: string
  /** Default value */
  default?: unknown
  /** Example values (Draft 2019-09+) */
  examples?: unknown[]
  /** Single example value (OpenAPI) */
  example?: unknown
  /** Whether the schema is deprecated */
  deprecated?: boolean
  /** Whether the value is read-only */
  readOnly?: boolean
  /** Whether the value is write-only */
  writeOnly?: boolean

  // ── Type ──────────────────────────────────────────────────────────
  /** Type constraint */
  type?: JSONSchemaType | JSONSchemaType[]
  /** Format hint */
  format?: JSONSchemaFormat | (string & {})
  /** Constant value */
  const?: unknown
  /** Enumerated values */
  enum?: unknown[]

  // ── String ────────────────────────────────────────────────────────
  /** Minimum string length */
  minLength?: number
  /** Maximum string length */
  maxLength?: number
  /** Regular expression pattern */
  pattern?: string
  /** Content media type */
  contentMediaType?: string
  /** Content encoding */
  contentEncoding?: string
  /** Content schema */
  contentSchema?: JSONSchema

  // ── Number / Integer ──────────────────────────────────────────────
  /** Minimum value (inclusive) */
  minimum?: number
  /** Maximum value (inclusive) */
  maximum?: number
  /** Exclusive minimum (Draft 2020-12: number, Draft-04: boolean) */
  exclusiveMinimum?: number | boolean
  /** Exclusive maximum (Draft 2020-12: number, Draft-04: boolean) */
  exclusiveMaximum?: number | boolean
  /** Value must be a multiple of this number */
  multipleOf?: number

  // ── Object ────────────────────────────────────────────────────────
  /** Object properties */
  properties?: { [k: string]: JSONSchema }
  /** Required property names */
  required?: string[]
  /** Additional properties constraint */
  additionalProperties?: boolean | JSONSchema
  /** Pattern-based properties */
  patternProperties?: { [k: string]: JSONSchema }
  /** Property name constraint */
  propertyNames?: JSONSchema
  /** Minimum number of properties */
  minProperties?: number
  /** Maximum number of properties */
  maxProperties?: number
  /** Dependent required properties (Draft 2019-09+) */
  dependentRequired?: { [k: string]: string[] }
  /** Dependent schemas (Draft 2019-09+) */
  dependentSchemas?: { [k: string]: JSONSchema }
  /** Unevaluated properties (Draft 2019-09+) */
  unevaluatedProperties?: boolean | JSONSchema

  // ── Array ─────────────────────────────────────────────────────────
  /** Array item schema */
  items?: JSONSchema
  /** Positional item schemas (Draft 2020-12) */
  prefixItems?: JSONSchema[]
  /** Contains constraint */
  contains?: JSONSchema
  /** Minimum number of items */
  minItems?: number
  /** Maximum number of items */
  maxItems?: number
  /** Whether items must be unique */
  uniqueItems?: boolean
  /** Minimum number of contains matches (Draft 2019-09+) */
  minContains?: number
  /** Maximum number of contains matches (Draft 2019-09+) */
  maxContains?: number
  /** Unevaluated items (Draft 2019-09+) */
  unevaluatedItems?: boolean | JSONSchema

  // ── Composition ───────────────────────────────────────────────────
  /** Must match all schemas */
  allOf?: JSONSchema[]
  /** Must match at least one schema */
  anyOf?: JSONSchema[]
  /** Must match exactly one schema */
  oneOf?: JSONSchema[]
  /** Must not match the schema */
  not?: JSONSchema

  // ── Conditional (Draft-07+) ───────────────────────────────────────
  /** Conditional schema */
  if?: JSONSchema
  /** Schema to apply when if matches */
  then?: JSONSchema
  /** Schema to apply when if does not match */
  else?: JSONSchema

  // ── OpenAPI Extensions ────────────────────────────────────────────
  /** Whether the value can be null (OpenAPI 3.0) */
  nullable?: boolean
  /** Discriminator for polymorphic schemas (OpenAPI) */
  discriminator?: {
    propertyName?: string
    mapping?: { [k: string]: string }
  }
  /** XML representation metadata (OpenAPI) */
  xml?: {
    name?: string
    namespace?: string
    prefix?: string
    attribute?: boolean
    wrapped?: boolean
  }
  /** External documentation (OpenAPI) */
  externalDocs?: {
    url?: string
    description?: string
  }

  // ── Vendor Extensions (x-*) ──────────────────────────────────────
  /** General error message */
  'x-error-message'?: string
  /** Pattern validation error message */
  'x-pattern-message'?: string
  /** Minimum constraint error message */
  'x-minimum-message'?: string
  /** Maximum constraint error message */
  'x-maximum-message'?: string
  /** Size constraint error message */
  'x-size-message'?: string
  /** MultipleOf constraint error message */
  'x-multipleOf-message'?: string
  /** Per-value enum error messages */
  'x-enum-error-messages'?: { [k: string]: string }

  // ── Draft-04 Compatibility ────────────────────────────────────────
  /** Schema name (non-standard) */
  name?: string
  /** Allow additional properties via index signature */
  [k: string]: unknown
}
