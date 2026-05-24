import * as z from 'zod'

export const IntList = z
  .array(z.any())
  .refine((arr) => {
    const Schema = z.int()
    return arr.filter((i) => Schema.safeParse(i).success).length >= 2
  })
  .refine((arr) => {
    const Schema = z.int()
    return arr.filter((i) => Schema.safeParse(i).success).length <= 3
  })

export type IntList = z.infer<typeof IntList>
