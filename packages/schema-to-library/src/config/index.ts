import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as v from 'valibot'

const ConfigSchema = v.object({
  input: v.custom<`${string}.yaml` | `${string}.json`>(
    (val) => typeof val === 'string' && (val.endsWith('.yaml') || val.endsWith('.json')),
    'Input must be a .json or .yaml file',
  ),
  output: v.custom<`${string}.ts`>(
    (val) => typeof val === 'string' && val.endsWith('.ts'),
    'Output must be a .ts file',
  ),
  // oxfmt format options
  format: v.optional(
    v.object({
      printWidth: v.optional(v.number()),
      tabWidth: v.optional(v.number()),
      useTabs: v.optional(v.boolean()),
      endOfLine: v.optional(v.union([v.literal('lf'), v.literal('crlf'), v.literal('cr')])),
      insertFinalNewline: v.optional(v.boolean()),
      semi: v.optional(v.boolean()),
      singleQuote: v.optional(v.boolean()),
      jsxSingleQuote: v.optional(v.boolean()),
      quoteProps: v.optional(
        v.union([v.literal('as-needed'), v.literal('consistent'), v.literal('preserve')]),
      ),
      trailingComma: v.optional(
        v.union([v.literal('all'), v.literal('es5'), v.literal('none')]),
      ),
      bracketSpacing: v.optional(v.boolean()),
      bracketSameLine: v.optional(v.boolean()),
      arrowParens: v.optional(v.union([v.literal('always'), v.literal('avoid')])),
      singleAttributePerLine: v.optional(v.boolean()),
    }),
  ),
})

type Config = v.InferOutput<typeof ConfigSchema>
type ConfigInput = v.InferInput<typeof ConfigSchema>

/**
 * Validates and parses a schema-to-library configuration object.
 */
export function parseConfig(
  config: unknown,
): { readonly ok: true; readonly value: Config } | { readonly ok: false; readonly error: string } {
  const result = v.safeParse(ConfigSchema, config)
  if (!result.success) {
    const issue = result.issues[0]
    const path = issue.path ? issue.path.map((p) => ('key' in p ? p.key : '')).join('.') : ''
    const prefix = path ? `${path}: ` : ''
    return { ok: false, error: `Invalid config: ${prefix}${issue.message}` }
  }
  return { ok: true, value: result.output }
}

/**
 * Reads and validates the configuration from schema-to-library.config.ts.
 */
export async function readConfig(): Promise<
  { readonly ok: true; readonly value: Config } | { readonly ok: false; readonly error: string }
> {
  const abs = resolve(process.cwd(), 'schema-to-library.config.ts')
  if (!existsSync(abs)) return { ok: false, error: `Config not found: ${abs}` }

  try {
    const url = pathToFileURL(abs).href
    const mod: { readonly default: unknown } = await import(/* @vite-ignore */ url)
    if (!('default' in mod) || mod.default === undefined) {
      return { ok: false, error: 'Config must export default object' }
    }
    return parseConfig(mod.default)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Helper to define a config with full type completion.
 */
export function defineConfig(config: ConfigInput) {
  return config
}
