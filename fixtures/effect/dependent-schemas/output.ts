import { Schema } from 'effect'

export const Card = Schema.Struct({ name: Schema.String }).check(
  Schema.makeFilter(
    (o) => !('creditCard' in o) || Schema.is(Schema.Struct({ billingAddress: Schema.String }))(o),
  ),
)

export type Card = typeof Card.Type
