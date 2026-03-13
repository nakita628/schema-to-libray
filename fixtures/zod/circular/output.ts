import * as z from 'zod'

type AType = { b?: BType }

type BType = { a?: AType }

const B: z.ZodType<BType> = z.object({ a: z.lazy(() => A) }).partial()

export const A: z.ZodType<AType> = z.object({ b: z.lazy(() => B) }).partial()

export type A = z.infer<typeof A>
