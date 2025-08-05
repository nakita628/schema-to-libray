import * as z from 'zod'

type EType = { label?: string; reference?: EType; flags?: string[]; meta?: Record<string, string> }
type DType = { score: number; extra?: null | EType }
type BType = { type: 'B'; name: string; detail: DType & { comment?: string } }
type CType = { type: 'C'; entries: EType[] }
type AType = { id: string; type: 'B' | 'C'; payload: BType | CType }

export const E: z.ZodType<EType> = z
  .object({
    label: z.string(),
    reference: z.lazy(() => E),
    flags: z.array(z.string()),
    meta: z.record(z.string(), z.string()),
  })
  .partial()

export const D: z.ZodType<DType> = z.object({
  score: z.int().min(0).max(100).default(50),
  extra: z.union([z.null().nullable(), z.lazy(() => E)]).optional(),
})

export const B: z.ZodType<BType> = z.object({
  type: z.literal('B'),
  name: z.string(),
  detail: z.intersection(
    z.lazy(() => D),
    z.object({ comment: z.string().default('N/A') }).partial(),
  ),
})

export const C: z.ZodType<CType> = z.object({
  type: z.literal('C'),
  entries: z.array(z.lazy(() => E)).min(1),
})

export const A: z.ZodType<AType> = z.object({
  id: z.uuid(),
  type: z.enum(['B', 'C']),
  payload: z.union([z.lazy(() => B), z.lazy(() => C)]),
})

export type A = z.infer<typeof A>
