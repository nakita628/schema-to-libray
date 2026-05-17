import { Schema } from 'effect'

export const Card = Schema.Struct({ name: Schema.String }).pipe(
  Schema.filter(
    (o) => !('creditCard' in o) || Schema.is(Schema.Struct({ billingAddress: Schema.String }))(o),
  ),
)

export type CardEncoded = typeof Card.Encoded
