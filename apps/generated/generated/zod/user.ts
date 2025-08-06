import * as z from 'zod'

export const User = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1),
  age: z.int().min(0).optional(),
  email: z.email(),
  isActive: z.boolean().default(true).optional(),
})

export type User = z.infer<typeof User>
