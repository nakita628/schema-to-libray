import { Schema } from 'effect'

export const BrandedTypes = Schema.Struct({
  userId: Schema.UUID.pipe(Schema.brand('UserId')),
  email: Schema.String.pipe(
    Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  ).pipe(Schema.brand('Email')),
  price: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0)).pipe(Schema.brand('Price')),
  quantity: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)).pipe(
    Schema.brand('Quantity'),
  ),
  tags: Schema.Array(Schema.String)
    .pipe(Schema.minItems(1), Schema.maxItems(10))
    .pipe(Schema.brand('Tags')),
  name: Schema.String,
})

export type BrandedTypesType = typeof BrandedTypes.Type
