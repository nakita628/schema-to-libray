import * as v from 'valibot'

export const NotString = v.custom<unknown>((v) => typeof v !== 'string')

export type NotStringOutput = v.InferOutput<typeof NotString>
