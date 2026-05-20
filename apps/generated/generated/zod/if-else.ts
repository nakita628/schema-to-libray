import * as z from 'zod'

export const Vehicle = z
  .looseObject({ type: z.enum(['car', 'truck']) })
  .refine(
    (o) =>
      !z
        .object({ type: z.literal('truck') })
        .partial()
        .safeParse(o).success ||
      z.object({ cargoCapacity: z.number().min(0) }).safeParse(o).success,
  )
  .refine(
    (o) =>
      z
        .object({ type: z.literal('truck') })
        .partial()
        .safeParse(o).success || z.object({ passengerCount: z.int().min(1) }).safeParse(o).success,
  )
