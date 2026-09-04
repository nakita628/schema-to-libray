import { Schema } from 'effect'

export const Vehicle = Schema.StructWithRest(
  Schema.Struct({ type: Schema.Literals(['car', 'truck']) }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).check(
  Schema.makeFilter(
    (o) =>
      !Schema.is(Schema.Struct({ type: Schema.optional(Schema.Literal('truck')) }))(o) ||
      Schema.is(
        Schema.Struct({ cargoCapacity: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)) }),
      )(o),
  ),
  Schema.makeFilter(
    (o) =>
      Schema.is(Schema.Struct({ type: Schema.optional(Schema.Literal('truck')) }))(o) ||
      Schema.is(
        Schema.Struct({
          passengerCount: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
        }),
      )(o),
  ),
)
