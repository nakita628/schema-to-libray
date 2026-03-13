import { Type, type Static } from '@sinclair/typebox'

export const User = Type.Object({
  name: Type.String(),
  address: Type.Optional(
    Type.Object({ street: Type.String(), city: Type.String(), zip: Type.Optional(Type.String()) }),
  ),
})

export type User = Static<typeof User>
