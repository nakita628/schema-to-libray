#!/usr/bin/env node
import { cli } from './cli/index.js'
import { schemaToEffect } from './generator/effect/index.js'

const HELP_TEXT = `Usage: schema-to-effect <input.{json,yaml}> -o <output.ts>

Options:
  --export-type        include type export in output
  -h, --help           display help for command`

void cli(schemaToEffect, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
  } else {
    console.error(result?.error)
  }
})
