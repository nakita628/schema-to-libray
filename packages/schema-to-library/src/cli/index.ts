import fsp from 'node:fs/promises'
import path from 'node:path'
import { format } from 'prettier'
import * as v from 'valibot'
import { parse } from 'yaml'

/**
 * Schema for validating input/output file paths
 */
const IOSchema = v.object({
  input: v.custom<`${string}.yaml` | `${string}.json`>(
    (value) => typeof value === 'string' && (value.endsWith('.yaml') || value.endsWith('.json')),
    'Input must be a .json, or .yaml file',
  ),
  output: v.custom<`${string}.ts`>(
    (value) => typeof value === 'string' && value.endsWith('.ts'),
    'Output must be a .ts file',
  ),
})

/**
 * Schema for validating YAML file paths
 */
const IsYAMLSchema = v.custom<`${string}.yaml`>(
  (value) => typeof value === 'string' && value.endsWith('.yaml'),
  'Must end with .yaml',
)

/**
 * Schema for validating JSON file paths
 */
const IsJSONSchema = v.custom<`${string}.json`>(
  (value) => typeof value === 'string' && value.endsWith('.json'),
  'Must end with .json',
)

/**
 * Schema generator function type
 */
type SchemaGenerator = (schema: Schema, rootName?: string) => string

/**
 * CLI result type
 */
type CLIResult =
  | {
      ok: true
      value: string
    }
  | {
      ok: false
      error: string
    }

/**
 * Main CLI function that processes schema files and generates output
 *
 * @param fn - Schema generator function
 * @param helpText - Help text to display when --help is used
 * @returns Promise resolving to CLI result
 */
export async function cli(fn: SchemaGenerator, helpText: string): Promise<CLIResult> {
  // Slice the arguments to remove the first two (node and script path)
  const args = process.argv.slice(2)

  const isHelpRequested = (args: readonly string[]): boolean => {
    return args.length === 1 && (args[0] === '--help' || args[0] === '-h')
  }

  if (isHelpRequested(args)) {
    return {
      ok: true,
      value: helpText,
    }
  }

  const i = args[0]
  const oIdx = args.indexOf('-o')
  const o = oIdx !== -1 ? args[oIdx + 1] : undefined

  const valid = v.safeParse(IOSchema, {
    input: i,
    output: o,
  })

  if (!valid.success) {
    return {
      ok: false,
      error: valid.issues.map((issue) => issue.message)[0],
    }
  }

  const { input, output } = valid.output

  const schemaResult = await parseSchema(input)
  if (!schemaResult.ok) {
    return {
      ok: false,
      error: schemaResult.error,
    }
  }

  const schemaValid = v.safeParse(Schema, schemaResult.value)
  if (!schemaValid.success) {
    return {
      ok: false,
      error: schemaValid.issues.map((issue) => issue.message)[0],
    }
  }

  const schema = schemaValid.output

  const result = fn(schema)
  const fmtResult = await fmt(result)
  if (!fmtResult.ok) {
    return {
      ok: false,
      error: fmtResult.error,
    }
  }

  const mkdirResult = await mkdir(path.dirname(output))
  if (!mkdirResult.ok) {
    return {
      ok: false,
      error: mkdirResult.error,
    }
  }

  const writeFileResult = await writeFile(output, fmtResult.value)
  if (!writeFileResult.ok) {
    return {
      ok: false,
      error: writeFileResult.error,
    }
  }

  return {
    ok: true,
    value: `Generated: ${output}`,
  }
}

/**
 * Parse schema from file (JSON or YAML)
 *
 * @param i - Input file path
 * @returns Promise resolving to parse result
 */
async function parseSchema(i: `${string}.yaml` | `${string}.json`): Promise<
  | {
      ok: true
      value: unknown
    }
  | {
      ok: false
      error: string
    }
