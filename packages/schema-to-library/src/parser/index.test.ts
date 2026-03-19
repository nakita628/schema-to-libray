import fsp from 'node:fs/promises'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test'

import { parseSchemaFile } from './index.js'

const tmpDir = path.join(import.meta.dirname, '__test_tmp__')

beforeAll(async () => {
  await fsp.mkdir(tmpDir, { recursive: true })
})

afterAll(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true })
})

describe('parseSchemaFile', () => {
  it('should parse a valid JSON schema file', async () => {
    const schemaPath = path.join(tmpDir, 'test.json')
    await fsp.writeFile(
      schemaPath,
      JSON.stringify({
        type: 'object',
        properties: { name: { type: 'string' } },
      }),
    )

    const result = await parseSchemaFile(schemaPath)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.type).toBe('object')
      expect(result.value.properties).toStrictEqual({ name: { type: 'string' } })
    }
  })

  it('should parse a schema with $defs', async () => {
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

    const result = await parseSchemaFile(schemaPath)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.$defs).toBeDefined()
    }
  })

  it('should return error for non-existent file', async () => {
    const result = await parseSchemaFile('/non/existent/file.json')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.startsWith('Failed to parse schema:')).toBe(true)
    }
  })

  it('should parse even loosely valid JSON-like content', async () => {
    const schemaPath = path.join(tmpDir, 'loose.json')
    await fsp.writeFile(schemaPath, '{}')

    const result = await parseSchemaFile(schemaPath)
    expect(result.ok).toBe(true)
  })

  it('should return error for invalid JSON content', async () => {
    const schemaPath = path.join(tmpDir, 'invalid.json')
    await fsp.writeFile(schemaPath, '{invalid json!!!')

    const result = await parseSchemaFile(schemaPath)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.startsWith('Failed to parse schema:')).toBe(true)
    }
  })

  it('should return error result with message for non-Error throw', async () => {
    const result = await parseSchemaFile('/non/existent/path/deep/file.json')
    expect(result).toStrictEqual({
      ok: false,
      error: expect.stringContaining('Failed to parse schema:'),
    })
  })
})
