import * as v from 'valibot'

export const Toggle = v.pipe(
  v.object({ kind: v.string(), feature: v.optional(v.string()) }),
  v.check((o) => !('kind' in o) || 'feature' in o, 'feature is required when kind is set'),
)

export type ToggleOutput = v.InferOutput<typeof Toggle>
