#!/usr/bin/env node
import { cli } from '@schema-to-library/cli'
import { schemaToZod } from '../../zod/src/index.js'

const HELP_TEXT = `Usage: schema-to-zod <input.{json,yaml}> -o <output.ts>

Options:
  -h, --help           display help for command`

cli(schemaToZod, HELP_TEXT).then((result) => {
  if (result?.ok) {
    console.log(result.value)
  } else {
    console.error(result?.error)
  }
})
