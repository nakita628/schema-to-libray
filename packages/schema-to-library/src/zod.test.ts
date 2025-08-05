import { beforeEach } from 'node:test'
import { describe, expect, it, vi } from 'vitest'

// Test run
// pnpm vitest run ./packages/schema-to-zod/src/zod.test.ts

const mockCli = vi.fn()
const mockSchemaToZod = vi.fn().mockReturnValue('export const Schema = z.string()')

vi.mock('@schema-to-library/cli', () => ({
  cli: mockCli,
}))

vi.mock('@schema-to-library/zod', () => ({
  schemaToZod: mockSchemaToZod,
}))

describe('bin/schema-to-zod CLI', () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call cli() with correct arguments', async () => {
    mockCli.mockResolvedValueOnce({ ok: true, value: 'output.ts created' })

    process.argv = ['node', '*/dist/index.js', 'input.yaml', '-o', 'output.ts']

    // biome-ignore lint: test
    await import('./zod.ts' as any)

    expect(console.log).toHaveBeenCalledWith('output.ts created')
  })
})
