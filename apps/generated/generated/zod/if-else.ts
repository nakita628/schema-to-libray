import * as z from 'zod'

export const Vehicle = z.object({ type: z.enum(['car', 'truck']) })

export type Vehicle = z.infer<typeof Vehicle>
