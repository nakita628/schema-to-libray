import * as z from 'zod'

type NodeType = { name: string; children?: NodeType[] }
type SchemaType = NodeType

export const Node: z.ZodType<NodeType> = z.strictObject({
  name: z.string(),
  children: z.array(z.lazy(() => Node)).optional(),
})

export const Schema: z.ZodType<SchemaType> = z.lazy(() => Node)

export type Schema = z.infer<typeof Schema>
