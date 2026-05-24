import * as z from 'zod'

export const User = z.object({
  name: z.string().min(1),
  email: z.email(),
  address: z
    .object({ city: z.string(), zip: z.string().regex(/^\d{3}-\d{4}$/) })
    .partial()
    .optional(),
})

export type User = z.infer<typeof User>
