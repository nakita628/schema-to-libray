import * as z from 'zod'

export const StyleBag = z.object({ style: z.string() }).partial()

export type StyleBag = z.infer<typeof StyleBag>
