import * as v from 'valibot'

type AType = {b?: BType}

type CType = string

type BType = {c?: CType}

const C: v.GenericSchema<CType> = v.string()

const B: v.GenericSchema<BType> = v.partial(v.object({c:v.lazy(() => C)}))

export const A: v.GenericSchema<AType> = v.partial(v.object({b:v.lazy(() => B)}))

export type AInput = v.InferInput<typeof A>

export type AOutput = v.InferOutput<typeof A>
