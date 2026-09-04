import { Schema } from 'effect'

type _A = { readonly b?: _B }

type _B = { readonly a?: _A }

const B: Schema.Codec<_B> = Schema.Struct({ a: Schema.optional(Schema.suspend(() => A)) })

export const A: Schema.Codec<_A> = Schema.Struct({ b: Schema.optional(Schema.suspend(() => B)) })

export type A = typeof A.Type
