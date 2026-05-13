import { Type, type Static } from 'typebox'

export const Conditional = Type.Object({ kind: Type.String(), value: Type.Optional(Type.String()) })

export type Conditional = Static<typeof Conditional>
