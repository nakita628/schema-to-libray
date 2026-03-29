import * as v from 'valibot'

export const BrandedTypes = v.object({
  userId: v.pipe(v.pipe(v.string(), v.uuid()), v.brand('UserId')),
  email: v.pipe(v.pipe(v.string(), v.email()), v.brand('Email')),
  price: v.pipe(v.pipe(v.number(), v.minValue(0)), v.brand('Price')),
  quantity: v.pipe(v.pipe(v.number(), v.integer(), v.minValue(0)), v.brand('Quantity')),
  tags: v.pipe(v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(10)), v.brand('Tags')),
  name: v.string(),
})

export type BrandedTypesOutput = v.InferOutput<typeof BrandedTypes>
