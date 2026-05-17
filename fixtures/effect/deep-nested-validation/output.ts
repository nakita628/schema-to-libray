import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  address: Schema.Struct({
    street: Schema.String.pipe(Schema.minLength(1)),
    city: Schema.String.pipe(Schema.minLength(1)),
    geo: Schema.Struct({
      lat: Schema.Number.pipe(Schema.greaterThanOrEqualTo(-90), Schema.lessThanOrEqualTo(90)),
      lng: Schema.Number.pipe(Schema.greaterThanOrEqualTo(-180), Schema.lessThanOrEqualTo(180)),
    }),
  }),
})

export type UserEncoded = typeof User.Encoded
