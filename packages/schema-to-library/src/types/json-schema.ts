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
  $vocabulary?: Record<string, boolean>
  /** Anchor for referencing */
  $anchor?: string
  /** Dynamic anchor (Draft 2020-12) */
  $dynamicAnchor?: string
  /** Dynamic reference (Draft 2020-12) */
  $dynamicRef?: string
  /** Schema definitions (Draft 2020-12 / Draft 2019-09) */
  $defs?: Record<string, JSONSchema>
  /** Schema definitions (Draft-07 and earlier) */
  definitions?: Record<string, JSONSchema>

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
  properties?: Record<string, JSONSchema>
  /** Required property names */
  required?: string[]
  /** Additional properties constraint */
  additionalProperties?: boolean | JSONSchema
  /** Pattern-based properties */
  patternProperties?: Record<string, JSONSchema>
  /** Property name constraint */
  propertyNames?: JSONSchema
  /** Minimum number of properties */
  minProperties?: number
  /** Maximum number of properties */
  maxProperties?: number
  /** Dependent required properties (Draft 2019-09+) */
  dependentRequired?: Record<string, string[]>
  /** Dependent schemas (Draft 2019-09+) */
  dependentSchemas?: Record<string, JSONSchema>
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
    mapping?: Record<string, string>
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

  // ── Draft-04 Compatibility ────────────────────────────────────────
  /** Schema name (non-standard) */
  name?: string
  /** Allow additional properties via index signature */
  [key: string]: unknown
}
