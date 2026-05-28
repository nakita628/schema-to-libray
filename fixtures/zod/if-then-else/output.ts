import * as z from 'zod'

export const Address = z
  .looseObject({ country: z.string().exactOptional() })
  .refine(
    (o) =>
      !z.object({ country: z.literal('JP').exactOptional() }).safeParse(o).success ||
      z.object({ postalCode: z.string().regex(/^[0-9]{3}-[0-9]{4}$/) }).safeParse(o).success,
  )

export type Address = z.infer<typeof Address>
