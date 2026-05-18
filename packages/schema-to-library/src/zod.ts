#!/usr/bin/env node
import { cli } from './cli/index.js'
import { schemaToZod } from './generator/zod/index.js'

/**
 * Help text displayed when --help is used
 */
const HELP_TEXT = `Usage: schema-to-zod <input.{json,yaml}> -o <output.ts>

Options:
  --export-type              include type export in output
  --readonly                 generate readonly types
  --unsafe-code-extensions   [UNSAFE] enable code-emitting x-* extensions
                             (x-refine / x-transform / x-pipe / x-codec /
                             x-preprocess); generated code runs arbitrary
                             expressions, trust your schema source
  -h, --help                 display help for command`

/**
 * Main entry point for the schema-to-zod CLI tool
 *
 * Processes command line arguments and generates Zod schemas from JSON Schema files
 */
void cli(schemaToZod, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
    return
  }
  console.error(result?.error)
  process.exit(1)
})
