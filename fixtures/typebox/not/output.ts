import { Type, type Static } from 'typebox'

export const NotString = Type.Not(Type.String(), { errorMessage: 'Must not be a string' })

export type NotString = Static<typeof NotString>
