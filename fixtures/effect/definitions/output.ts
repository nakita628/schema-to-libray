import { Schema } from 'effect'

type _A = { readonly b?: _B }

type _C = string

type _B = { readonly c?: _C }

const C: Schema.Schema<_C> = Schema.String

const B: Schema.Schema<_B> = Schema.partial(Schema.Struct({ c: Schema.suspend(() => C) }))

export const A: Schema.Schema<_A> = Schema.partial(Schema.Struct({ b: Schema.suspend(() => B) }))

export type AType = typeof A.Type
