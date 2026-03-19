import * as z from 'zod'

export const Config = z
  .object({ name: z.string(), tags: z.array(z.string()).readonly(), count: z.int().optional() })
  .readonly()

export type Config = z.infer<typeof Config>
