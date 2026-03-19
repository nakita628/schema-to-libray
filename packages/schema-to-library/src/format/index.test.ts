import { describe, expect, it } from 'vite-plus/test'

import { fmt } from './index.js'

describe('fmt', () => {
  it('should format TypeScript code', async () => {
    const result = await fmt('const x=1')
    expect(result).toStrictEqual({ ok: true, value: 'const x = 1\n' })
  })

  it('should format with default options (no semi, single quote)', async () => {
    const result = await fmt('const x = "hello";')
    expect(result).toStrictEqual({ ok: true, value: "const x = 'hello'\n" })
  })

  it('should format multi-line code', async () => {
    const result = await fmt('const a=1\nconst b=2')
    expect(result).toStrictEqual({ ok: true, value: 'const a = 1\nconst b = 2\n' })
  })

  it('should return error for invalid code', async () => {
    const result = await fmt('const x = {')
    expect(result.ok).toBe(false)
  })
})
