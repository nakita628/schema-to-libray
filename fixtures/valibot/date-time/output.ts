import * as v from 'valibot'

export const Schema = v.object({
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  startsAt: v.pipe(
    v.string(),
    v.regex(
      /^(?:0\d|1\d|2[0-3])(?::[0-5]\d){2}(?:\.\d{1,9})?(?:Z| ?[+-](?:0\d|1\d|2[0-3])(?::?[0-5]\d)?)$/,
    ),
  ),
})

export type SchemaOutput = v.InferOutput<typeof Schema>
