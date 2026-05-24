import { Schema } from 'effect'

export const Product = Schema.Struct({
  id: Schema.Number.pipe(Schema.int()).annotations({
    description: 'The unique identifier for a product',
  }),
  name: Schema.String.annotations({ description: 'Name of the product' }),
  price: Schema.Number.pipe(Schema.greaterThan(0)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  dimensions: Schema.optional(
    Schema.Struct({ length: Schema.Number, width: Schema.Number, height: Schema.Number }),
  ),
  warehouseLocation: Schema.optional(
    Schema.String.annotations({ description: 'Coordinates of the warehouse' }),
  ),
})
