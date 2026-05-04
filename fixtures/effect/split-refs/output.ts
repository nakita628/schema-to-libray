import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  address: Schema.optional(
    Schema.Struct({
      street: Schema.String,
      city: Schema.String,
      zip: Schema.optional(Schema.String),
    }),
  ),
})

export type UserEncoded = typeof User.Encoded
