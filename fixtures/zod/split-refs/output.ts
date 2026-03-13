import * as z from 'zod'

export const User = z.object({
  name: z.string(),
  address: z
    .object({ street: z.string(), city: z.string(), zip: z.string().optional() })
    .optional(),
})

export type User = z.infer<typeof User>
