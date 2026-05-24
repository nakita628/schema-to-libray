import * as z from 'zod'

export const MaybeString = z.string().default('unknown').nullable()

export type MaybeString = z.infer<typeof MaybeString>
