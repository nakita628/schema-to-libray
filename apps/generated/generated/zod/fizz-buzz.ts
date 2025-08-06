import * as z from 'zod'

type AType = {b?: BType}

const CSchema = z.string()

const BSchema = z.object({c:z.lazy(() => C)}).partial()

export const A: z.ZodType<AType> = z.object({b:z.lazy(() => B)}).partial()

export type A = z.infer<typeof A>