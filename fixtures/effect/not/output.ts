import { Schema } from 'effect'

export const NotString = Schema.Unknown.pipe(
  Schema.filter((v) => typeof v !== 'string', { message: () => 'Must not be a string' }),
)

export type NotStringEncoded = typeof NotString.Encoded
