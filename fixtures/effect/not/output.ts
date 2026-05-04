import { Schema } from 'effect'

export const NotString = Schema.Unknown.pipe(Schema.filter((v) => typeof v !== 'string'))

export type NotStringType = typeof NotString.Type
