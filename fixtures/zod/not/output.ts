import * as z from 'zod'

export const NotString = z
  .any()
  .refine((v) => typeof v !== 'string', { error: 'Must not be a string' })

export type NotString = z.infer<typeof NotString>
