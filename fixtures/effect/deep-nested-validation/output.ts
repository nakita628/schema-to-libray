import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String.check(Schema.isMinLength(1)),
  address: Schema.Struct({
    street: Schema.String.check(Schema.isMinLength(1)),
    city: Schema.String.check(Schema.isMinLength(1)),
    geo: Schema.Struct({
      lat: Schema.Number.check(Schema.isGreaterThanOrEqualTo(-90), Schema.isLessThanOrEqualTo(90)),
      lng: Schema.Number.check(
        Schema.isGreaterThanOrEqualTo(-180),
        Schema.isLessThanOrEqualTo(180),
      ),
    }),
  }),
})

export type User = typeof User.Type
