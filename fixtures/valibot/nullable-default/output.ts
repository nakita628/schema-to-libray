import * as v from 'valibot'

export const Status = v.partial(v.object({ label: v.nullable(v.optional(v.string(), 'unknown')) }))

export type StatusOutput = v.InferOutput<typeof Status>
