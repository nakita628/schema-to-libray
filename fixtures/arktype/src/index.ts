import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { fmt, parseSchemaFile, schemaToArktype } from 'schema-to-library'

const fixturesDir = join(import.meta.dirname, '..')

const SPLIT_FIXTURES = ['split-refs', 'split-nested']
const READONLY_FIXTURES = ['readonly']

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'src' && d.name !== 'node_modules')
  .map((d) => d.name)

for (const name of fixtures) {
  const dir = join(fixturesDir, name)
  const inputPath = join(dir, 'input.json')
  const outputPath = join(dir, 'output.ts')

  let raw: string
  if (SPLIT_FIXTURES.includes(name)) {
    raw = schemaToArktype(await Effect.runPromise(parseSchemaFile(inputPath)))
  } else if (READONLY_FIXTURES.includes(name)) {
    const input = JSON.parse(readFileSync(inputPath, 'utf-8'))
    raw = schemaToArktype(input, { readonly: true })
  } else {
    const input = JSON.parse(readFileSync(inputPath, 'utf-8'))
    raw = schemaToArktype(input)
  }

  writeFileSync(outputPath, await Effect.runPromise(fmt(raw)))

  console.log(`generated: ${name}/output.ts`)
}
