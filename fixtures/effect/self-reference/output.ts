import { Schema } from 'effect'

type Schema_Type = { readonly children?: readonly (typeof Schema_.Type)[] }

export const Schema_: Schema.Schema<Schema_Type> = Schema.partial(
  Schema.Struct({ children: Schema.Array(Schema.suspend(() => Schema_)) }),
)

export type Schema_Type_ = typeof Schema_.Type

export type Schema_Encoded = typeof Schema_.Encoded
