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
export async function parseSchemaFile(input: string) {
  try {
    const schema = await $RefParser.bundle(input)
    return { ok: true, value: schema as JSONSchema } as const
  } catch (e) {
    return {
      ok: false,
      error: `Failed to parse schema: ${e instanceof Error ? e.message : String(e)}`,
    } as const
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
  readonly $schema?: string
  /** Schema identifier */
  readonly $id?: string
  /** Schema reference */
  readonly $ref?: string
  /** Schema comment */
  readonly $comment?: string
  /** Vocabulary definitions */
  readonly $vocabulary?: { readonly [k: string]: boolean }
  /** Anchor for referencing */
  readonly $anchor?: string
  /** Dynamic anchor (Draft 2020-12) */
  readonly $dynamicAnchor?: string
  /** Dynamic reference (Draft 2020-12) */
  readonly $dynamicRef?: string
  /** Schema definitions (Draft 2020-12 / Draft 2019-09) */
  readonly $defs?: { readonly [k: string]: JSONSchema }
  /** Schema definitions (Draft-07 and earlier) */
  readonly definitions?: { readonly [k: string]: JSONSchema }

  // ── Metadata ──────────────────────────────────────────────────────
  /** Schema title */
  readonly title?: string
  /** Schema description */
  readonly description?: string
  /** Default value */
  readonly default?: unknown
  /** Example values (Draft 2019-09+) */
  readonly examples?: readonly unknown[]
  /** Single example value (OpenAPI) */
  readonly example?: unknown
  /** Whether the schema is deprecated */
  readonly deprecated?: boolean
  /** Whether the value is read-only */
  readonly readOnly?: boolean
  /** Whether the value is write-only */
  readonly writeOnly?: boolean

  // ── Type ──────────────────────────────────────────────────────────
  /** Type constraint */
  readonly type?: JSONSchemaType | readonly JSONSchemaType[]
  /** Format hint */
  readonly format?: JSONSchemaFormat | (string & {})
  /** Constant value */
  readonly const?: unknown
  /** Enumerated values */
  readonly enum?: readonly unknown[]

  // ── String ────────────────────────────────────────────────────────
  /** Minimum string length */
  readonly minLength?: number
  /** Maximum string length */
  readonly maxLength?: number
  /** Regular expression pattern */
  readonly pattern?: string
  /** Content media type */
  readonly contentMediaType?: string
  /** Content encoding */
  readonly contentEncoding?: string
  /** Content schema */
  readonly contentSchema?: JSONSchema

  // ── Number / Integer ──────────────────────────────────────────────
  /** Minimum value (inclusive) */
  readonly minimum?: number
  /** Maximum value (inclusive) */
  readonly maximum?: number
  /** Exclusive minimum (Draft 2020-12: number, Draft-04: boolean) */
  readonly exclusiveMinimum?: number | boolean
  /** Exclusive maximum (Draft 2020-12: number, Draft-04: boolean) */
  readonly exclusiveMaximum?: number | boolean
  /** Value must be a multiple of this number */
  readonly multipleOf?: number

  // ── Object ────────────────────────────────────────────────────────
  /** Object properties */
  readonly properties?: { readonly [k: string]: JSONSchema }
  /** Required property names */
  readonly required?: readonly string[]
  /** Additional properties constraint */
  readonly additionalProperties?: boolean | JSONSchema
  /** Pattern-based properties */
  readonly patternProperties?: { readonly [k: string]: JSONSchema }
  /** Property name constraint */
  readonly propertyNames?: JSONSchema
  /** Minimum number of properties */
  readonly minProperties?: number
  /** Maximum number of properties */
  readonly maxProperties?: number
  /** Dependent required properties (Draft 2019-09+) */
  readonly dependentRequired?: { readonly [k: string]: readonly string[] }
  /** Dependent schemas (Draft 2019-09+) */
  readonly dependentSchemas?: { readonly [k: string]: JSONSchema }
  /** Unevaluated properties (Draft 2019-09+) */
  readonly unevaluatedProperties?: boolean | JSONSchema

  // ── Array ─────────────────────────────────────────────────────────
  /** Array item schema */
  readonly items?: JSONSchema
  /** Positional item schemas (Draft 2020-12) */
  readonly prefixItems?: JSONSchema[]
  /** Contains constraint */
  readonly contains?: JSONSchema
  /** Minimum number of items */
  readonly minItems?: number
  /** Maximum number of items */
  readonly maxItems?: number
  /** Whether items must be unique */
  readonly uniqueItems?: boolean
  /** Minimum number of contains matches (Draft 2019-09+) */
  readonly minContains?: number
  /** Maximum number of contains matches (Draft 2019-09+) */
  readonly maxContains?: number
  /** Unevaluated items (Draft 2019-09+) */
  readonly unevaluatedItems?: boolean | JSONSchema

  // ── Composition ───────────────────────────────────────────────────
  /** Must match all schemas */
  readonly allOf?: JSONSchema[]
  /** Must match at least one schema */
  readonly anyOf?: JSONSchema[]
  /** Must match exactly one schema */
  readonly oneOf?: JSONSchema[]
  /** Must not match the schema */
  readonly not?: JSONSchema

  // ── Conditional (Draft-07+) ───────────────────────────────────────
  /** Conditional schema */
  readonly if?: JSONSchema
  /** Schema to apply when if matches */
  readonly then?: JSONSchema
  /** Schema to apply when if does not match */
  readonly else?: JSONSchema

  // ── OpenAPI Extensions ────────────────────────────────────────────
  /** Whether the value can be null (OpenAPI 3.0) */
  readonly nullable?: boolean
  /** Discriminator for polymorphic schemas (OpenAPI) */
  readonly discriminator?: {
    readonly propertyName?: string
    readonly mapping?: { readonly [k: string]: string }
  }
  /** XML representation metadata (OpenAPI) */
  readonly xml?: {
    readonly name?: string
    readonly namespace?: string
    readonly prefix?: string
    readonly attribute?: boolean
    readonly wrapped?: boolean
  }
  /** External documentation (OpenAPI) */
  readonly externalDocs?: {
    readonly url?: string
    readonly description?: string
  }

  // ── Vendor Extensions (x-*) ──────────────────────────────────────
  /** General error message */
  readonly 'x-error-message'?: string
  /** Pattern validation error message */
  readonly 'x-pattern-message'?: string
  /** Minimum constraint error message */
  readonly 'x-minimum-message'?: string
  /** Maximum constraint error message */
  readonly 'x-maximum-message'?: string
  /** Size constraint error message */
  readonly 'x-size-message'?: string
  /** MultipleOf constraint error message */
  'x-multipleOf-message'?: string
  /** oneOf combinator error message */
  readonly 'x-oneOf-message'?: string
  /** anyOf combinator error message */
  readonly 'x-anyOf-message'?: string
  /** allOf combinator error message */
  readonly 'x-allOf-message'?: string
  /** not combinator error message */
  readonly 'x-not-message'?: string
  /** propertyNames constraint error message */
  readonly 'x-propertyNames-message'?: string
  /** dependentRequired constraint error message */
  readonly 'x-dependentRequired-message'?: string
  /** Per-value enum error messages */
  readonly 'x-enum-error-messages'?: { readonly [k: string]: string }

  // ── Draft-04 Compatibility ────────────────────────────────────────
  /** Schema name (non-standard) */
  readonly name?: string
  /** Allow additional properties via index signature */
  readonly [k: string]: unknown
}
