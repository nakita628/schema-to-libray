#!/usr/bin/env node
import { cli } from './cli/index.js'
import { schemaToEffect } from './generator/effect/index.js'

const HELP_TEXT = `Usage: schema-to-effect <input.{json,yaml}> -o <output.ts>

Options:
  -h, --help           display help for command`

cli(schemaToEffect, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
  } else {
    console.error(result?.error)
  }
})
