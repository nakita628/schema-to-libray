import { Schema } from 'effect'

export const Address = Schema.StructWithRest(
  Schema.Struct({ country: Schema.String, postalCode: Schema.optional(Schema.String) }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter(
    (o) =>
      !Schema.is(Schema.Struct({ country: Schema.Literal('JP') }))(o) ||
      Schema.is(Schema.Struct({ postalCode: Schema.String }))(o),
  ),
)

export type Address = typeof Address.Type
