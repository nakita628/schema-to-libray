import * as v from 'valibot'

export const Schema = v.object({
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  startsAt: v.pipe(v.string(), v.isoTimeSecond()),
})

export type SchemaOutput = v.InferOutput<typeof Schema>
