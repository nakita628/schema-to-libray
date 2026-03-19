import { Schema } from 'effect'

type AType = { readonly b?: BType }

type CType = string

type BType = { readonly c?: CType }

const C: Schema.Schema<CType> = Schema.String

const B: Schema.Schema<BType> = Schema.partial(Schema.Struct({ c: Schema.suspend(() => C) }))

export const A: Schema.Schema<AType> = Schema.partial(Schema.Struct({ b: Schema.suspend(() => B) }))

export type AEncoded = typeof A.Encoded
