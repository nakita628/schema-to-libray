import fsp from 'node:fs/promises'
import { afterEach, beforeEach } from 'node:test'
import { describe, expect, it, vi } from 'vitest'
import type { Schema } from './index.js'
import { cli } from './index.js'

// Test run
// pnpm vitest run ./privates/cli/src/index.test.ts

const mockReadFile = vi.spyOn(fsp, 'readFile')
const mockWriteFile = vi.spyOn(fsp, 'writeFile')
const mockMkdir = vi.spyOn(fsp, 'mkdir')

const exampleSchema: Schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
  },
  required: ['name'],
}

const jsonPath = 'test-schema.json'
const tsPath = 'output.ts'

beforeEach(() => {
  mockReadFile.mockReset()
  mockWriteFile.mockReset()
  mockMkdir.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const dummyFn = (schema: Schema) => `export const Schema = ${JSON.stringify(schema, null, 2)}`

describe('cli()', () => {
  it('should return help text when --help is passed', async () => {
    process.argv = ['node', 'cli.js', '--help']
    const result = await cli(dummyFn, 'This is help text.')
    expect(result).toStrictEqual({ ok: true, value: 'This is help text.' })
  })

  it('should process valid JSON input and write output', async () => {
    process.argv = ['node', 'cli.js', jsonPath, '-o', tsPath]

    mockReadFile.mockResolvedValueOnce(JSON.stringify(exampleSchema))
    mockMkdir.mockResolvedValueOnce(undefined)
    mockWriteFile.mockResolvedValueOnce(undefined)

    const result = await cli(dummyFn, 'help')
    expect(result).toStrictEqual({ ok: true, value: `${tsPath} created` })
    expect(mockReadFile).toHaveBeenCalledWith(jsonPath, 'utf-8')
    expect(mockMkdir).toHaveBeenCalled()
    expect(mockWriteFile).toHaveBeenCalledWith(
      tsPath,
      expect.stringContaining('export const Schema'),
      'utf-8',
    )
  })

  it('should fail on invalid input file extension', async () => {
    process.argv = ['node', 'cli.js', 'invalid.txt', '-o', tsPath]

    const result = await cli(dummyFn, 'help')
    expect(result).toStrictEqual({ ok: false, error: 'Input must be a .json, or .yaml file' })
  })

  it('should fail on unreadable file', async () => {
    const oldArgv = process.argv
    process.argv = ['node', 'cli.js', jsonPath, '-o', tsPath]
    mockReadFile.mockRejectedValueOnce(new Error('File not found'))
    const result = await cli(dummyFn, 'help')
    expect(result).toStrictEqual({ ok: false, error: 'File not found' })
  })
})
