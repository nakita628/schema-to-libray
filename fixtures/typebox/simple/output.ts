import { Type, type Static } from '@sinclair/typebox'

export const Schema = Type.Object({ name: Type.String(), age: Type.Optional(Type.Number()) })

export type Schema = Static<typeof Schema>
