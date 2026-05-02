import { Type, type Static } from '@sinclair/typebox'

export const StringOrNumber = Type.Union([Type.String(), Type.Number()])

export type StringOrNumber = Static<typeof StringOrNumber>
