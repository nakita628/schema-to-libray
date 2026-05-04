import { Schema } from 'effect'

type _A = { readonly b?: _B }

type _B = { readonly a?: _A }

const B: Schema.Schema<_B> = Schema.partial(Schema.Struct({ a: Schema.suspend(() => A) }))

export const A: Schema.Schema<_A> = Schema.partial(Schema.Struct({ b: Schema.suspend(() => B) }))

export type AEncoded = typeof A.Encoded
