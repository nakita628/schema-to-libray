import * as z from 'zod'

export const PatternBag = z.object({})

export type PatternBag = z.infer<typeof PatternBag>
