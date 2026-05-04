import { Schema } from 'effect'

export const StringOrNumber = Schema.Union(Schema.String, Schema.Number)

export type StringOrNumberEncoded = typeof StringOrNumber.Encoded
