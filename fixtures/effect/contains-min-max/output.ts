import { Schema } from 'effect'

export const Bag = Schema.Array(Schema.Number.pipe(Schema.int())).pipe(
  Schema.filter(
    (arr) =>
      arr.filter((i) =>
        Schema.is(Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(10)))(i),
      ).length >= 1,
  ),
  Schema.filter(
    (arr) =>
      arr.filter((i) =>
        Schema.is(Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(10)))(i),
      ).length <= 3,
  ),
)

export type BagEncoded = typeof Bag.Encoded
