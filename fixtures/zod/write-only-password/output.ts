import * as z from 'zod'

export const Account = z
  .object({ name: z.string(), password: z.string().meta({ writeOnly: true }) })
  .partial()

export type Account = z.infer<typeof Account>
