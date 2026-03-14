import * as z from 'zod'

type SchemaType = { children?: z.infer<typeof Schema>[] }

export const Schema: z.ZodType<SchemaType> = z
  .object({ children: z.array(z.lazy(() => Schema)) })
  .partial()

export type Schema = z.infer<typeof Schema>
