import { Type, type Static } from 'typebox'

export const Schema = Type.Object({
  children: Type.Optional(Type.Array(Type.Recursive((_Self) => Schema))),
})

export type Schema = Static<typeof Schema>
