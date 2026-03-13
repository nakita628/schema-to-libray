import { Type, type Static } from '@sinclair/typebox'

const B = Type.Object({ a: Type.Optional(A) })

export const A = Type.Object({ b: Type.Optional(B) })

export type A = Static<typeof A>
