import { type } from 'arktype'

export const Ids = type('unknown').pipe(
  (data) => {
    if (typeof data !== 'string') return data
    const text = data
    return text === '' ? [] : text.split(',')
  },
  type('unknown').pipe(
    (data) => (data === undefined || Array.isArray(data) ? data : [data]),
    type(
      type(
        type('string').pipe((data, ctx) => {
          const value = Number(data)
          return Number.isSafeInteger(value) ? value : ctx.error('an integer')
        }),
      ).array(),
    ).and(type('unknown[] >= 1')),
  ),
)

export type Ids = typeof Ids.infer
