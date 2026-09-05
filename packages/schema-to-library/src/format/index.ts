import { Data, Effect } from 'effect'
import { format as oxfmt } from 'oxfmt'

/** oxfmt rejected the source it was handed. */
export class FormatError extends Data.TaggedError('FormatError')<{
  readonly message: string
}> {}

const FMT_OPTIONS = {
  printWidth: 100,
  singleQuote: true,
  semi: false,
} as const

function runOxfmt(input: string) {
  return oxfmt('<stdin>.ts', input, FMT_OPTIONS)
}

function asFmtError(cause: unknown) {
  return new FormatError({ message: cause instanceof Error ? cause.message : String(cause) })
}

/** Formats generated TypeScript. Failures land in the error channel. */
export function format(input: string) {
  return Effect.gen(function* () {
    const { code, errors } = yield* Effect.tryPromise({
      try: () => runOxfmt(input),
      catch: asFmtError,
    })
    if (errors.length > 0) {
      return yield* new FormatError({ message: errors.map((error) => error.message).join('\n') })
    }
    return code
  })
}

/**
 * `{ ok }` boundary for callers that are not Effects — fixtures and the published
 * programmatic API.
 */
export async function fmt(input: string) {
  try {
    const { code, errors } = await runOxfmt(input)
    if (errors.length > 0) {
      return { ok: false, error: errors.map((error) => error.message).join('\n') } as const
    }
    return { ok: true, value: code } as const
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const
  }
}
