import { Schema } from 'effect'

type AType = { readonly b?: BType }

type BType = { readonly a?: AType }

const B: Schema.Schema<BType> = Schema.partial(Schema.Struct({ a: Schema.suspend(() => A) }))

export const A: Schema.Schema<AType> = Schema.partial(Schema.Struct({ b: Schema.suspend(() => B) }))

export type AType_ = typeof A.Type

export type AEncoded = typeof A.Encoded
