import { Type, type Static } from 'typebox'

export const Nickname = Type.Union([
  Type.Optional(Type.String(), { default: 'anonymous' }),
  Type.Null(),
])

export type Nickname = Static<typeof Nickname>
