import { type } from 'arktype'

export const IntList = type('unknown[]')
  .narrow(
    (arr: unknown[], ctx) =>
      arr.filter((i) => type('number.integer').allows(i)).length >= 2 ||
      ctx.mustBe('must contain at least 2 matching items'),
  )
  .narrow(
    (arr: unknown[], ctx) =>
      arr.filter((i) => type('number.integer').allows(i)).length <= 3 ||
      ctx.mustBe('must contain at most 3 matching items'),
  )

export type IntList = typeof IntList.infer
