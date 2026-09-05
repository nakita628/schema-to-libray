import { bundle } from '@apidevtools/json-schema-ref-parser'
import { Data, Effect } from 'effect'

import type { XExtCode } from './x-ext/code.js'
import type { XExtMessages } from './x-ext/messages.js'
import type { XExtTransform } from './x-ext/transform.js'

export type { XExtCode } from './x-ext/code.js'
export type { XExtMessages } from './x-ext/messages.js'
export type { XExtTransform } from './x-ext/transform.js'
export type { ParamIn } from './x-ext/param.js'

/** The document could not be bundled as a JSON Schema. */
export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string
}> {}

/** The bundled document at `input`. Failures land in the error channel. */
export function parseSchemaFile(input: string) {
  return Effect.tryPromise({
    try: () => bundle<JSONSchema>(input),
    catch: (error) =>
      new ParseError({
        message: `Failed to parse schema: ${error instanceof Error ? error.message : String(error)}`,
      }),
  })
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
type JSONSchemaCore = {
  readonly $schema?: string
  readonly $id?: string
  readonly $ref?: string
  readonly $comment?: string
  readonly $vocabulary?: { readonly [k: string]: boolean }
  readonly $anchor?: string
  /** Dynamic anchor (Draft 2020-12) */
  readonly $dynamicAnchor?: string
  /** Dynamic reference (Draft 2020-12) */
  readonly $dynamicRef?: string
  /** Schema definitions (Draft 2020-12 / Draft 2019-09) */
  readonly $defs?: { readonly [k: string]: JSONSchema }
  /** Schema definitions (Draft-07 and earlier) */
  readonly definitions?: { readonly [k: string]: JSONSchema }

  readonly title?: string
  readonly description?: string
  readonly default?: unknown
  /** Example values (Draft 2019-09+) */
  readonly examples?: readonly unknown[]
  /** Single example value (OpenAPI) */
  readonly example?: unknown
  readonly deprecated?: boolean
  readonly readOnly?: boolean
  readonly writeOnly?: boolean

  readonly type?: JSONSchemaType | readonly JSONSchemaType[]
  readonly format?: JSONSchemaFormat | (string & {})
  readonly const?: unknown
  readonly enum?: readonly unknown[]

  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
  readonly contentMediaType?: string
  readonly contentEncoding?: string
  readonly contentSchema?: JSONSchema

  readonly minimum?: number
  readonly maximum?: number
  /** Exclusive minimum (Draft 2020-12: number, Draft-04: boolean) */
  readonly exclusiveMinimum?: number | boolean
  /** Exclusive maximum (Draft 2020-12: number, Draft-04: boolean) */
  readonly exclusiveMaximum?: number | boolean
  readonly multipleOf?: number

  readonly properties?: { readonly [k: string]: JSONSchema }
  readonly required?: readonly string[]
  readonly additionalProperties?: boolean | JSONSchema
  readonly patternProperties?: { readonly [k: string]: JSONSchema }
  readonly propertyNames?: JSONSchema
  readonly minProperties?: number
  readonly maxProperties?: number
  /** Dependent required properties (Draft 2019-09+) */
  readonly dependentRequired?: { readonly [k: string]: readonly string[] }
  /** Dependent schemas (Draft 2019-09+) */
  readonly dependentSchemas?: { readonly [k: string]: JSONSchema }
  /** Unevaluated properties (Draft 2019-09+) */
  readonly unevaluatedProperties?: boolean | JSONSchema

  readonly items?: JSONSchema
  /** Positional item schemas (Draft 2020-12) */
  readonly prefixItems?: readonly JSONSchema[]
  readonly contains?: JSONSchema
  readonly minItems?: number
  readonly maxItems?: number
  readonly uniqueItems?: boolean
  /** Minimum number of contains matches (Draft 2019-09+) */
  readonly minContains?: number
  /** Maximum number of contains matches (Draft 2019-09+) */
  readonly maxContains?: number
  /** Unevaluated items (Draft 2019-09+) */
  readonly unevaluatedItems?: boolean | JSONSchema

  readonly allOf?: readonly JSONSchema[]
  readonly anyOf?: readonly JSONSchema[]
  readonly oneOf?: readonly JSONSchema[]
  readonly not?: JSONSchema

  readonly if?: JSONSchema
  readonly then?: JSONSchema
  readonly else?: JSONSchema

  /** Whether the value can be null (OpenAPI 3.0) */
  readonly nullable?: boolean
  readonly discriminator?: {
    readonly propertyName?: string
    readonly mapping?: { readonly [k: string]: string }
  }
  readonly xml?: {
    readonly name?: string
    readonly namespace?: string
    readonly prefix?: string
    readonly attribute?: boolean
    readonly wrapped?: boolean
  }
  readonly externalDocs?: {
    readonly url?: string
    readonly description?: string
  }

  /** Schema name (non-standard) */
  readonly name?: string
  readonly [k: string]: unknown
}

export type JSONSchema = JSONSchemaCore & XExtMessages & XExtTransform & XExtCode
