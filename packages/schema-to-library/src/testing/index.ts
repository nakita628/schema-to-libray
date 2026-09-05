import { Effect } from 'effect'
import type { Effect as EffectType, FileSystem } from 'effect'

import { fileSystemLayer } from '../file/index.js'

/**
 * Runs an Effect that only needs the filesystem, the way the CLI writes files.
 *
 * Test-only — nothing in `dist` imports it.
 */
export function runWithFileSystem<A, E>(effect: EffectType.Effect<A, E, FileSystem.FileSystem>) {
  return Effect.runPromise(effect.pipe(Effect.provide(fileSystemLayer)))
}

/** The same, for an Effect that is expected to fail: answers with the error it failed with. */
export function runWithFileSystemError<A, E>(
  effect: EffectType.Effect<A, E, FileSystem.FileSystem>,
) {
  return Effect.runPromise(Effect.flip(effect.pipe(Effect.provide(fileSystemLayer))))
}
