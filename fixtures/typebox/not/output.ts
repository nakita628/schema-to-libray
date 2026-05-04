import { Type, type Static } from 'typebox'

export const NotString = Type.Not(Type.String())

export type NotString = Static<typeof NotString>
