#!/usr/bin/env node
import { cli } from './cli/index.js'
import { schemaToTypebox } from './generator/typebox/index.js'

const HELP_TEXT = `Usage: schema-to-typebox <input.{json,yaml}> -o <output.ts>

Options:
  --export-type   include type export in output
  --readonly      generate readonly types
  -h, --help      display help for command`

void cli(schemaToTypebox, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
    return
  }
  console.error(result?.error)
  process.exit(1)
})
