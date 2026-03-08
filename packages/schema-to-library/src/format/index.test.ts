import { describe, expect, it } from 'vitest'
import { fmt, setFormatOptions } from './index.js'

describe('fmt', () => {
  it('should format TypeScript code', async () => {
    const result = await fmt('const x=1')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toContain('const x = 1')
    }
  })

  it('should format with default options (no semi, single quote)', async () => {
    const result = await fmt('const x = "hello";')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toContain("const x = 'hello'")
      expect(result.value).not.toContain(';')
    }
  })

  it('should return error for invalid code', async () => {
    const result = await fmt('const x = {')
    expect(result.ok).toBe(false)
  })
})

describe('setFormatOptions', () => {
  it('should change format options', async () => {
    setFormatOptions({ semi: true, singleQuote: false })
    const result = await fmt("const x = 'hello'")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toContain(';')
    }
    // Reset to defaults
    setFormatOptions({ semi: false, singleQuote: true })
  })
})
