import { Schema } from 'effect'

export const Schema_ = Schema.Struct({ name: Schema.String, age: Schema.optional(Schema.Number) })

export type Schema_Encoded = typeof Schema_.Encoded
