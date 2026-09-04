import { Schema } from 'effect'

type _A = { readonly b?: _B }

type _C = string

type _B = { readonly c?: _C }

const C: Schema.Codec<_C> = Schema.String

const B: Schema.Codec<_B> = Schema.Struct({ c: Schema.optional(Schema.suspend(() => C)) })

export const A: Schema.Codec<_A> = Schema.Struct({ b: Schema.optional(Schema.suspend(() => B)) })

export type A = typeof A.Type
