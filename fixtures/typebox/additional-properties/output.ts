import { Type, type Static } from '@sinclair/typebox'

export const Config = Type.Record(Type.String(), Type.String())

export type Config = Static<typeof Config>
