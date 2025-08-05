import fsp from 'node:fs/promises'
import path from 'node:path'
import { format } from 'prettier'
import * as v from 'valibot'
import { parse } from 'yaml'

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

const IsYAMLSchema = v.custom<`${string}.yaml`>(
  (value) => typeof value === 'string' && value.endsWith('.yaml'),
  'Must end with .yaml',
)

const IsJSONSchema = v.custom<`${string}.json`>(
  (value) => typeof value === 'string' && value.endsWith('.json'),
  'Must end with .json',
)

export async function cli(fn: (schema: Schema, rootName?: string) => string, helpText: string) {
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
    value: `${output} created`,
  }
}

async function parseSchema(i: `${string}.yaml` | `${string}.json`) {
  if (i.endsWith('.yaml')) {
    const valid = v.safeParse(IsYAMLSchema, i)
    if (!valid.success) {
      return {
        ok: false,
        error: valid.issues.map((issue) => issue.message)[0],
      }
    }
    const input = valid.output

    const file = await readFile(input)
    if (!file.ok) {
      return {
        ok: false,
        error: file.error,
      }
    }

    const yaml = parseYaml(file.value)
    if (!yaml.ok) {
      return {
        ok: false,
        error: yaml.error,
      }
    }

    return {
      ok: true,
      value: yaml.value,
    }
  }
  if (i.endsWith('.json')) {
    const valid = v.safeParse(IsJSONSchema, i)
    if (!valid.success) {
      return {
        ok: false,
        error: valid.issues.map((issue) => issue.message)[0],
      }
    }
    const input = valid.output

    const file = await readFile(input)
    if (!file.ok) {
      return {
        ok: false,
        error: file.error,
      }
    }

    return {
      ok: true,
      value: JSON.parse(file.value),
    }
  }
  return {
    ok: false,
    error: 'Invalid input file type',
  }
}

// parseYaml
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
    const yaml = parse(i)
    return {
      ok: true,
      value: yaml,
    }
  } catch (e) {
    return {
      ok: false,
      error: String(e),
    }
  }
}

// readFile
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
    const res = await fsp.readFile(path, 'utf-8')
    return { ok: true, value: res }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Formats TypeScript source with Prettier.
 *
 * @param code - Source code to format.
 * @returns A `Result` containing the formatted code or an error message.
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
      printWidth: 100,
      singleQuote: true,
      semi: false,
    })
    return { ok: true, value: formatted }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Creates a directory if it does not already exist.
 *
 * @param dir - Directory path to create.
 * @returns A `Result` that is `ok` on success, otherwise an error message.
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
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Writes UTF-8 text to a file, creating it if necessary.
 *
 * @param path - File path to write.
 * @param data - Text data to write.
 * @returns A `Result` that is `ok` on success, otherwise an error message.
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
    return { ok: true, value: undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

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

type Type = v.InferInput<typeof TypeSchema>

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

type Format = v.InferInput<typeof FormatSchema>

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

export type Schema = v.InferInput<typeof Schema>
