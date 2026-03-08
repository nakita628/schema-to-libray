import { Schema } from "effect"

type UserType = {readonly name: string; readonly address?: AddressType}

type AddressType = {readonly street: string; readonly city: string}

const Address: Schema.Schema<AddressType> = Schema.Struct({street:Schema.String,city:Schema.String})

export const User: Schema.Schema<UserType> = Schema.Struct({name:Schema.String,address:Schema.optional(Schema.suspend(() => Address))})

export type UserType_ = typeof User.Type

export type UserEncoded = typeof User.Encoded
