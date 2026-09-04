import * as z from 'zod'

export const DependentRequired = z
  .object({ kind: z.string().exactOptional(), feature: z.string().exactOptional() })
  .refine((val) => !('kind' in val) || 'feature' in val)

export type DependentRequired = z.infer<typeof DependentRequired>
