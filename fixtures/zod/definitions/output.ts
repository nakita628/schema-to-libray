import * as z from 'zod'

type AType = { b?: BType }

type CType = string

type BType = { c?: CType }

const C: z.ZodType<CType> = z.string()

const B: z.ZodType<BType> = z.object({ c: z.lazy(() => C) }).partial()

export const A: z.ZodType<AType> = z.object({ b: z.lazy(() => B) }).partial()

export type A = z.infer<typeof A>
