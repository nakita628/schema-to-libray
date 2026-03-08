import { describe, expect, it } from 'vitest'
import { defineConfig, parseConfig } from './index.js'

describe('parseConfig', () => {
  it('should parse valid config', () => {
    const result = parseConfig({
      input: 'schema.json',
      output: 'output.ts',
    })
    expect(result).toStrictEqual({
      ok: true,
      value: {
        input: 'schema.json',
        output: 'output.ts',
      },
    })
  })

  it('should parse valid config with yaml input', () => {
    const result = parseConfig({
      input: 'schema.yaml',
      output: 'output.ts',
    })
    expect(result).toStrictEqual({
      ok: true,
      value: {
        input: 'schema.yaml',
        output: 'output.ts',
      },
    })
  })

  it('should parse config with format options', () => {
    const result = parseConfig({
      input: 'schema.json',
      output: 'output.ts',
      format: {
        printWidth: 80,
        semi: true,
        singleQuote: false,
      },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.format).toStrictEqual({
        printWidth: 80,
        semi: true,
        singleQuote: false,
      })
    }
  })

  it('should reject invalid input extension', () => {
    const result = parseConfig({
      input: 'schema.txt',
      output: 'output.ts',
    })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: input: Input must be a .json or .yaml file',
    })
  })

  it('should reject invalid output extension', () => {
    const result = parseConfig({
      input: 'schema.json',
      output: 'output.js',
    })
    expect(result).toStrictEqual({
      ok: false,
      error: 'Invalid config: output: Output must be a .ts file',
    })
  })

  it('should reject missing input', () => {
    const result = parseConfig({
      output: 'output.ts',
    })
    expect(result.ok).toBe(false)
  })

  it('should reject missing output', () => {
    const result = parseConfig({
      input: 'schema.json',
    })
    expect(result.ok).toBe(false)
  })
})

describe('defineConfig', () => {
  it('should return the config as-is', () => {
    const config = defineConfig({
      input: 'schema.json',
      output: 'output.ts',
    })
    expect(config).toStrictEqual({
      input: 'schema.json',
      output: 'output.ts',
    })
  })

  it('should return config with format options', () => {
    const config = defineConfig({
      input: 'schema.yaml',
      output: 'generated.ts',
      format: {
        printWidth: 120,
        semi: false,
        singleQuote: true,
      },
    })
    expect(config).toStrictEqual({
      input: 'schema.yaml',
      output: 'generated.ts',
      format: {
        printWidth: 120,
        semi: false,
        singleQuote: true,
      },
    })
  })
})
