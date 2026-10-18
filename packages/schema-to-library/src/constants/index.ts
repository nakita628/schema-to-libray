/**
 * The values the generators agree on: every list of literals, every prefix and every
 * pattern that more than one module reads. Types that mirror a list are derived from it in
 * `parser/index.ts`, so adding a member here is the whole change.
 */

/**
 * The `type` values a JSON Schema node may carry, in the order the specification lists
 * them. `date` is not a JSON Schema type: it is the extension the generators accept for a
 * `Date`-typed value (Zod `z.date()`, Valibot `v.date()`).
 *
 * @see https://json-schema.org/understanding-json-schema/reference/type
 */
export const JSON_SCHEMA_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object',
  'null',
  'date',
] as const

/**
 * The `format` values a string node may carry: the JSON Schema built-ins, the OpenAPI
 * data-type formats, and the names the target libraries add (`uuidv7`, `cuid2`, `jwt`,
 * `hash`, ...). A format a target has no equivalent for is a no-op there.
 *
 * @see https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 * @see https://zod.dev/api#strings
 */
export const STRING_FORMATS = [
  // JSON Schema built-ins
  'date-time',
  'date',
  'time',
  'duration',
  'email',
  'idn-email',
  'hostname',
  'idn-hostname',
  'ipv4',
  'ipv6',
  'uri',
  'uri-reference',
  'iri',
  'iri-reference',
  'uuid',
  'uri-template',
  'json-pointer',
  'relative-json-pointer',
  'regex',
  // OpenAPI 3.0 data types
  'binary',
  'byte',
  'password',
  // Library extensions (Zod-aligned names)
  'url',
  'httpUrl',
  'uuidv4',
  'uuidv6',
  'uuidv7',
  'guid',
  'emoji',
  'base64',
  'base64url',
  'hex',
  'nanoid',
  'cuid',
  'cuid2',
  'ulid',
  'ksuid',
  'xid',
  'ip',
  'cidrv4',
  'cidrv6',
  'mac',
  'jwt',
  'hash',
  'e164',
  'creditCard',
  'iban',
  'currencyCode',
  // Transform formats: the value is normalised rather than checked
  'toLowerCase',
  'toUpperCase',
  'trim',
  'slugify',
] as const

/**
 * The `format` values a numeric node may carry: the OpenAPI data-type formats plus the
 * widths the target libraries distinguish (`int32`, `float32`, `bigint`, ...).
 *
 * @see https://spec.openapis.org/oas/v3.1.0#data-types
 */
export const NUMBER_FORMATS = [
  'int32',
  'uint32',
  'int64',
  'uint64',
  'bigint',
  'float',
  'float32',
  'float64',
  'double',
  'decimal',
] as const

/**
 * The `contentEncoding` values of a string node.
 *
 * @see https://json-schema.org/draft/2020-12/json-schema-validation#section-8.3
 */
export const CONTENT_ENCODINGS = [
  'base64',
  'base64url',
  'binary',
  '7bit',
  '8bit',
  'quoted-printable',
] as const

/**
 * The OpenAPI parameter locations. `query` and `path` are string-wire: a primitive schema
 * emitted under one of them is coerced from a string.
 *
 * @see https://spec.openapis.org/oas/v3.2.0.html#parameter-object
 */
export const PARAM_LOCATIONS = ['query', 'path', 'header', 'cookie'] as const

/** The parameter locations whose values arrive as strings and are coerced. */
export const STRING_WIRE_LOCATIONS = ['query', 'path'] as const

/**
 * The keywords that hold a document's named definitions: `$defs` since Draft 2019-09, and
 * `definitions` before it. A document may use both, and the generators read them as one map.
 */
export const DEFINITION_KEYWORDS = ['definitions', '$defs'] as const

/** The `$ref` spellings of the whole document: the schema being emitted refers to itself. */
export const ROOT_REFS = ['#', ''] as const

/** The `$ref` prefixes under which a named definition is found. */
export const DEFINITION_REF_PREFIXES = [
  '#/components/schemas/',
  '#/definitions/',
  '#/$defs/',
] as const

/** The `$ref` prefix of an OpenAPI component schema. */
export const COMPONENT_SCHEMA_REF_PREFIX = '#/components/schemas/'

/**
 * The variable-name suffix of each OpenAPI component kind, by its `$ref` prefix.
 *
 * @see https://swagger.io/docs/specification/v3_0/components/
 */
