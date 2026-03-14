import fsp from 'node:fs/promises'
import path from 'node:path'
import { fmt } from '../format/index.js'
import { parseSchemaFile } from '../parser/index.js'
import type { JSONSchema } from '../helper/index.js'

function validateIO(
  input: string | undefined,
  output: string | undefined,
): { ok: true; input: string; output: string } | { ok: false; error: string } {
  if (typeof input !== 'string' || !(input.endsWith('.yaml') || input.endsWith('.json'))) {
    return { ok: false, error: 'Input must be a .json, or .yaml file' }
  }
  if (typeof output !== 'string' || !output.endsWith('.ts')) {
    return { ok: false, error: 'Output must be a .ts file' }
  }
  return { ok: true, input, output }
}

type SchemaGenerator = (schema: JSONSchema, options?: { exportType?: boolean }) => string

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

  const exportType = args.includes('--export-type')
  const filteredArgs = args.filter((arg) => arg !== '--export-type')

  const i = filteredArgs[0]
  const oIdx = filteredArgs.indexOf('-o')
  const o = oIdx !== -1 ? filteredArgs[oIdx + 1] : undefined

  const valid = validateIO(i, o)
  if (!valid.ok) {
    return { ok: false, error: valid.error }
  }

  const { input, output } = valid

  const schemaResult = await parseSchemaFile(input)
  if (!schemaResult.ok) {
    return { ok: false, error: schemaResult.error }
  }

  const result = fn(schemaResult.value, { exportType })
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
