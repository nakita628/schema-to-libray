#!/usr/bin/env node
import { cli } from './cli/index.js'
import { schemaToEffect } from './generator/effect/index.js'

const HELP_TEXT = `Usage: schema-to-effect <input.{json,yaml}> -o <output.ts>

Options:
  --export-type              include type export in output
  --readonly                 generate readonly types
  --unsafe-code-extensions   [UNSAFE] enable code-emitting x-* extensions
                             (x-filter / x-transform / x-pipe); generated code
                             runs arbitrary expressions, trust your schema source
  -h, --help                 display help for command`

void cli(schemaToEffect, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
    return
  }
  console.error(result?.error)
  process.exit(1)
})