export const OPENAPI_COMPONENT_SUFFIX_MAP: readonly {
  readonly prefix: string
  readonly suffix: string
}[] = [
  { prefix: '#/components/schemas/', suffix: 'Schema' },
  { prefix: '#/components/parameters/', suffix: 'ParamsSchema' },
  { prefix: '#/components/headers/', suffix: 'HeaderSchema' },
  { prefix: '#/components/securitySchemes/', suffix: 'SecurityScheme' },
  { prefix: '#/components/requestBodies/', suffix: 'RequestBody' },
  { prefix: '#/components/responses/', suffix: 'Response' },
  { prefix: '#/components/examples/', suffix: 'Example' },
  { prefix: '#/components/links/', suffix: 'Link' },
  { prefix: '#/components/callbacks/', suffix: 'Callback' },
  { prefix: '#/components/pathItems/', suffix: 'PathItem' },
  { prefix: '#/components/mediaTypes/', suffix: 'MediaTypeSchema' },
]

/** The name a root schema is exported under when the document has no `title`. */
export const DEFAULT_ROOT_NAME = 'Schema'

/** The extensions of an input document: a JSON Schema as JSON or YAML. */
export const INPUT_EXTENSIONS = ['.json', '.yaml'] as const

/** The extension of the generated file. */
export const OUTPUT_EXTENSION = '.ts'

/** A JavaScript identifier that can be written bare: as a binding, or a key or member access. */
export const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/u

/**
 * A message option written as an arrow function, `(issue) => ...`, rather than as text.
 * Such a message is spliced into the generated code as an expression instead of a string.
 */
export const ARROW_FUNCTION_PATTERN = /^\s*\(.*?\)\s*=>/u

/**
 * A regular expression that needs the `u` flag: Unicode property escapes (`\p{...}`,
 * `\P{...}`) and brace code points (`\u{...}`), which TypeScript rejects without it (TS1530).
 */
export const UNICODE_ESCAPE_PATTERN = /\\[pP]\{|\\u\{/u

/** A non-ASCII character, which an identifier cannot carry as is. */
export const NON_IDENTIFIER_CHARACTER_PATTERN = /[^A-Za-z0-9_-]/u

/** A character that breaks a string-DSL literal and the JS string around it. */
export const QUOTE_OR_BACKSLASH_PATTERN = /['"\\]/u

/** The code-emitting extensions each target honours, in the order they are chained. */
export const ZOD_CODE_EXTENSION_KEYS = [
  'x-refine',
  'x-transform',
  'x-pipe',
  'x-codec',
  'x-preprocess',
] as const

export const VALIBOT_CODE_EXTENSION_KEYS = ['x-check', 'x-transform', 'x-pipe'] as const

export const EFFECT_CODE_EXTENSION_KEYS = ['x-filter', 'x-transform', 'x-pipe'] as const

export const ARKTYPE_CODE_EXTENSION_KEYS = ['x-narrow', 'x-morph', 'x-pipe'] as const

/** Every code-emitting extension any target honours, deduplicated and sorted. */
export const ALL_CODE_EXTENSION_KEYS: readonly string[] = [
  ...new Set<string>([
    ...ZOD_CODE_EXTENSION_KEYS,
    ...VALIBOT_CODE_EXTENSION_KEYS,
    ...EFFECT_CODE_EXTENSION_KEYS,
    ...ARKTYPE_CODE_EXTENSION_KEYS,
  ]),
].toSorted()

/** The first line of a file that spliced a caller-supplied code extension into its source. */
export const UNSAFE_GENERATED_MARKER = '// @generated-with-unsafe-code-extensions'

/** The first line of a file whose generator dropped `if` / `then` / `else`. */
export const IF_THEN_ELSE_UNSUPPORTED_MARKER =
  '// FIXME: JSON Schema if/then/else is not yet supported by this generator; conditional validation is omitted'

/** The first line of a TypeBox file whose generator dropped a `not` keyword. */
export const NOT_KEYWORD_UNSUPPORTED_MARKER =
  '// FIXME: JSON Schema `not` is not enforced by this generator; TypeBox v1 has no runtime `Type.Not` and `Value.Check` ignores the keyword (falls back to `Type.Any()`)'

/** The comment left where a `$ref` names a definition the document does not hold. */
export const MISSING_DEFINITION_PREFIX = '// ⚠️ missing definition for '

/** A JSON Pointer `$ref` to a named definition: `#/$defs/Name` or `#/definitions/Name`. */
export const DEFINITION_POINTER_PATTERN = /^#\/(?:definitions|\$defs)\/(?<name>[^/]+)$/u

/** The Draft-04 anchor shorthand for a named definition: `#Name`. */
export const ANCHOR_REF_PATTERN = /^#(?<name>[^/]+)$/u
