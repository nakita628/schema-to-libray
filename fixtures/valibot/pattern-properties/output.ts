import * as v from 'valibot'

export const PatternMap = v.pipe(
  v.record(v.string(), v.unknown()),
  v.check((o) =>
    Object.entries(o).every(
      ([k, val]) => !new RegExp('^S').test(k) || v.safeParse(v.string(), val).success,
    ),
  ),
  v.check((o) =>
    Object.entries(o).every(
      ([k, val]) =>
        !new RegExp('^I').test(k) || v.safeParse(v.pipe(v.number(), v.integer()), val).success,
    ),
  ),
)

export type PatternMapOutput = v.InferOutput<typeof PatternMap>
