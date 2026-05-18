import { Schema } from 'effect'

export const NotString = Schema.Unknown.pipe(
  Schema.filter((val) => typeof val !== 'string', { message: () => 'Must not be a string' }),
)

export type NotStringEncoded = typeof NotString.Encoded
