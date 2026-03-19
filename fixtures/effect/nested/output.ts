import { Schema } from 'effect'

export const Order = Schema.Struct({
  id: Schema.Number.pipe(Schema.int()),
  customer: Schema.Struct({
    name: Schema.String.pipe(Schema.minLength(1)),
    email: Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
  }),
  items: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      price: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)),
      quantity: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
    }),
  ),
  status: Schema.Literal('pending', 'confirmed', 'shipped', 'delivered'),
})

export type OrderEncoded = typeof Order.Encoded
