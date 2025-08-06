import * as z from 'zod'

export const Product = z.object({
  id: z.int(),
  name: z.string(),
  price: z.number().gt(0),
  tags: z.array(z.string()).optional(),
  dimensions: z.object({ length: z.number(), width: z.number(), height: z.number() }).optional(),
  warehouseLocation: z.string().optional(),
})

export type Product = z.infer<typeof Product>
