import { NodeServices } from '@effect/platform-node'
import { Effect } from 'effect'
import type { Effect as EffectType, FileSystem } from 'effect'

/** Runs an Effect that has no remaining requirements. */
export function runEffect<A, E>(effect: EffectType.Effect<A, E>) {
  return Effect.runPromise(effect)
}

/** The same, for an Effect that is expected to fail: answers with the error it failed with. */
export function runEffectError<A, E>(effect: EffectType.Effect<A, E>) {
  return Effect.runPromise(Effect.flip(effect))
}

/**
 * Runs an Effect that only needs the filesystem, the way the CLI writes files.
 *
 * Test-only — nothing in `dist` imports it.
 */
export function runWithFileSystem<A, E>(effect: EffectType.Effect<A, E, FileSystem.FileSystem>) {
  return Effect.runPromise(effect.pipe(Effect.provide(NodeServices.layer)))
}

/** The same, for an Effect that is expected to fail: answers with the error it failed with. */
export function runWithFileSystemError<A, E>(
  effect: EffectType.Effect<A, E, FileSystem.FileSystem>,
) {
  return Effect.runPromise(Effect.flip(effect.pipe(Effect.provide(NodeServices.layer))))
}
