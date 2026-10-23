import * as v from 'valibot'

export const Ids = v.pipe(
  v.unknown(),
  v.transform((input) => {
    if (typeof input !== 'string') return input
    const text = input
    return text === '' ? [] : text.split(',')
  }),
  v.unknown(),
  v.transform((input) => (input === undefined || Array.isArray(input) ? input : [input])),
  v.array(v.pipe(v.string(), v.transform(Number), v.number(), v.safeInteger())),
  v.minLength(1),
)

export type IdsOutput = v.InferOutput<typeof Ids>
