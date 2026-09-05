import { describe, expect, it } from 'vite-plus/test'

import { runEffect, runEffectError } from '../testing/index.js'
import { fmt, format } from './index.js'

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

  it('should format with default printWidth (no wrap at 100)', async () => {
    const result = await fmt('const obj = { aaaa: 1, bbbb: 2, cccc: 3 }')
    expect(result).toStrictEqual({ ok: true, value: 'const obj = { aaaa: 1, bbbb: 2, cccc: 3 }\n' })
  })
})

describe('format', () => {
  it('formats TypeScript in the success channel', async () => {
    expect(await runEffect(format('const x=1'))).toBe('const x = 1\n')
  })

  it('fails in the error channel for invalid code', async () => {
    const error = await runEffectError(format('const x = {'))
    expect(error.message.length).toBeGreaterThan(0)
  })
})
