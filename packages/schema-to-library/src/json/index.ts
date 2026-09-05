import { Data, Effect } from 'effect'

/** JSON.parse or JSON.stringify failed. */
export class JsonError extends Data.TaggedError('JsonError')<{
  readonly message: string
}> {}

function asJsonError(cause: unknown) {
  return new JsonError({ message: cause instanceof Error ? cause.message : String(cause) })
}

/** Parses a JSON string. Failures land in the error channel. */
export function parseJson(raw: string) {
  return Effect.try({
    try: () => {
      const value: unknown = JSON.parse(raw)
      return value
    },
    catch: asJsonError,
  })
}

/** Serialises a value as JSON. Failures land in the error channel. */
export function stringifyJson(value: unknown) {
  return Effect.try({
    try: () => {
      const text = JSON.stringify(value)
      if (text === undefined) {
        throw new Error('JSON.stringify returned undefined')
      }
      return text
    },
    catch: asJsonError,
  })
}
