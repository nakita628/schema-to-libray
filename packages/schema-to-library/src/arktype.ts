#!/usr/bin/env node
import { cli } from './cli/index.js'
import { schemaToArktype } from './generator/arktype/index.js'

const HELP_TEXT = `Usage: schema-to-arktype <input.{json,yaml}> -o <output.ts>

Options:
  --export-type        include type export in output
  -h, --help           display help for command`

void cli(schemaToArktype, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
  } else {
    console.error(result?.error)
  }
})
