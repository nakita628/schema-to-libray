import * as z from 'zod'

export const DependentRequired = z
  .object({ kind: z.string().exactOptional(), feature: z.string().exactOptional() })
  .refine((o) => !('kind' in o) || 'feature' in o)

export type DependentRequired = z.infer<typeof DependentRequired>
