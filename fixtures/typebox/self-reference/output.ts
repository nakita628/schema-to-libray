import { Type, type Static } from '@sinclair/typebox'

export const Schema = Type.Object({
  children: Type.Optional(Type.Array(Type.Recursive((Self) => Schema))),
})

export type Schema = Static<typeof Schema>
