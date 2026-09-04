import { Schema } from 'effect'

export const Bag = Schema.Array(Schema.Number.check(Schema.isInt())).check(
  Schema.makeFilter(
    (arr) =>
      arr.filter((i) =>
        Schema.is(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(10)))(i),
      ).length >= 1,
  ),
  Schema.makeFilter(
    (arr) =>
      arr.filter((i) =>
        Schema.is(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(10)))(i),
      ).length <= 3,
  ),
)

export type Bag = typeof Bag.Type
