import fsp from 'node:fs/promises'
import path from 'node:path'

import { fmt } from '../format/index.js'
import type { JSONSchema } from '../parser/index.js'
import { parseSchemaFile } from '../parser/index.js'

function validateIO(input: string | undefined, output: string | undefined) {
  if (typeof input !== 'string' || !(input.endsWith('.yaml') || input.endsWith('.json'))) {
    return { ok: false, error: 'Input must be a .json, or .yaml file' } as const
  }
  if (typeof output !== 'string' || !output.endsWith('.ts')) {
    return { ok: false, error: 'Output must be a .ts file' } as const
  }
  return { ok: true, input, output } as const
}

export async function cli(
  fn: (schema: JSONSchema, options?: { exportType?: boolean; readonly?: boolean }) => string,
  helpText: string,
) {
  const args = process.argv.slice(2)
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    return { ok: true, value: helpText } as const
  }
  const exportType = args.includes('--export-type')
  const readonlyMode = args.includes('--readonly')
  const filteredArgs = args.filter((arg) => arg !== '--export-type' && arg !== '--readonly')
  const i = filteredArgs[0]
  const oIdx = filteredArgs.indexOf('-o')
  const o = oIdx !== -1 ? filteredArgs[oIdx + 1] : undefined
  const valid = validateIO(i, o)
  if (!valid.ok) {
    return { ok: false, error: valid.error } as const
  }
  const { input, output } = valid
  const schemaResult = await parseSchemaFile(input)
  if (!schemaResult.ok) {
    return { ok: false, error: schemaResult.error } as const
  }
  const result = fn(schemaResult.value, { exportType, readonly: readonlyMode })
  const fmtResult = await fmt(result)
  if (!fmtResult.ok) {
    return { ok: false, error: fmtResult.error } as const
  }
  try {
    await fsp.mkdir(path.dirname(output), { recursive: true })
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    } as const
  }
  try {
    await fsp.writeFile(output, fmtResult.value, 'utf-8')
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    } as const
  }
  return { ok: true, value: `Generated: ${output}` } as const
}
