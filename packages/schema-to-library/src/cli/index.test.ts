import fsp from 'node:fs/promises'
import { afterEach, beforeEach } from 'node:test'
import { describe, expect, it, vi } from 'vitest'
import type { JSONSchema } from '../types/index.js'
import { cli } from './index.js'

// Test run
// pnpm vitest run ./src/cli/index.test.ts

const mockMkdir = vi.spyOn(fsp, 'mkdir')
const mockWriteFile = vi.spyOn(fsp, 'writeFile')

beforeEach(() => {
  mockMkdir.mockReset()
  mockWriteFile.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const dummyFn = (schema: JSONSchema) => `export const Schema = ${JSON.stringify(schema, null, 2)}`

describe('cli()', () => {
  it('should return help text when --help is passed', async () => {
    process.argv = ['node', 'cli.js', '--help']
    const result = await cli(dummyFn, 'This is help text.')
    expect(result).toStrictEqual({ ok: true, value: 'This is help text.' })
  })

  it('should fail on invalid input file extension', async () => {
    process.argv = ['node', 'cli.js', 'invalid.txt', '-o', 'output.ts']
    const result = await cli(dummyFn, 'help')
    expect(result).toStrictEqual({ ok: false, error: 'Input must be a .json, or .yaml file' })
  })

  it('should fail on missing output flag', async () => {
    process.argv = ['node', 'cli.js', 'input.json']
    const result = await cli(dummyFn, 'help')
    expect(result).toStrictEqual({ ok: false, error: 'Output must be a .ts file' })
  })

  it('should return help text when -h is passed', async () => {
    process.argv = ['node', 'cli.js', '-h']
    const result = await cli(dummyFn, 'Help text here.')
    expect(result).toStrictEqual({ ok: true, value: 'Help text here.' })
  })
})
