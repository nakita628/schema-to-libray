#!/usr/bin/env node
import { cli } from './cli/index.js'
import { schemaToValibot } from './generator/valibot/index.js'

const HELP_TEXT = `Usage: schema-to-valibot <input.{json,yaml}> -o <output.ts>

Options:
  --export-type              include type export in output
  --readonly                 generate readonly types
  --unsafe-code-extensions   [UNSAFE] enable code-emitting x-* extensions
                             (x-check / x-transform / x-pipe); generated code
                             runs arbitrary expressions, trust your schema source
  -h, --help                 display help for command`

void cli(schemaToValibot, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
    return
  }
  console.error(result?.error)
  process.exit(1)
})
