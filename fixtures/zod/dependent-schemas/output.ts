import * as z from 'zod'

export const DependentRequired = z
  .object({ kind: z.string(), feature: z.string() })
  .partial()
  .refine((o) => !('kind' in o) || 'feature' in o)

export type DependentRequired = z.infer<typeof DependentRequired>
