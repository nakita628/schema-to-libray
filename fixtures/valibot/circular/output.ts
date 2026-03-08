import * as v from 'valibot'

type AType = {b?: BType}

type BType = {a?: AType}

const B: v.GenericSchema<BType> = v.partial(v.object({a:v.lazy(() => A)}))

export const A: v.GenericSchema<AType> = v.partial(v.object({b:v.lazy(() => B)}))

export type AInput = v.InferInput<typeof A>

export type AOutput = v.InferOutput<typeof A>
