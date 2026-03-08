#!/usr/bin/env node
import { cli } from './cli/index.js'
import { schemaToValibot } from './valibot/index.js'

const HELP_TEXT = `Usage: schema-to-valibot <input.{json,yaml}> -o <output.ts>

Options:
  -h, --help           display help for command`

cli(schemaToValibot, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
  } else {
    console.error(result?.error)
  }
})
