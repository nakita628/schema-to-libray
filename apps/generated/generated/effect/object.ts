import { Schema } from 'effect'

export const Schema_ = Schema.Struct({
  first_name: Schema.optional(Schema.String),
  last_name: Schema.optional(Schema.String),
  birthday: Schema.optional(Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/))),
  address: Schema.optional(
    Schema.Struct({
      street_address: Schema.optional(Schema.String),
      city: Schema.optional(Schema.String),
      state: Schema.optional(Schema.String),
      country: Schema.optional(Schema.String),
    }),
  ),
})
