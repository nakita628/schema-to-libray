import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fmt, parseSchemaFile, schemaToZod } from 'schema-to-library'
import { describe, expect, it } from 'vite-plus/test'

const fixturesDir = join(import.meta.dirname, '..')

const SPLIT_FIXTURES = ['split-refs', 'split-nested']
const READONLY_FIXTURES = ['readonly']

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      d.name !== 'src' &&
      d.name !== 'node_modules' &&
      !SPLIT_FIXTURES.includes(d.name) &&
      !READONLY_FIXTURES.includes(d.name),
  )
  .map((d) => d.name)

describe('schemaToZod fixtures', () => {
  it.each(fixtures)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    const raw = schemaToZod(input)
    const fmtResult = await fmt(raw)
    expect(fmtResult.ok).toBe(true)
    if (fmtResult.ok) {
      expect(fmtResult.value).toBe(expected)
    }
  })
})

describe('schemaToZod readonly fixtures', () => {
  it.each(READONLY_FIXTURES)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const input = JSON.parse(readFileSync(join(dir, 'input.json'), 'utf-8'))
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')
    const raw = schemaToZod(input, { readonly: true })
    const fmtResult = await fmt(raw)
    expect(fmtResult.ok).toBe(true)
    if (fmtResult.ok) {
      expect(fmtResult.value).toBe(expected)
    }
  })
})

describe('schemaToZod split fixtures (parseSchemaFile + schemaToZod)', () => {
  it.each(SPLIT_FIXTURES)('%s', async (name) => {
    const dir = join(fixturesDir, name)
    const inputPath = join(dir, 'input.json')
    const expected = readFileSync(join(dir, 'output.ts'), 'utf-8')

    const result = await parseSchemaFile(inputPath)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const raw = schemaToZod(result.value)
      const fmtResult = await fmt(raw)
      expect(fmtResult.ok).toBe(true)
      if (fmtResult.ok) {
        expect(fmtResult.value).toBe(expected)
      }
    }
  })
})
