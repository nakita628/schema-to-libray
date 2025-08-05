import * as z from 'zod'

export const Schema = z.strictObject({
  id: z.uuid(),
  name: z.string().min(1),
  age: z.int().min(0).optional(),
  email: z.email(),
  isActive: z.boolean().default(true).optional(),
})

export type Schema = z.infer<typeof Schema>