> {
  const readResult = await readFile(i)
  if (!readResult.ok) {
    return {
      ok: false,
      error: readResult.error,
    }
  }

  const content = readResult.value

  if (i.endsWith('.yaml') || i.endsWith('.yml')) {
    return parseYaml(content)
  }

  try {
    const parsed = JSON.parse(content)
    return {
      ok: true,
      value: parsed,
    }
  } catch (error) {
    return {
      ok: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Parse YAML content
 *
 * @param i - YAML content string
 * @returns Parse result
 */
export function parseYaml(i: string):
  | {
      ok: true
      value: unknown
    }
  | {
      ok: false
      error: string
    } {
  try {
    const parsed = parse(i)
    return {
      ok: true,
      value: parsed,
    }
  } catch (error) {
    return {
      ok: false,
      error: `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Read file content
 *
 * @param path - File path to read
 * @returns Promise resolving to read result
 */
async function readFile(path: string): Promise<
  | {
      ok: false
      error: string
    }
  | {
      ok: true
      value: string
    }
> {
  try {
    const content = await fsp.readFile(path, 'utf-8')
    return {
      ok: true,
      value: content,
    }
  } catch (error) {
    return {
      ok: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Format code using Prettier
 *
 * @param code - Code to format
 * @returns Promise resolving to format result
 */
async function fmt(code: string): Promise<
  | {
      ok: true
      value: string
      error?: undefined
    }
  | {
      ok: false
      error: string
      value?: undefined
    }
> {
  try {
    const formatted = await format(code, {
      parser: 'typescript',
      semi: false,
      singleQuote: true,
      trailingComma: 'es5',
    })
    return {
      ok: true,
      value: formatted,
    }
  } catch (error) {
    return {
      ok: false,
      error: `Failed to format code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Create directory if it doesn't exist
 *
 * @param dir - Directory path to create
 * @returns Promise resolving to mkdir result
 */
async function mkdir(dir: string): Promise<
  | {
      ok: false
      error: string
    }
  | {
      ok: true
      value: undefined
    }
> {
  try {
    await fsp.mkdir(dir, { recursive: true })
    return {
      ok: true,
      value: undefined,
    }
  } catch (error) {
    return {
      ok: false,
      error: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Write file with content
 *
 * @param path - File path to write
 * @param data - Content to write
 * @returns Promise resolving to write result
 */
async function writeFile(
  path: string,
  data: string,
): Promise<
  | {
      ok: true
      value: undefined
    }
  | {
      ok: false
      error: string
    }
> {
  try {
    await fsp.writeFile(path, data, 'utf-8')
    return {
      ok: true,
      value: undefined,
    }
  } catch (error) {
    return {
      ok: false,
      error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Schema for validating JSON Schema type values
 */
const TypeSchema = v.union([
  v.literal('string'),
  v.literal('number'),
  v.literal('integer'),
  v.literal('date'),
  v.literal('boolean'),
  v.literal('array'),
  v.literal('object'),
  v.literal('null'),
])

/**
 * JSON Schema type values
 */
type Type = v.InferInput<typeof TypeSchema>

/**
 * Schema for validating JSON Schema format values
 */
export const FormatSchema = v.union([
  v.literal('email'),
  v.literal('uuid'),
  v.literal('uuidv4'),
  v.literal('uuidv6'),
  v.literal('uuidv7'),
  v.literal('uri'),
  v.literal('emoji'),
  v.literal('base64'),
  v.literal('base64url'),
  v.literal('nanoid'),
  v.literal('cuid'),
  v.literal('cuid2'),
  v.literal('ulid'),
  v.literal('ip'),
  v.literal('ipv4'),
  v.literal('ipv6'),
  v.literal('cidrv4'),
  v.literal('cidrv6'),
  v.literal('date'),
  v.literal('time'),
  v.literal('date-time'),
  v.literal('duration'),
  v.literal('binary'),
  v.literal('toLowerCase'),
  v.literal('toUpperCase'),
  v.literal('trim'),
  v.literal('jwt'),
  v.literal('int32'),
  v.literal('int64'),
  v.literal('bigint'),
  v.literal('float'),
  v.literal('float32'),
  v.literal('float64'),
  v.literal('double'),
  v.literal('decimal'),
])

/**
 * JSON Schema format values
 */
type Format = v.InferInput<typeof FormatSchema>

/**
 * JSON Schema object type definition
 */
type SchemaType = {
  title?: string
  definitions?: Record<string, SchemaType>
  $defs?: Record<string, SchemaType>
  name?: string
  description?: string
  type?: Type | [Type, ...Type[]]
  format?: Format
  pattern?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number | boolean
  exclusiveMaximum?: number | boolean
  multipleOf?: number
  minItems?: number
  maxItems?: number
  default?: unknown
  example?: unknown
  examples?: unknown[]
  properties?: Record<string, SchemaType>
  required?: string[] | boolean
  items?: SchemaType
  enum?: (string | number | boolean | null | (string | number | boolean | null)[])[]
  nullable?: boolean
  additionalProperties?: SchemaType | boolean
  $ref?: string
  xml?: {
    name?: string
    wrapped?: boolean
  }
  oneOf?: SchemaType[]
  allOf?: SchemaType[]
  anyOf?: SchemaType[]
  not?: SchemaType
  discriminator?: {
    propertyName?: string
  }
  externalDocs?: {
    url?: string
  }
  const?: unknown
}

/**
 * Schema for validating JSON Schema objects
 */
const Schema: v.GenericSchema<SchemaType> = v.looseObject({
  title: v.optional(v.string()),
  definitions: v.optional(
    v.record(
      v.string(),
      v.lazy(() => Schema),
    ),
  ),
  $defs: v.optional(
    v.record(
      v.string(),
      v.lazy(() => Schema),
    ),
  ),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  type: v.optional(v.union([TypeSchema, v.tuple([TypeSchema])])),
  format: v.optional(FormatSchema),
  pattern: v.optional(v.string()),
  minLength: v.optional(v.number()),
  maxLength: v.optional(v.number()),
  minimum: v.optional(v.number()),
  maximum: v.optional(v.number()),
  exclusiveMinimum: v.optional(v.union([v.number(), v.boolean()])),
  exclusiveMaximum: v.optional(v.union([v.number(), v.boolean()])),
  multipleOf: v.optional(v.number()),
  minItems: v.optional(v.number()),
  maxItems: v.optional(v.number()),
  default: v.optional(v.unknown()),
  example: v.optional(v.unknown()),
  examples: v.optional(v.array(v.unknown())),
  properties: v.optional(
    v.record(
      v.string(),
      v.lazy(() => Schema),
    ),
  ),
  required: v.optional(v.union([v.array(v.string()), v.boolean()])),
  items: v.optional(v.lazy(() => Schema)),
  enum: v.optional(
    v.array(
      v.union([
        v.string(),
        v.number(),
        v.boolean(),
        v.null(),
        v.array(v.union([v.string(), v.number(), v.boolean(), v.null()])),
      ]),
    ),
  ),
  nullable: v.optional(v.boolean()),
  additionalProperties: v.optional(v.union([v.lazy(() => Schema), v.boolean()])),
  $ref: v.optional(v.string()),
  xml: v.optional(
    v.object({
      name: v.optional(v.string()),
      wrapped: v.optional(v.boolean()),
    }),
  ),
  oneOf: v.optional(v.array(v.lazy(() => Schema))),
  allOf: v.optional(v.array(v.lazy(() => Schema))),
  anyOf: v.optional(v.array(v.lazy(() => Schema))),
  not: v.optional(v.lazy(() => Schema)),
  discriminator: v.optional(
    v.object({
      propertyName: v.optional(v.string()),
    }),
  ),
  externalDocs: v.optional(
    v.object({
      url: v.optional(v.string()),
    }),
  ),
  const: v.optional(v.unknown()),
})

/**
 * JSON Schema type for validation and processing
 */
export type Schema = v.InferInput<typeof Schema>
