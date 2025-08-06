import * as z from 'zod'

type UserType = { address?: AddressType }

type AddressType = { street?: string }

const Address: z.ZodType<AddressType> = z.object({ street: z.string() }).partial()

export const User: z.ZodType<UserType> = z.object({ address: z.lazy(() => Address) }).partial()

export type User = z.infer<typeof User>
