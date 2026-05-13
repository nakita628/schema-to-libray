import { Schema } from 'effect'

export const Address = Schema.Struct({
  country: Schema.String,
  postalCode: Schema.optional(Schema.String),
}).pipe(
  Schema.filter((o) =>
    Schema.is(Schema.Struct({ country: Schema.Literal('JP') }))(o)
      ? Schema.is(Schema.Struct({ postalCode: Schema.String }))(o)
      : true,
  ),
)

export type AddressEncoded = typeof Address.Encoded
