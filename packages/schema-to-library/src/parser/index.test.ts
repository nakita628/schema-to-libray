import fsp from 'node:fs/promises'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test'

import { runGenerator, runGeneratorError } from '../testing/index.js'
import { parseSchemaFile } from './index.js'

const tmpDir = path.join(import.meta.dirname, '__test_tmp__')

beforeAll(async () => {
  await fsp.mkdir(tmpDir, { recursive: true })
})

afterAll(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true })
})

describe('parseSchemaFile', () => {
  it('parses a valid JSON schema file', async () => {
    const schemaPath = path.join(tmpDir, 'test.json')
    await fsp.writeFile(
      schemaPath,
      JSON.stringify({
        type: 'object',
        properties: { name: { type: 'string' } },
      }),
    )

    const schema = await runGenerator(parseSchemaFile(schemaPath))
    expect(schema.type).toBe('object')
    expect(schema.properties).toStrictEqual({ name: { type: 'string' } })
  })

  it('parses a schema with $defs', async () => {
    const schemaPath = path.join(tmpDir, 'defs.json')
    await fsp.writeFile(
      schemaPath,
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        $defs: {
          Address: {
            type: 'object',
            properties: { street: { type: 'string' } },
          },
        },
        properties: {
          address: { $ref: '#/$defs/Address' },
        },
      }),
    )

    const schema = await runGenerator(parseSchemaFile(schemaPath))
    expect(schema.$defs).toBeDefined()
  })

  it('fails for a missing file', async () => {
    const error = await runGeneratorError(parseSchemaFile('/non/existent/file.json'))
    expect(error.message.startsWith('Failed to parse schema:')).toBe(true)
  })

  it('parses even loosely valid JSON-like content', async () => {
    const schemaPath = path.join(tmpDir, 'loose.json')
    await fsp.writeFile(schemaPath, '{}')

    const schema = await runGenerator(parseSchemaFile(schemaPath))
    expect(schema).toStrictEqual({})
  })

  it('fails for invalid JSON content', async () => {
    const schemaPath = path.join(tmpDir, 'invalid.json')
    await fsp.writeFile(schemaPath, '{invalid json!!!')

    const error = await runGeneratorError(parseSchemaFile(schemaPath))
    expect(error.message.startsWith('Failed to parse schema:')).toBe(true)
  })

  it('fails with a message for a missing deep path', async () => {
    const error = await runGeneratorError(parseSchemaFile('/non/existent/path/deep/file.json'))
    expect(error.message).toContain('Failed to parse schema:')
  })
})
