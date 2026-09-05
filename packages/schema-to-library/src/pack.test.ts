import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vite-plus/test'

const packageDir = path.join(import.meta.dirname, '..')

type PackageJson = {
  readonly scripts: {
    readonly prepack?: string
    readonly postpack?: string
  }
}

type PackListing = {
  readonly files: readonly { readonly path: string }[]
}

function readPackageJson(): PackageJson {
  return JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as PackageJson
}

function listPackedFiles(): readonly string[] {
  const listings = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: packageDir,
      encoding: 'utf8',
    }),
  ) as readonly PackListing[]
  return listings[0]?.files.map((file) => file.path) ?? []
}

describe('package pack', () => {
  it('ships the package README without copying it from the repo root', () => {
    const { scripts } = readPackageJson()
    expect(scripts.prepack).toBeUndefined()
    expect(scripts.postpack).toBeUndefined()

    const readme = path.join(packageDir, 'README.md')
    expect(fs.lstatSync(readme).isSymbolicLink()).toBe(false)
    expect(fs.statSync(readme).isFile()).toBe(true)

    expect(listPackedFiles().includes('README.md')).toBe(true)
  })
})
