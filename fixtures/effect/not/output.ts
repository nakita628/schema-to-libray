import { Schema } from 'effect'

export const NotString = Schema.Unknown.check(
  Schema.makeFilter((val) => typeof val !== 'string', { message: 'Must not be a string' }),
)

export type NotString = typeof NotString.Type
