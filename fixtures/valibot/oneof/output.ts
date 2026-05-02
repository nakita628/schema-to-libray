import * as v from 'valibot'

export const Shape = v.variant('kind', [
  v.object({ kind: v.literal('circle'), radius: v.number() }),
  v.object({ kind: v.literal('rectangle'), width: v.number(), height: v.number() }),
])

export type ShapeOutput = v.InferOutput<typeof Shape>
