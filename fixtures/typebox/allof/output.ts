import { Type, type Static } from '@sinclair/typebox'

export const Combined = Type.Intersect([
  Type.Object({ name: Type.String() }),
  Type.Object({ age: Type.Number() }),
])

export type Combined = Static<typeof Combined>
