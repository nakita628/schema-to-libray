import * as v from 'valibot'

type UserType = {name: string; address?: AddressType}

type AddressType = {street: string; city: string}

const Address: v.GenericSchema<AddressType> = v.object({street:v.string(),city:v.string()})

export const User: v.GenericSchema<UserType> = v.object({name:v.string(),address:v.optional(v.lazy(() => Address))})

export type UserInput = v.InferInput<typeof User>

export type UserOutput = v.InferOutput<typeof User>
