import * as z from 'zod'

export const ImageBag = z.object({ image: z.string() }).partial()

export type ImageBag = z.infer<typeof ImageBag>
