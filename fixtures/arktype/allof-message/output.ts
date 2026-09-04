import { type } from 'arktype'

const MergedInner = type(type({ name: type('string >= 3') })).and(
  type({ age: 'number.integer >= 0' }),
)

export const Merged = type('unknown').narrow((data, ctx) => {
  const result = MergedInner(data)
  if (result instanceof type.errors) {
    for (const issue of result)
      ctx.reject({ message: 'merged validation failed', path: issue.path })
    return false
  }
  return true
})

export type Merged = typeof MergedInner.infer
