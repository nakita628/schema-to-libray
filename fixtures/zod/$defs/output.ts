import * as z from 'zod'

type UserType = { name: string; address?: AddressType }

type AddressType = { street: string; city: string }

const Address: z.ZodType<AddressType> = z.object({ street: z.string(), city: z.string() })

export const User: z.ZodType<UserType> = z.object({
  name: z.string(),
  address: z.lazy(() => Address).optional(),
})

export type User = z.infer<typeof User>
