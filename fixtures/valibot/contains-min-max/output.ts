import * as v from 'valibot'

export const IntList = v.pipe(
  v.array(v.any()),
  v.check(
    (arr) => arr.filter((i) => v.safeParse(v.pipe(v.number(), v.integer()), i).success).length >= 2,
    'Need at least 2 integers',
  ),
  v.check(
    (arr) => arr.filter((i) => v.safeParse(v.pipe(v.number(), v.integer()), i).success).length <= 3,
    'At most 3 integers allowed',
  ),
)

export type IntListOutput = v.InferOutput<typeof IntList>
