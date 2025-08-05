import * as z from 'zod'

export const Schema = z.object({ type: z.enum(['car', 'truck']) })

export type Schema = z.infer<typeof Schema>
