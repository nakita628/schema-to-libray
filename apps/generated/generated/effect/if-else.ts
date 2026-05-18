import { Schema } from 'effect'

export const Vehicle = Schema.Struct(
  { type: Schema.Literal('car', 'truck') },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
).pipe(
  Schema.filter((o) =>
    Schema.is(Schema.partial(Schema.Struct({ type: Schema.Literal('truck') })))(o)
      ? Schema.is(
          Schema.Struct({ cargoCapacity: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)) }),
        )(o)
      : Schema.is(
          Schema.Struct({
            passengerCount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
          }),
        )(o),
  ),
)
