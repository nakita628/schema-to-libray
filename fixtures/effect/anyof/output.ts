import { Schema } from 'effect'

export const StringOrNumber = Schema.Union(Schema.String, Schema.Number)

export type StringOrNumberType = typeof StringOrNumber.Type
