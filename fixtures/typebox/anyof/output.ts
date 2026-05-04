import { Type, type Static } from 'typebox'

export const StringOrNumber = Type.Union([Type.String(), Type.Number()])

export type StringOrNumber = Static<typeof StringOrNumber>
