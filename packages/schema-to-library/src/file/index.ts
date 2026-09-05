import { Effect, FileSystem } from 'effect'

/** Removes a file. A path that is already gone is not an error. */
export function unlink(path: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    yield* fs.remove(path, { force: true })
  })
}

/** Creates the directory and its parents. An existing directory is not an error. */
export function mkdir(dir: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    yield* fs.makeDirectory(dir, { recursive: true })
  })
}

/** Entry names of a directory. A directory that does not exist reads as empty. */
export function readdir(dir: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    if (!(yield* fs.exists(dir))) return []
    return yield* fs.readDirectory(dir)
  })
}

/** Contents of a UTF-8 file, or `null` when the file does not exist. */
export function readFile(path: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    if (!(yield* fs.exists(path))) return null
    return yield* fs.readFileString(path)
  })
}

/**
 * Writes a UTF-8 file, leaving it untouched when the contents already match.
 *
 * Skipping the identical write keeps a no-op generation from changing mtime. An
 * unreadable existing file falls through to the write rather than failing here.
 */
export function writeFile(path: string, data: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const existing = yield* fs.readFileString(path).pipe(Effect.orElseSucceed(() => null))
    if (existing === data) return
    yield* fs.writeFileString(path, data)
  })
}

/** Metadata of a path. Symbolic links are followed. */
export function stat(path: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return yield* fs.stat(path)
  })
}

/** Destination of a symbolic link, or `null` when the path is not one. */
export function readLink(path: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return yield* fs.readLink(path).pipe(Effect.orElseSucceed(() => null))
  })
}
