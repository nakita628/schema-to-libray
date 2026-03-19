import * as v from 'valibot'

type _A = { b?: _B }

type _C = string

type _B = { c?: _C }

const C: v.GenericSchema<_C> = v.string()

const B: v.GenericSchema<_B> = v.partial(v.object({ c: v.lazy(() => C) }))

export const A: v.GenericSchema<_A> = v.partial(v.object({ b: v.lazy(() => B) }))

export type AOutput = v.InferOutput<typeof A>
