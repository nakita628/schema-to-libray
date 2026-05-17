import * as z from 'zod'

export const Address = z.object({ country: z.string() }).partial()

export type Address = z.infer<typeof Address>
