import * as z from 'zod'

export const Schema = z
  .object({
    first_name: z.string(),
    last_name: z.string(),
    birthday: z.iso.date(),
    address: z
      .object({
        street_address: z.string(),
        city: z.string(),
        state: z.string(),
        country: z.string(),
      })
      .partial(),
  })
  .partial()

export type Schema = z.infer<typeof Schema>
