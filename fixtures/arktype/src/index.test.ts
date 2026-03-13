import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fmt, parseSchemaFile, schemaToArktype } from 'schema-to-library'

const fixturesDir = join(import.meta.dirname, '..')

const SPLIT_FIXTURES = ['split-refs', 'split-nested']

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      d.name !== 'src' &&
      d.name !== 'node_modules' &&
      !SPLIT_FIXTURES.includes(d.name),
  )
  .map((d) => d.name)

describe('schemaToArktype fixtures', () => {
  it.each(fixtures)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    const raw = schemaToArktype(input)
    const fmtResult = await fmt(raw)
    expect(fmtResult.ok).toBe(true)
    if (fmtResult.ok) {
      expect(fmtResult.value).toBe(expected)
    }
  })
})

describe('schemaToArktype split fixtures (parseSchemaFile + schemaToArktype)', () => {
  it.each(SPLIT_FIXTURES)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const inputPath = join(dir, 'input.json')
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')

    const result = await parseSchemaFile(inputPath)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const raw = schemaToArktype(result.value)
      const fmtResult = await fmt(raw)
      expect(fmtResult.ok).toBe(true)
      if (fmtResult.ok) {
        expect(fmtResult.value).toBe(expected)
      }
    }
  })
})
