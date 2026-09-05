import path from 'node:path'

import { NodeServices } from '@effect/platform-node'
import { Effect } from 'effect'
import { ChildProcess } from 'effect/unstable/process'
import { ChildProcessSpawner } from 'effect/unstable/process/ChildProcessSpawner'
import { describe, expect, it } from 'vite-plus/test'

import { readFile, readLink, stat } from './file/index.js'

const packageDir = path.join(import.meta.dirname, '..')

type PackageScripts = {
  readonly prepack?: string
  readonly postpack?: string
}

function isRecord(value: unknown): value is { readonly [key: string]: unknown } {
  return typeof value === 'object' && value !== null
}

function parseScripts(raw: string): PackageScripts {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed) || !isRecord(parsed.scripts)) {
    throw new Error('package.json is missing a scripts object')
  }
  return parsed.scripts
}

function parsePackedFiles(raw: string): readonly string[] {
  const listings: unknown = JSON.parse(raw)
  if (!Array.isArray(listings) || listings[0] === undefined || !isRecord(listings[0])) {
    return []
  }
  const files = listings[0].files
  if (!Array.isArray(files)) return []
  return files.flatMap((file: unknown) => {
    if (!isRecord(file) || typeof file.path !== 'string') return []
    return [file.path]
  })
}

function decodeJson<A>(raw: string, parse: (raw: string) => A) {
  return Effect.try({
    try: () => parse(raw),
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  })
}

function inspectPackage() {
  return Effect.gen(function* () {
    const raw = yield* readFile(path.join(packageDir, 'package.json'))
    if (raw === null) return yield* Effect.fail(new Error('package.json is missing'))
    const scripts = yield* decodeJson(raw, parseScripts)
    const readme = path.join(packageDir, 'README.md')
    const info = yield* stat(readme)
    const link = yield* readLink(readme)
    const spawner = yield* ChildProcessSpawner
    const listing = yield* spawner.string(
      ChildProcess.make('npm', ['pack', '--dry-run', '--json'], { cwd: packageDir }),
    )
    return {
      scripts,
      readmeType: info.type,
      readmeLink: link,
      packedFiles: yield* decodeJson(listing, parsePackedFiles),
    }
  })
}

describe('package pack', () => {
  it('ships the package README without copying it from the repo root', async () => {
    const packed = await Effect.runPromise(
      inspectPackage().pipe(Effect.provide(NodeServices.layer)),
    )
    expect(packed.scripts.prepack).toBeUndefined()
    expect(packed.scripts.postpack).toBeUndefined()
    expect(packed.readmeLink).toBeNull()
    expect(packed.readmeType).toBe('File')
    expect(packed.packedFiles.includes('README.md')).toBe(true)
  })
})
