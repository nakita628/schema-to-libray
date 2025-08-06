#!/usr/bin/env node
import { cli } from './cli/index.js'
import { schemaToZod } from './zod/index.js'

/**
 * Help text displayed when --help is used
 */
const HELP_TEXT = `Usage: schema-to-zod <input.{json,yaml}> -o <output.ts>

Options:
  -h, --help           display help for command`

/**
 * Main entry point for the schema-to-zod CLI tool
 *
 * Processes command line arguments and generates Zod schemas from JSON Schema files
 */
cli(schemaToZod, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
  } else {
    console.error(result?.error)
  }
})
