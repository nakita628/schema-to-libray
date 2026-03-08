import fsp from 'node:fs/promises'
import path from 'node:path'
import * as v from 'valibot'
import { fmt } from '../format/index.js'
import { parseSchemaFile } from '../parser/index.js'
import type { JSONSchema } from '../types/index.js'

/**
 * Schema for validating CLI input/output file paths
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

type SchemaGenerator = (schema: JSONSchema, rootName?: string) => string

/**
 * Main CLI function that processes schema files and generates output
 */
export async function cli(
  fn: SchemaGenerator,
  helpText: string,
): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  const args = process.argv.slice(2)

  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    return { ok: true, value: helpText }
  }

  const i = args[0]
  const oIdx = args.indexOf('-o')
  const o = oIdx !== -1 ? args[oIdx + 1] : undefined

  const valid = v.safeParse(IOSchema, { input: i, output: o })
  if (!valid.success) {
    return { ok: false, error: valid.issues.map((issue) => issue.message)[0] }
  }

  const { input, output } = valid.output

  const schemaResult = await parseSchemaFile(input)
  if (!schemaResult.ok) {
    return { ok: false, error: schemaResult.error }
  }

  const result = fn(schemaResult.value)
  const fmtResult = await fmt(result)
  if (!fmtResult.ok) {
    return { ok: false, error: fmtResult.error }
  }

  try {
    await fsp.mkdir(path.dirname(output), { recursive: true })
  } catch (error) {
    return {
      ok: false,
      error: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  try {
    await fsp.writeFile(output, fmtResult.value, 'utf-8')
  } catch (error) {
    return {
      ok: false,
      error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  return { ok: true, value: `Generated: ${output}` }
}
