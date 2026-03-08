import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSchemaFile, schemaToZod } from 'schema-to-library'

const fixturesDir = join(import.meta.dirname, '..')

const SPLIT_FIXTURES = ['split-refs', 'split-nested']

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'src' && d.name !== 'node_modules')
  .map((d) => d.name)

for (const name of fixtures) {
  const dir = join(fixturesDir, name)
  const inputPath = join(dir, 'input.json')
  const outputPath = join(dir, 'output.ts')

  if (SPLIT_FIXTURES.includes(name)) {
    const result = await parseSchemaFile(inputPath)
    if (!result.ok) {
      console.error(`${name}: ${result.error}`)
      continue
    }
    writeFileSync(outputPath, `${schemaToZod(result.value)}\n`)
  } else {
    const input = JSON.parse(readFileSync(inputPath, 'utf-8'))
    writeFileSync(outputPath, `${schemaToZod(input)}\n`)
  }

  console.log(`generated: ${name}/output.ts`)
}
