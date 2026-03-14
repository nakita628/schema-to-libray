import { Schema } from 'effect'

export const Order = Schema.Struct({
  id: Schema.Number.pipe(Schema.int()),
  customer: Schema.Struct({
    name: Schema.String,
    email: Schema.String.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
    address: Schema.optional(Schema.Struct({ street: Schema.String, city: Schema.String })),
  }),
  status: Schema.Literal('pending', 'shipped', 'delivered'),
})

export type OrderType_ = typeof Order.Type

export type OrderEncoded = typeof Order.Encoded
